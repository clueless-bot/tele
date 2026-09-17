import { Share } from 'react-native';

const shortLinkHeaders = {
  Accept: 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

/** Retrieves the current short link stored for an upload. */
export const getUploadShortLink = async (baseUrl: string, uploadId: unknown) => {
  const id = Number(uploadId);
  if (!baseUrl || !Number.isInteger(id) || id <= 0) {
    throw new Error('This content cannot be shared yet.');
  }

  const response = await fetch(`${baseUrl}/shortlink/${id}`, {
    headers: shortLinkHeaders,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data.shortUrl !== 'string' || !data.shortUrl.trim()) {
    throw new Error(data.message || 'A share link is not available for this content.');
  }

  return data.shortUrl.trim();
};

/** Opens the native share sheet with the upload's database-backed short link. */
export const shareUpload = async ({
  baseUrl,
  uploadId,
  title,
}: {
  baseUrl: string;
  uploadId: unknown;
  title?: string;
}) => {
  const shortUrl = await getUploadShortLink(baseUrl, uploadId);
  const label = title?.trim() || 'this content';

  await Share.share({
    message: `Watch ${label} on Teleplay: ${shortUrl}`,
    url: shortUrl,
    title: label,
  });

  return shortUrl;
};
