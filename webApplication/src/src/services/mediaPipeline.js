import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import axios from 'axios';
import ffmpegPath from 'ffmpeg-static';

export const MEDIA_CACHE_ROOT = process.env.MEDIA_CACHE_DIR
  ? path.resolve(process.env.MEDIA_CACHE_DIR)
  : path.join(process.cwd(), 'tmp', 'media-jobs');

const jobs = new Map();
const resolveFfmpegBinary = () => {
  // Prefer an explicit deployment setting, then the host FFmpeg installation.
  // This avoids choosing an optional bundled binary that may not match the
  // host architecture. Use ffmpeg-static only as a final fallback.
  const candidates = [
    process.env.FFMPEG_PATH,
    // Homebrew's default location on Apple Silicon Macs.
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
    ffmpegPath && fs.existsSync(ffmpegPath) ? ffmpegPath : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const check = spawnSync(candidate, ['-version'], { stdio: 'ignore' });
    if (!check.error && check.status === 0) return candidate;
  }

  return null;
};

const ffmpegBinary = resolveFfmpegBinary();
export const getFfmpegBinary = () => ffmpegBinary;
const MEDIA_JOB_TTL_MS = Number(process.env.MEDIA_JOB_TTL_MS || 6 * 60 * 60 * 1000);
const PROBE_TIMEOUT_MS = Number(process.env.MEDIA_PROBE_TIMEOUT_MS || 12000);
const PLAYABLE_CONTENT_TYPES = /^(video|audio)\//i;
const UNSAFE_CONTENT_TYPES = /(?:text\/html|application\/(?:json|xml)|text\/plain)/i;

const privateIpv4 = (address) => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
};

const privateIp = (address) => {
  if (net.isIPv4(address)) return privateIpv4(address);
  if (!net.isIPv6(address)) return true;
  const normalized = address.toLowerCase();
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:');
};

export async function assertPublicMediaUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS media links are supported');
  }
  if (url.username || url.password || url.hostname === 'localhost') {
    throw new Error('Private media URLs are not allowed');
  }

  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
    throw new Error('Private media URLs are not allowed');
  }
  return url.toString();
}

const driveFileId = (value) => {
  const pathMatch = value.match(/\/file\/d\/([^/?#]+)/);
  if (pathMatch?.[1]) return pathMatch[1];
  try {
    return new URL(value).searchParams.get('id');
  } catch {
    return null;
  }
};

export async function resolveProviderMediaUrl(link) {
  const parsed = new URL(link);
  const host = parsed.hostname.toLowerCase();

  if (host.includes('drive.google.com')) {
    const id = driveFileId(link);
    if (!id) throw new Error('Invalid Google Drive link');
    if (process.env.API_KEY) {
      return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(process.env.API_KEY)}`;
    }
    return `https://drive.google.com/uc?id=${encodeURIComponent(id)}&export=download`;
  }

  if (host.includes('dropbox.com')) {
    parsed.hostname = 'dl.dropboxusercontent.com';
    parsed.searchParams.delete('dl');
    return parsed.toString();
  }

  if (host.includes('icedrive')) {
    parsed.searchParams.set('dl', '1');
    return parsed.toString();
  }

  if (host.includes('pcloud')) {
    const code = parsed.searchParams.get('code');
    if (!code) throw new Error('Invalid pCloud link');
    const response = await axios.get(
      `https://api.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}`,
      { timeout: PROBE_TIMEOUT_MS },
    );
    if (response.data?.result !== 0 || !response.data?.hosts?.[0] || !response.data?.path) {
      throw new Error('Unable to resolve pCloud link');
    }
    return `https://${response.data.hosts[0]}${response.data.path}`;
  }

  return parsed.toString();
}

export async function probeRangeCapability(url) {
  await assertPublicMediaUrl(url);
  let response;
  try {
    response = await axios.get(url, {
      headers: {
        Range: 'bytes=0-1',
        'Accept-Encoding': 'identity',
        'User-Agent': 'Teleplay-Media-Probe/1.0',
      },
      responseType: 'stream',
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = String(response.headers['content-type'] || '').split(';')[0].trim();
    const contentRange = String(response.headers['content-range'] || '');
    const finalUrl = response.request?.res?.responseUrl || url;
    const rangeSupported = response.status === 206 && /^bytes 0-1\//i.test(contentRange);
    const mediaType = PLAYABLE_CONTENT_TYPES.test(contentType) && !UNSAFE_CONTENT_TYPES.test(contentType);

    return {
      direct: rangeSupported && mediaType,
      url: finalUrl,
      contentType: contentType || 'application/octet-stream',
      contentLength: Number(contentRange.split('/')[1] || response.headers['content-length'] || 0),
      rangeSupported,
    };
  } finally {
    response?.data?.destroy?.();
  }
}

const publicJobUrls = (jobId, baseUrl) => {
  const root = (process.env.MEDIA_CDN_BASE_URL || baseUrl).replace(/\/$/, '');
  const jobRoot = `${root}/media/jobs/${jobId}`;
  return {
    hlsUrl: `${jobRoot}/master.m3u8`,
    dashUrl: `${jobRoot}/manifest.mpd`,
    statusUrl: `${baseUrl.replace(/\/$/, '')}/media/jobs/${jobId}/status`,
  };
};

const playlistReady = async (directory) => {
  try {
    await fsp.access(path.join(directory, 'manifest.mpd'));
    await fsp.access(path.join(directory, 'master.m3u8'));
    return true;
  } catch {
    return false;
  }
};

async function startPackagingJob(sourceUrl, jobId) {
  const existing = jobs.get(jobId);
  if (existing && ['starting', 'ready'].includes(existing.status)) return existing;

  const directory = path.join(MEDIA_CACHE_ROOT, jobId);
  if (existing?.status === 'error') await fsp.rm(directory, { recursive: true, force: true });
  await fsp.mkdir(directory, { recursive: true });
  if (await playlistReady(directory)) {
    const readyJob = { id: jobId, status: 'ready', directory, updatedAt: Date.now() };
    jobs.set(jobId, readyJob);
    return readyJob;
  }

  if (!ffmpegBinary) {
    const unavailableJob = {
      id: jobId,
      status: 'error',
      directory,
      updatedAt: Date.now(),
      error: 'FFmpeg is required to package this media. Install FFmpeg or set FFMPEG_PATH to its executable path.',
    };
    jobs.set(jobId, unavailableJob);
    return unavailableJob;
  }


  const job = { id: jobId, status: 'starting', directory, updatedAt: Date.now(), error: null };
  jobs.set(jobId, job);

  const output = path.join(directory, 'manifest.mpd');
  const args = [
    '-hide_banner', '-nostdin', '-y', '-loglevel', 'warning',
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
    '-i', sourceUrl,
    '-map', '0:v:0?', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-force_key_frames', 'expr:gte(t,n_forced*4)',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-f', 'dash', '-seg_duration', '4', '-use_template', '1', '-use_timeline', '1',
    '-streaming', '1',
    '-hls_playlist', '1', '-init_seg_name', 'init-$RepresentationID$.m4s',
    '-media_seg_name', 'chunk-$RepresentationID$-$Number%05d$.m4s',
    output,
  ];

  const child = spawn(ffmpegBinary, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  job.process = child;
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8000);
  });

  const readyTimer = setInterval(async () => {
    if (await playlistReady(directory)) {
      job.status = 'ready';
      job.updatedAt = Date.now();
      clearInterval(readyTimer);
    }
  }, 500);

  child.once('error', (error) => {
    clearInterval(readyTimer);
    job.status = 'error';
    job.error = error.message;
    job.updatedAt = Date.now();
  });
  child.once('exit', async (code) => {
    clearInterval(readyTimer);
    job.process = null;
    job.updatedAt = Date.now();
    if (code === 0 && await playlistReady(directory)) job.status = 'ready';
    else if (job.status !== 'ready') {
      job.status = 'error';
      job.error = stderr.trim() || `FFmpeg exited with code ${code}`;
    }
  });

  return job;
}

export async function resolveCloudMedia(link, baseUrl) {
  const providerUrl = await resolveProviderMediaUrl(link);
  const probe = await probeRangeCapability(providerUrl);
  if (probe.direct) return { mode: 'direct', ...probe };

  const jobId = crypto.createHash('sha256').update(probe.url || providerUrl).digest('hex').slice(0, 24);
  const job = await startPackagingJob(probe.url || providerUrl, jobId);
  return {
    mode: 'packaged',
    jobId,
    status: job.status,
    error: job.error || undefined,
    ...publicJobUrls(jobId, baseUrl),
  };
}

export async function getMediaJob(jobId, baseUrl) {
  const job = jobs.get(jobId);
  const directory = path.join(MEDIA_CACHE_ROOT, jobId);
  const status = job?.status || ((await playlistReady(directory)) ? 'ready' : 'missing');
  return {
    jobId,
    status,
    error: job?.error || null,
    ...publicJobUrls(jobId, baseUrl),
  };
}

export async function cleanupExpiredMediaJobs() {
  await fsp.mkdir(MEDIA_CACHE_ROOT, { recursive: true });
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.process || now - job.updatedAt < MEDIA_JOB_TTL_MS) continue;
    jobs.delete(id);
    await fsp.rm(job.directory, { recursive: true, force: true });
  }
}

fs.mkdirSync(MEDIA_CACHE_ROOT, { recursive: true });
const cleanupTimer = setInterval(() => cleanupExpiredMediaJobs().catch(console.error), 30 * 60 * 1000);
cleanupTimer.unref();
