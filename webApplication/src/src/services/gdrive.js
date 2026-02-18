import axios from 'axios';
import process from 'process';

/**
 * Downloads a file from Google Drive and streams it to the response.
 * @param {string} url - The URL of the Google Drive file.
 * @param {object} res - The response object to stream the file to.
 */
export async function downloadFromGoogleDrive(url, res) {
  // Extract file ID from the provided URL
  const fileId = extractFileIdFromUrl(url);

  try {
    // Fetch file metadata from Google Drive API (optional)
    /* const metadata = await axios
      .get(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType&key=${process.env.API_KEY}`); */

    // Fetch file content from Google Drive API and stream it to response
    const response = await axios({
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.API_KEY}`,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(res);

    // Track download progress
    const total_length = response.headers['content-length'];
    let current_length = 0;
    let previous_progress = 0;

    response.data.on('data', (chunk) => {
      current_length += chunk.length;
      let progress = (total_length - current_length) / 1000000;
      progress = progress.toFixed(0);
      if (progress !== previous_progress) {
        console.log(`${progress}mb left`);
      }
      previous_progress = progress;
    });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Extracts file ID from the Google Drive URL.
 * @param {string} url - The URL of the Google Drive file.
 * @returns {string|null} - The extracted file ID or null if the URL is invalid.
 */
function extractFileIdFromUrl(url) {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match && match[1]) {
    return match[1];
  } else {
    console.error('Invalid Google Drive URL');
    return null;
  }
}
