import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, sql } from 'drizzle-orm';
import db, { getDbInstance } from '../src/database/config.js';
import { uploads } from '../src/database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeBaseUrl(value) {
  if (!value) return null;
  return value.replace(/\/+$/, '');
}

function resolveBaseUrl() {
  const candidates = [
    normalizeBaseUrl(process.env.SHORT_LINK_BASE_URL),
    normalizeBaseUrl(process.env.SERVER_URL),
    normalizeBaseUrl(process.env.BASE_URL),
  ];

  for (const url of candidates) {
    if (url) return url;
  }

  console.warn(
    'SHORT_LINK_BASE_URL/ SERVER_URL/ BASE_URL not set. Falling back to localhost.'
  );
  return 'http://localhost:9898';
}

function extractShortCode(value) {
  if (!value) return null;
  let candidate = value.trim();

  try {
    const parsed = new URL(candidate);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length) {
      candidate = segments[segments.length - 1];
    }
  } catch {
    // Not a full URL, fall through
  }

  const parts = candidate.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function generateShortCode(length = 6) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function run() {
  const baseUrl = resolveBaseUrl();
  console.log(`Using base URL: ${baseUrl}`);

  const rows = await db
    .select({
      id: uploads.id,
      outputLink: uploads.output_link,
    })
    .from(uploads);

  let updated = 0;
  for (const row of rows) {
    const code = extractShortCode(row.outputLink) || generateShortCode();
    const newLink = `${baseUrl}/s/${code}`;

    if (row.outputLink !== newLink) {
      await db
        .update(uploads)
        .set({ output_link: newLink })
        .where(eq(uploads.id, row.id));
      updated++;
      console.log(`Updated upload ${row.id} -> ${newLink}`);
    }
  }

  console.log(`Completed. Updated ${updated} records.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});

