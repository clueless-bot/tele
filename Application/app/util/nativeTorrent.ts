import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type TorrentEvent = {
  uri?: string;
  progress?: number;
  downloadSpeed?: number;
  seeds?: number;
  message?: string;
};

type TorrentCallbacks = {
  onStage?: (stage: 'starting' | 'preparing') => void;
  onProgress?: (progress: number, downloadSpeed: number, seeds: number) => void;
  onReady: (uri: string) => void;
  onError: (message: string) => void;
};

const nativeTorrent = NativeModules.TeleplayTorrent;

export const isNativeTorrentAvailable =
  Platform.OS === 'android' && Boolean(nativeTorrent?.start);

export const startNativeTorrent = async (
  magnetUrl: string,
  callbacks: TorrentCallbacks,
) => {
  if (!isNativeTorrentAvailable) {
    throw new Error('Native torrent streaming is unavailable in this build.');
  }

  const emitter = new NativeEventEmitter(nativeTorrent);
  const subscriptions = [
    emitter.addListener('TeleplayTorrentStarted', () => {
      callbacks.onStage?.('starting');
    }),
    emitter.addListener('TeleplayTorrentPrepared', () => {
      callbacks.onStage?.('preparing');
    }),
    emitter.addListener('TeleplayTorrentProgress', (event: TorrentEvent) => {
      callbacks.onProgress?.(
        Math.max(0, Math.min(100, Number(event.progress) || 0)),
        Math.max(0, Number(event.downloadSpeed) || 0),
        Math.max(0, Number(event.seeds) || 0),
      );
    }),
    emitter.addListener('TeleplayTorrentReady', (event: TorrentEvent) => {
      if (event.uri) callbacks.onReady(event.uri);
    }),
    emitter.addListener('TeleplayTorrentError', (event: TorrentEvent) => {
      callbacks.onError(event.message || 'Torrent stream failed.');
    }),
  ];

  try {
    await nativeTorrent.start(magnetUrl);
  } catch (error) {
    subscriptions.forEach((subscription) => subscription.remove());
    throw error;
  }

  return async () => {
    subscriptions.forEach((subscription) => subscription.remove());
    await nativeTorrent.stop().catch(() => undefined);
  };
};
