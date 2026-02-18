import path from 'path';
import process from 'process';
import torrentStream from 'torrent-stream';
import TorrentSearchApi from 'torrent-search-api';

/**
 * Filters out audiobooks from a list of torrents.
 * @param {Array} torrents - List of torrents to filter.
 * @returns {Promise<Array>} - Filtered list of torrents.
 */
export async function filterAudiobooks(torrents) {
  const promises = torrents.map(
    async (torrent) => await checkIfAudible(torrent.magnet),
  );

  try {
    const result = await Promise.all(promises);
    return result;
  } catch (error) {
    console.error('Error while filtering audiobooks:', error);
  }
}

/**
 * Checks if a torrent contains audio files.
 * @param {object} torrent - The torrent object.
 * @returns {Promise<object>} - Promise resolving to the torrent object if it contains audio files.
 */
export async function checkIfAudible(torrent) {
  return new Promise((resolve, reject) => {
    let audible = false;

    try {
      const engine = torrentStream(torrent.magnet, {
        tmp: path.join(process.cwd(), '/tmp'),
        path: path.join(process.cwd(), '/tmp'),
      });

      engine.on('ready', function () {
        engine.files.forEach(function (file) {
          const extensions = [
            '.mp3',
            '.aac',
            '.mpeg',
            '.wav',
            '.m4a',
            '.flac',
            '.wma',
          ];

          extensions.forEach((ext) => {
            if (file.name.includes(ext)) {
              audible = true;
            }
          });
        });

        engine.destroy(() => { });
        if (audible) resolve(torrent);
      });
    } catch (error) {
      console.log('Failed to get metadata: ', error);
      reject(error);
    }
  });
}

/**
 * Searches for torrents using the specified provider and adds them to the given array.
 * @param {string} query - The search query.
 * @param {string} provider - The name of the torrent provider to search from.
 * @param {Array} trs - Array to store found torrents.
 */

/**
 * if it says that the IP is blocked, then that means IP is blocked on any one provider
 * and fetch the data from other torrent providers
 * 
 * if the IP is blocked on every site, then it supposedly change the IP address and search the torrents using other IP address
 * 
 * if any error occured during the process, it will rotate or change the IP address and start fetching from that IP
 * 
 * case:
 * if one IP is blocked on a particular provider then it will search for the data using other providers and later rotate the IP 
 * address and search for the data using the provider on which the previous IP was blocked  
 */

import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, 'working_IP.json');
const proxies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
let currentProxyIndex = 0;

function rotateProxy() {
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
}

export async function searchForTorrents(query, provider, trs) {
  try {
    const proxy = proxies[currentProxyIndex]
    // TorrentSearchApi.enableProvider(provider, { ipAddress: proxy.ip, port: proxy.port });
    TorrentSearchApi.enableProvider(provider, proxy);

    if (trs.length < 3) {
      const torrents = await TorrentSearchApi.search(query, '', 3);
      // console.log(torrents);
      torrents.forEach((torrent) => {
        if ('magnet' in torrent)
          if (torrent.numFiles !== 0 && torrent.id !== 0) {
            // torrent['provider'] = 'public providers';
            torrent['provider'] = provider;
            // trs.push(
            //   {
            //     ip: proxy.ip,
            //     port: proxy.port,
            //     provider: provider,
            //     link: torrent.magnet
            //   }
            // )
            trs.push(torrent);
          }
      });
    }
    // console.log(`Found torrents using proxy IP: ${proxy.ip}:${proxy.port} on provider ${provider}`);
    // console.log(`Torrents found:`, trs);
  } catch (error) {
    console.error(`Error searching torrents from ${provider}. IP ${proxies[currentProxyIndex].ip} may be blocked`,)

    rotateProxy();
    // move to next proxy if error
    await searchForTorrents(query, provider, trs)
  } finally {
    TorrentSearchApi.disableProvider(provider);
  }
}
