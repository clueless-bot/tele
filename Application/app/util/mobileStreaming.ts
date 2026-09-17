type PlayerParams = {
  videoUrl?: string;
  cloudUrl?: string;
  torrentUrl?: string;
  shortUrl?: string;
  title?: string;
  description?: string;
  language?: string;
  format?: string;
  uploadId?: string | number;
  channelId?: string | number;
  channelName?: string;
  channelAvatar?: string;
  returnTo?: string;
  thumbnail?: string;
};

export const isMagnetLink = (value = '') => value.trim().toLowerCase().startsWith('magnet:?');

export const isTeleplayShortLink = (value = '') => /\/s\/[^/?#]+/.test(value) || /\/short\/[^/?#]+/.test(value);

const isHttpUrl = (value = '') => /^https?:\/\//i.test(value.trim());

const encodeParams = (params: PlayerParams) => ({
  ...(params.videoUrl ? { videoUrl: encodeURIComponent(params.videoUrl) } : {}),
  ...(params.cloudUrl ? { cloudUrl: encodeURIComponent(params.cloudUrl) } : {}),
  ...(params.torrentUrl ? { torrentUrl: encodeURIComponent(params.torrentUrl) } : {}),
  ...(params.shortUrl ? { shortUrl: encodeURIComponent(params.shortUrl) } : {}),
  title: encodeURIComponent(params.title || 'Teleplay Content'),
  description: encodeURIComponent(params.description || ''),
  language: encodeURIComponent(params.language || ''),
  format: encodeURIComponent(params.format || ''),
  ...(params.uploadId ? { uploadId: String(params.uploadId) } : {}),
  ...(params.channelId ? { channelId: String(params.channelId) } : {}),
  ...(params.channelName ? { channelName: encodeURIComponent(params.channelName) } : {}),
  ...(params.channelAvatar ? { channelAvatar: encodeURIComponent(params.channelAvatar) } : {}),
  ...(params.returnTo ? { returnTo: encodeURIComponent(params.returnTo) } : {}),
  // Base64 thumbnails can exceed Android navigation/intent size limits. The
  // history helper stores those locally before navigation when available.
  ...(params.thumbnail && !params.thumbnail.startsWith('data:') ? { thumbnail: encodeURIComponent(params.thumbnail) } : {}),
});

const getFirstValue = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const getDriveFileId = (link: string) => {
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  try {
    return new URL(link).searchParams.get('id') || '';
  } catch {
    return '';
  }
};

export const toMobileDirectStreamUrl = async (link: string) => {
  const trimmed = link.trim();
  if (!isHttpUrl(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('drive.google.com')) {
      const fileId = getDriveFileId(trimmed);
      return fileId ? `https://drive.google.com/uc?id=${fileId}&export=download` : trimmed;
    }

    if (host.includes('dropbox.com')) {
      parsed.hostname = 'dl.dropboxusercontent.com';
      parsed.searchParams.set('dl', '1');
      return parsed.toString();
    }

    if (host.includes('icedrive')) {
      parsed.searchParams.set('dl', '1');
      return parsed.toString();
    }

    if (host.includes('pcloud')) {
      const code = parsed.searchParams.get('code');
      if (!code) return trimmed;

      const response = await fetch(`https://api.pcloud.com/getpublinkdownload?code=${encodeURIComponent(code)}`);
      if (!response.ok) return trimmed;

      const data = await response.json();
      if (data?.result !== 0 || !data?.hosts?.[0] || !data?.path) return trimmed;
      return `https://${data.hosts[0]}${data.path}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

type MediaResolution = {
  mode: 'direct' | 'packaged';
  url?: string;
  hlsUrl?: string;
  dashUrl?: string;
  statusUrl?: string;
  status?: 'starting' | 'ready' | 'error';
  error?: string;
};

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForPackagedMedia = async (initial: MediaResolution) => {
  if (!initial.statusUrl) throw new Error('The media server did not return a job status URL.');
  let current = initial;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (current.status === 'ready' && (current.hlsUrl || current.dashUrl)) {
      return (current.hlsUrl || current.dashUrl) as string;
    }
    if (current.status === 'error') throw new Error(current.error || 'Media conversion failed.');

    await delay(1000);
    const response = await fetch(initial.statusUrl, {
      headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
    });
    if (!response.ok) throw new Error(`Media preparation failed (HTTP ${response.status}).`);
    current = await response.json();
  }

  throw new Error('Media preparation timed out.');
};

export const resolveMobileCloudStream = async (link: string, baseUrl: string, forceServer = false) => {
  const directUrl = await toMobileDirectStreamUrl(link);
  // Opening the provider URL immediately is considerably faster than a
  // JavaScript range probe. Media3 already performs the same capability check
  // as part of opening the source, without making the user wait for it first.
  // If that fails, VideoPlayerPage retries this function with forceServer set
  // and falls back to the server packaging pipeline below.
  if (!forceServer) return directUrl;

  const response = await fetch(`${baseUrl}/media/resolve`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ link }),
  });
  const result = await response.json().catch(() => ({})) as MediaResolution;
  if (!response.ok) throw new Error(result.error || `Media resolution failed (HTTP ${response.status}).`);
  if (result.mode === 'direct' && result.url) return result.url;
  return waitForPackagedMedia(result);
};

export const resolveServerStreamUrl = async (link: string, baseUrl: string) => {
  const response = await fetch(`${baseUrl}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ link }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return `${baseUrl}/stream?link=${encodeURIComponent(link)}`;
  }

  const data = await response.json();
  if (Array.isArray(data.streamLinks) && data.streamLinks.length) return data.streamLinks[0].streamUrl;
  if (data.url) return data.url;

  throw new Error('No stream URL returned');
};

export const openMobilePlayer = async (router: any, item: any, baseUrl: string, returnTo = '/') => {
  const shortLink = getFirstValue(item?.output_link, item?.outputLink, item?.shortUrl, item?.short_link);
  const sourceLink = getFirstValue(item?.magnetLink, item?.input_link, item?.inputLink, item?.link);
  const title = item?.title || 'Teleplay Content';
  const description = item?.description || '';
  const language = item?.language || '';
  const format = item?.format || item?.mime_type || item?.mimeType || '';
  const uploadId = item?.id ?? item?.upload_id ?? item?.uploadId;
  const channelId = item?.channel_id ?? item?.channelId ?? item?.admin_id;
  const channelName = getFirstValue(item?.channel_name, item?.channelName, item?.channel_username, item?.channelUsername);
  const channelAvatar = getFirstValue(item?.channel_avatar, item?.channelAvatar, item?.profile_image, item?.avatar);
  const thumbnail = item?.thumbnail ?? item?.thumbnailUrl ?? item?.thumbnail_url ?? item?.cover ?? item?.image;

  if (sourceLink && !isTeleplayShortLink(sourceLink)) {
    if (isMagnetLink(sourceLink)) {
      router.push({
        pathname: '/videoplay/VideoPlayerPage',
        params: encodeParams({ torrentUrl: sourceLink, title, description, language, format, uploadId, channelId, channelName, channelAvatar, thumbnail, returnTo }),
      });
      return;
    }

    router.push({
      pathname: '/videoplay/VideoPlayerPage',
      params: encodeParams({ cloudUrl: sourceLink, title, description, language, format, uploadId, channelId, channelName, channelAvatar, thumbnail, returnTo }),
    });
    return;
  }

  if (shortLink && isTeleplayShortLink(shortLink)) {
    router.push({
      pathname: '/videoplay/VideoPlayerPage',
      params: encodeParams({ shortUrl: shortLink, title, description, language, format, uploadId, channelId, channelName, channelAvatar, thumbnail, returnTo }),
    });
    return;
  }

  const fallbackLink = sourceLink || shortLink;
  if (!fallbackLink) throw new Error('No link available for this content.');

  const videoUrl = await resolveServerStreamUrl(fallbackLink, baseUrl);

  router.push({
    pathname: '/videoplay/VideoPlayerPage',
    params: encodeParams({ videoUrl, title, description, language, format, uploadId, channelId, channelName, channelAvatar, thumbnail, returnTo }),
  });
};
