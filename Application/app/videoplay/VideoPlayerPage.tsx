import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Video from 'react-native-video';
import { Download, Minimize2, Send } from 'lucide-react-native';
import VideoScreen from './VideoScreen';
import useVideoDownload from '@/hooks/useDownloadVideo';
import { isMagnetLink, isTeleplayShortLink, openMobilePlayer, resolveMobileCloudStream, resolveServerStreamUrl } from '../util/mobileStreaming';
import { isNativeTorrentAvailable, startNativeTorrent } from '../util/nativeTorrent';
import { shareUpload } from '../util/share';
import { useToast } from '../../components/ToastProvider';
import { addToHistory } from '../util/history';
// Android permissions are handled inside useVideoDownload hook

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function VideoPlayerPage() {
  const router = useRouter();
  const showToast = useToast();
  const safeAreaInsets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const safeDecode = (value: unknown) => {
    if (typeof value !== 'string') return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const videoUrl = safeDecode(params.videoUrl);
  const initialCloudUrl = safeDecode(params.cloudUrl);
  const initialTorrentUrl = safeDecode(params.torrentUrl);
  const shortUrl = safeDecode(params.shortUrl);
  const initialTitle = safeDecode(params.title) || 'Untitled';
  const initialDescription =
    safeDecode(params.description) || 'No description available.';
  const initialLanguage = safeDecode(params.language) || 'Unknown';
  const initialFormat = safeDecode(params.format) || 'N/A';
  const initialUploadId = Number(safeDecode(params.uploadId));
  const initialChannelId = Number(safeDecode(params.channelId));
  const initialChannelName = safeDecode(params.channelName);
  const initialChannelAvatar = safeDecode(params.channelAvatar);
  const initialThumbnail = safeDecode(params.thumbnail);
  const returnTo = safeDecode(params.returnTo) || '/';

  const [resolvedUrl, setResolvedUrl] = useState(videoUrl);
  const [torrentUrl, setTorrentUrl] = useState(initialTorrentUrl);
  const [cloudUrl, setCloudUrl] = useState(initialCloudUrl);
  const [torrentProgress, setTorrentProgress] = useState(0);
  const [torrentDownloadSpeed, setTorrentDownloadSpeed] = useState(0);
  const [torrentSeeds, setTorrentSeeds] = useState(0);
  const [torrentStage, setTorrentStage] = useState<'metadata' | 'starting' | 'preparing' | 'server'>('metadata');
  const [torrentAttempt, setTorrentAttempt] = useState(0);
  const [cloudAttempt, setCloudAttempt] = useState(0);
  const [cloudForceServer, setCloudForceServer] = useState(false);
  const [loading, setLoading] = useState(Boolean((shortUrl || initialTorrentUrl || initialCloudUrl) && !videoUrl));
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [metaTitle, setMetaTitle] = useState(initialTitle);
  const [metaDescription, setMetaDescription] = useState(initialDescription);
  const [metaLanguage, setMetaLanguage] = useState(initialLanguage);
  const [metaFormat, setMetaFormat] = useState(initialFormat);
  const [metaThumbnail, setMetaThumbnail] = useState(initialThumbnail);
  const [uploadId, setUploadId] = useState<number | null>(
    Number.isInteger(initialUploadId) && initialUploadId > 0 ? initialUploadId : null,
  );
  const [channelId, setChannelId] = useState<number | null>(Number.isInteger(initialChannelId) && initialChannelId > 0 ? initialChannelId : null);
  const [channelName, setChannelName] = useState(initialChannelName);
  const [channelUsername, setChannelUsername] = useState('');
  const [channelAvatar, setChannelAvatar] = useState(initialChannelAvatar);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const reportedViewForUpload = useRef<number | null>(null);
  const recordedHistoryRef = useRef(false);
  const torrentSourceRef = useRef(initialTorrentUrl);
  const serverTorrentFallbackRef = useRef(false);
  const pauseCurrentVideoRef = useRef<(() => void) | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    downloadVideo,
    cancelDownload,
    isDownloading,
    downloadProgress,
  } = useVideoDownload(resolvedUrl, metaTitle);

  const downloadRef = useRef<any>(null);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const videoWidth = screenWidth;

  useEffect(() => {
    let mounted = true;
    const isLandscape = (orientation: ScreenOrientation.Orientation) => (
      orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
      || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
    );
    const updateFullscreen = (orientation: ScreenOrientation.Orientation) => {
      if (mounted) setIsFullscreen(isLandscape(orientation));
    };

    // Let the operating system follow the physical device orientation. The
    // player becomes immersive only while the phone is actually landscape.
    void ScreenOrientation.unlockAsync().then(() =>
      ScreenOrientation.getOrientationAsync().then(updateFullscreen),
    );
    const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      updateFullscreen(orientationInfo.orientation);
    });

    return () => {
      mounted = false;
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cancelled = false;
    const updateNavigationBar = async () => {
      if (isFullscreen) {
        // Allow Android's navigation controls to be revealed temporarily with
        // an edge swipe without reserving landscape space for the bar.
        await NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => undefined);
        if (!cancelled) {
          await NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
        }
        return;
      }

      await NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
    };

    void updateNavigationBar();
    return () => {
      cancelled = true;
      // Restore system navigation when the player closes while landscape is
      // active. The portrait effect also performs this restoration on rotate.
      if (isFullscreen) {
        void NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
      }
    };
  }, [isFullscreen]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        // Do not fall through to Android's activity back stack. A video
        // opened from a deep link has no native previous activity to return to.
        router.replace(returnTo as '/');
        return true;
      });
      return () => subscription.remove();
    }, [returnTo, router]),
  );

  const extractShortCode = (value: string) => {
    if (!value) return '';
    try {
      const parsed = new URL(value);
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      const match = value.match(/\/s\/([^/?#]+)/);
      return match?.[1] || '';
    }
  };

  const fetchMetadataFromShort = useCallback(async () => {
    if (!shortUrl || !extra?.BASE_URL) return;
    const code = extractShortCode(shortUrl);
    if (!code) return;

    try {
      const resp = await fetch(`${extra.BASE_URL}/s/${code}?json=1`, {
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!resp.ok) return;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await resp.json();

      if (Number.isInteger(Number(data?.uploadId))) setUploadId(Number(data.uploadId));
      if (Number.isInteger(Number(data?.channelId ?? data?.admin_id))) setChannelId(Number(data.channelId ?? data.admin_id));

      if (data?.title && metaTitle === initialTitle) setMetaTitle(data.title);
      if (data?.description && metaDescription === initialDescription) setMetaDescription(data.description);
      if (data?.language && metaLanguage === initialLanguage) setMetaLanguage(data.language);
      if (typeof data?.thumbnail === 'string' && data.thumbnail) setMetaThumbnail(data.thumbnail);
    } catch (e) {
      // ignore metadata fetch failures; streaming can still work
    }
  }, [shortUrl, metaTitle, metaDescription, metaLanguage, initialTitle, initialDescription, initialLanguage]);

  useEffect(() => {
    if (!channelId || !extra?.BASE_URL) return;
    let active = true;
    Promise.all([SecureStore.getItemAsync('userId'), SecureStore.getItemAsync('userToken')]).then(async ([userId, token]) => {
      if (!userId || !token) return;
      const response = await fetch(`${extra.BASE_URL}/channel/${channelId}/isSubscribed?userId=${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (active && response.ok) setIsSubscribed(result.subscribed === true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [channelId]);

  useEffect(() => {
    if (!channelId || !extra?.BASE_URL) return;
    let active = true;
    fetch(`${extra.BASE_URL}/channel/${channelId}`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((channel) => {
        if (!active) return;
        if (!channelName && typeof channel?.name === 'string') setChannelName(channel.name);
        if (typeof channel?.username === 'string') setChannelUsername(channel.username);
        if (!channelAvatar && typeof (channel?.avatar ?? channel?.profile_image) === 'string') setChannelAvatar(channel.avatar ?? channel.profile_image);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [channelAvatar, channelId, channelName]);

  const handleSubscribe = async () => {
    if (!channelId || subscriptionPending) return;
    setSubscriptionPending(true);
    try {
      const [userId, token] = await Promise.all([SecureStore.getItemAsync('userId'), SecureStore.getItemAsync('userToken')]);
      if (!userId || !token) throw new Error('Please sign in to subscribe to this channel.');
      const response = await fetch(`${extra.BASE_URL}/channel/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: Number(userId), channelId }),
      });
      if (!response.ok && response.status !== 409) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Could not subscribe to this channel.');
      }
      setIsSubscribed(true);
      showToast(response.status === 409 ? 'You are already subscribed to this channel.' : 'Subscribed successfully.');
    } catch (error: any) {
      showToast(error.message || 'Could not subscribe. Please try again.', 'error');
    } finally {
      setSubscriptionPending(false);
    }
  };

  const recordView = useCallback(() => {
    if (!uploadId || !extra?.BASE_URL || reportedViewForUpload.current === uploadId) return false;
    reportedViewForUpload.current = uploadId;
    fetch(`${extra.BASE_URL}/uploads/${uploadId}/view`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    }).catch(() => {
      reportedViewForUpload.current = null;
    });
    return true;
  }, [uploadId]);

  const recordPlaybackStart = useCallback(() => {
    if (!recordedHistoryRef.current) {
      recordedHistoryRef.current = true;
      void addToHistory({
        id: uploadId ?? undefined,
        upload_id: uploadId ?? undefined,
        title: metaTitle,
        description: metaDescription,
        language: metaLanguage,
        thumbnail: metaThumbnail || undefined,
        input_link: initialTorrentUrl || initialCloudUrl || videoUrl || undefined,
        output_link: shortUrl || undefined,
        channel_id: channelId ?? undefined,
      });
    }
    recordView();
    return true;
  }, [channelId, initialCloudUrl, initialTorrentUrl, metaDescription, metaLanguage, metaThumbnail, metaTitle, recordView, shortUrl, uploadId, videoUrl]);

  const setPauseHandle = useCallback((pause: () => void) => {
    pauseCurrentVideoRef.current = pause;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      // Do not unlock immediately: while the device is still sideways Android
      // rotates straight back to landscape, making the minimise control appear
      // to do nothing. Keep portrait until this player route is left.
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      return;
    }
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, [isFullscreen]);

  const handleFullscreenToggle = useCallback(() => {
    // Keep the same player session running while the view rotates. Pausing
    // here made entering landscape interrupt otherwise continuous playback.
    void toggleFullscreen();
  }, [toggleFullscreen]);

  const handleShare = async () => {
    try {
      await shareUpload({ baseUrl: extra.BASE_URL, uploadId, title: metaTitle });
      showToast('Share sheet opened.', 'info');
    } catch (err: any) {
      console.error('[VideoPlayer] share failed', err);
      showToast(err.message || 'Unable to open the share sheet. Please try again.', 'error');
    }
  };

  const fetchStreamFromShort = useCallback(async () => {
    if (!shortUrl || !extra?.BASE_URL) return;
    let delegatedToSourcePipeline = false;
    setLoading(true);
    setError(null);
    try {
      const code = extractShortCode(shortUrl);
      if (code) {
        const metadataResp = await fetch(`${extra.BASE_URL}/s/${code}?json=1`, {
          headers: {
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (metadataResp.ok) {
          const metadataType = metadataResp.headers.get('content-type') || '';
          if (metadataType.includes('application/json')) {
            const metadata = await metadataResp.json();
            if (Number.isInteger(Number(metadata?.uploadId))) setUploadId(Number(metadata.uploadId));
            if (Number.isInteger(Number(metadata?.channelId ?? metadata?.admin_id))) setChannelId(Number(metadata.channelId ?? metadata.admin_id));
            if (typeof metadata?.thumbnail === 'string' && metadata.thumbnail) setMetaThumbnail(metadata.thumbnail);
            const originalLink = typeof metadata?.inputLink === 'string' ? metadata.inputLink.trim() : '';
            const originalIsMagnet = isMagnetLink(originalLink);
            if (originalIsMagnet) {
              delegatedToSourcePipeline = true;
              torrentSourceRef.current = originalLink;
              setTorrentUrl(originalLink);
              return;
            }

            if (originalLink && !isTeleplayShortLink(originalLink)) {
              delegatedToSourcePipeline = true;
              setCloudUrl(originalLink);
              return;
            }
          }
        }
      }

      const resp = await fetch(`${extra.BASE_URL}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ link: shortUrl }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const directUrl = `${extra.BASE_URL}/stream?link=${encodeURIComponent(shortUrl)}`;
        setResolvedUrl(directUrl);
        return;
      }

      const data = await resp.json();
      let nextUrl = '';
      if (Array.isArray(data.streamLinks) && data.streamLinks.length) {
        nextUrl = data.streamLinks[0].streamUrl;
      } else if (data.url) {
        nextUrl = data.url;
      }
      if (!nextUrl) throw new Error('No stream URL returned');
      setResolvedUrl(nextUrl);
    } catch (err: any) {
      console.error('[VideoPlayer] resolve short link failed', err);
      setError('Unable to load video. Please try again.');
    } finally {
      if (!delegatedToSourcePipeline) setLoading(false);
    }
  }, [shortUrl]);

  useEffect(() => {
    if (!torrentUrl) return;

    let stopTorrent: (() => Promise<void>) | undefined;
    let cancelled = false;
    let stallTimer: ReturnType<typeof setTimeout>;

    if (!isNativeTorrentAvailable) {
      setLoading(false);
      setError('On-device torrent streaming requires an Android build of Teleplay; it is not available in Expo Go or on iOS.');
      return;
    }

    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (cancelled) return;
        stopTorrent?.();
        setLoading(false);
        setError('Unable to find torrent peers. Check your connection and try again.');
      // No backend relay is used. Give DHT and tracker discovery enough time
      // on a mobile connection before presenting a retry action.
      }, 60000);
    };

    setLoading(true);
    setError(null);
    setResolvedUrl('');
    setTorrentProgress(0);
    setTorrentDownloadSpeed(0);
    setTorrentSeeds(0);
    setTorrentStage('metadata');
    armStallTimer();

    startNativeTorrent(torrentUrl, {
      onStage: (stage) => {
        setTorrentStage(stage);
        armStallTimer();
      },
      onProgress: (progress, downloadSpeed, seeds) => {
        setTorrentProgress(progress);
        setTorrentDownloadSpeed(downloadSpeed);
        setTorrentSeeds(seeds);
        armStallTimer();
      },
      onReady: (uri) => {
        if (cancelled) return;
        clearTimeout(stallTimer);
        setResolvedUrl(uri);
        setLoading(false);
      },
      onError: (message) => {
        if (cancelled) return;
        clearTimeout(stallTimer);
        stopTorrent?.();
        setLoading(false);
        setError(message || 'This device could not stream the torrent.');
      },
    })
      .then((stop) => {
        if (cancelled) stop();
        else stopTorrent = stop;
      })
      .catch((err: Error) => {
        if (cancelled) return;
        clearTimeout(stallTimer);
        setLoading(false);
        setError(err.message || 'Unable to start on-device torrent streaming.');
      });

    return () => {
      cancelled = true;
      clearTimeout(stallTimer);
      stopTorrent?.();
    };
  }, [torrentUrl, torrentAttempt]);

  const transcodeTorrentOnServer = useCallback(async () => {
    if (serverTorrentFallbackRef.current) return;
    const sourceLink = torrentSourceRef.current || torrentUrl;
    if (!sourceLink || !extra?.BASE_URL) {
      setError('A server fallback is not configured for this torrent.');
      return;
    }

    serverTorrentFallbackRef.current = true;
    setLoading(true);
    setError(null);
    setTorrentStage('server');
    try {
      const directUrl = await resolveServerStreamUrl(sourceLink, extra.BASE_URL);
      const parsed = new URL(directUrl);
      if (!/^\/stream\/torrent\/[^/]+\/\d+$/.test(parsed.pathname)) {
        throw new Error('The server cannot transcode this torrent stream.');
      }
      parsed.pathname = `${parsed.pathname}/transcode`;
      setResolvedUrl(parsed.toString());
      // This also tears down the native peer session via the torrent effect's
      // cleanup, so only the server handles the incompatible media now.
      setTorrentUrl('');
    } catch (error: any) {
      serverTorrentFallbackRef.current = false;
      setError(error.message || 'Unable to prepare a compatible server stream.');
    } finally {
      setLoading(false);
    }
  }, [torrentUrl]);

  useEffect(() => {
    if (!cloudUrl || !extra?.BASE_URL) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveMobileCloudStream(cloudUrl, extra.BASE_URL, cloudForceServer)
      .then((uri) => {
        if (cancelled) return;
        setResolvedUrl(uri);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Unable to prepare cloud media.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudUrl, cloudAttempt, cloudForceServer]);

  useEffect(() => {
    if (shortUrl) {
      fetchMetadataFromShort();
      fetchStreamFromShort();
    }
  }, [shortUrl, fetchStreamFromShort, fetchMetadataFromShort]);

  useEffect(() => {
    if (!extra?.BASE_URL) return;
    let active = true;
    fetch(`${extra.BASE_URL.replace(/\/+$/, '')}/discover/uploads`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
      .then(({ response, data }) => {
        if (!active || !response.ok || !data?.success || !Array.isArray(data.data)) return;
        setSuggestions(data.data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const activeVideoUrl = resolvedUrl || videoUrl;
  const canDownloadActiveMedia = Boolean(activeVideoUrl) && !loading && !error;
  const isAudio = /(?:audio\/|\.(?:mp2|mp3|m4a|aac|ogg|oga|wav|flac|opus|amr|aif|aiff|alac|ape|wma)(?:$|[?#]))/i.test(
    `${activeVideoUrl} ${metaFormat} ${metaTitle}`,
  );
  const torrentSpeedLabel = torrentDownloadSpeed > 0
    ? `${(torrentDownloadSpeed / 1024 / 1024).toFixed(1)} MB/s`
    : '';
  const torrentStageLabel = torrentStage === 'metadata'
    ? 'Finding torrent metadata'
    : torrentStage === 'starting'
      ? 'Connecting to peers'
      : torrentStage === 'server'
        ? 'Preparing compatible stream on server'
      : 'Preparing media';
  const currentVideoId = (uploadId ?? Number(initialUploadId)) || null;
  const trendingSuggestions = suggestions
    .filter((video) => Number(video.id ?? video.upload_id) !== currentVideoId)
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 12);
  const formatViews = (views: unknown) => {
    const value = Number(views || 0);
    if (!Number.isFinite(value)) return '0 views';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M views`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K views`;
    return `${value} views`;
  };
  const suggestionThumbnail = (thumbnail: unknown) => {
    if (typeof thumbnail !== 'string' || !thumbnail.trim()) return 'https://placehold.co/320x180/1c1c1c/ffffff?text=Teleplay';
    const value = thumbnail.trim();
    if (value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
    const baseUrl = (extra?.BASE_URL || '').replace(/\/+$/, '');
    return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  };
  const channelAvatarUri = suggestionThumbnail(channelAvatar);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isFullscreen ? '#000' : '#111' }}
      edges={isFullscreen ? [] : undefined}
    >
      <StatusBar hidden={isFullscreen} />
      <ScrollView
        style={styles.container}
        scrollEnabled={!isFullscreen}
        contentContainerStyle={[
          styles.scrollContent,
          isFullscreen && styles.fullscreenScrollContent,
        ]}
      >
        {/* Video Player with Native Controls */}
        <View style={[
          styles.videoWrapper,
          isAudio && styles.audioWrapper,
          isFullscreen && styles.fullscreenVideoWrapper,
          {
            // The fullscreen view owns the available landscape width. Using a
            // percentage here avoids overflowing the visible area on devices
            // with landscape safe-area insets.
            width: isFullscreen ? '100%' : videoWidth,
            height: isFullscreen ? screenHeight : undefined,
          },
        ]}>
          {error ? (
            <View style={styles.loaderBox}>
              <Text style={{ color: '#ff6b6b' }}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  if (serverTorrentFallbackRef.current) {
                    serverTorrentFallbackRef.current = false;
                    void transcodeTorrentOnServer();
                  }
                  else if (torrentUrl) setTorrentAttempt((attempt) => attempt + 1);
                  else if (cloudUrl) setCloudAttempt((attempt) => attempt + 1);
                  else fetchStreamFromShort();
                }}
              >
                <Text style={{ color: '#fff' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : loading || !activeVideoUrl ? (
            <View style={styles.loaderBox}>
              {loading && <ActivityIndicator size="large" color="#ffffff" />}
              <Text style={{ color: '#fff' }}>
                {loading
                  ? torrentUrl
                    ? `${torrentStageLabel}... ${Math.round(torrentProgress)}%${torrentSpeedLabel ? ` | ${torrentSpeedLabel}` : ''}${torrentSeeds ? ` | ${torrentSeeds} seeds` : ''}`
                    : 'Preparing stream...'
                  : 'No video available'}
              </Text>
            </View>
          ) : (
            <VideoScreen
              videoSource={activeVideoUrl}
              audioOnly={isAudio}
              title={metaTitle}
              onPlaybackError={cloudUrl && !cloudForceServer ? () => {
                setResolvedUrl('');
                setCloudForceServer(true);
              } : serverTorrentFallbackRef.current ? () => {
                setError('The server could not create a compatible H.264 stream for this torrent.');
              } : torrentUrl ? () => {
                void transcodeTorrentOnServer();
              } : undefined}
              onPlaybackStarted={recordPlaybackStart}
              onPauseHandleReady={setPauseHandle}
              onFullscreenToggle={handleFullscreenToggle}
              isFullscreen={isFullscreen}
            />
          )}
          {isFullscreen && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Minimize player"
              accessibilityHint="Returns the video player to portrait mode"
              activeOpacity={0.78}
              hitSlop={8}
              onPress={handleFullscreenToggle}
              style={[
                styles.fullscreenMinimizeButton,
                {
                  top: Math.max(8, safeAreaInsets.top + 8),
                  right: Math.max(10, safeAreaInsets.right + 10),
                },
              ]}
            >
              <Minimize2 size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.fullscreenMinimizeText}>Minimize</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={titleExpanded ? undefined : 2}>{metaTitle}</Text>
            {metaTitle.length > 90 && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setTitleExpanded((value) => !value)}>
                <Text style={styles.readMore}>{titleExpanded ? 'Show less' : 'More'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inlineActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Download video" disabled={!canDownloadActiveMedia || isDownloading} onPress={() => { if (canDownloadActiveMedia) downloadVideo(); }} style={[styles.roundAction, (!canDownloadActiveMedia || isDownloading) && styles.roundActionDisabled]}>
              <Download size={25} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Share ${metaTitle}`} disabled={!uploadId} onPress={handleShare} style={[styles.roundAction, !uploadId && styles.roundActionDisabled]}>
              <Send size={24} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
          {expanded && <View style={styles.metadataBlock}>
            <Text style={styles.description}>{metaDescription}</Text>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Language</Text><Text style={styles.metaValue} numberOfLines={1}>{metaLanguage}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaLabel}>Format</Text><Text style={styles.metaValue} numberOfLines={1}>{metaFormat}</Text></View>
          </View>}
          {metaDescription.length > 180 && <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded((value) => !value)}><Text style={styles.readMore}>{expanded ? 'Show less' : 'More details'}</Text></TouchableOpacity>}
          <View style={styles.channelRow}>
            <Image source={{ uri: channelAvatarUri }} style={styles.channelAvatar} />
            <View style={styles.channelIdentity}>
              <Text style={styles.channelTitle} numberOfLines={1}>{channelName || 'Teleplay'}</Text>
              <Text style={styles.channelHandle} numberOfLines={1}>@{channelUsername || channelName?.replace(/\s+/g, '').toLowerCase() || 'teleplay'}</Text>
            </View>
            {channelId &&
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isSubscribed ? 'Subscribed to channel' : 'Subscribe to channel'}
              disabled={isSubscribed || subscriptionPending}
              onPress={handleSubscribe}
              style={[styles.subscribeButton, isSubscribed && styles.subscribedButton]}
            >
              <Text style={styles.subscribeButtonText}>{subscriptionPending ? 'Adding…' : isSubscribed ? 'Subscribed' : 'Subscribe'}</Text>
            </TouchableOpacity>
            }
          </View>
          {isDownloading && <View style={styles.downloadProgress}><Text style={styles.downloadProgressText}>Downloading… {Math.floor(downloadProgress * 100)}%</Text><TouchableOpacity onPress={cancelDownload}><Text style={styles.cancelDownloadText}>Cancel</Text></TouchableOpacity></View>}
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsHeading}>Suggestions</Text>
          {trendingSuggestions.map((video, index) => (
            <TouchableOpacity
              key={`${video.id ?? video.upload_id ?? index}`}
              accessibilityRole="button"
              style={styles.suggestionCard}
              activeOpacity={0.85}
              onPress={() => {
                pauseCurrentVideoRef.current?.();
                void openMobilePlayer(router, { ...video, source: 'upload', upload_id: video.id ?? video.upload_id }, extra?.BASE_URL || '');
              }}
            >
              <Image source={{ uri: suggestionThumbnail(video.thumbnail) }} style={styles.suggestionThumbnail} />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionTitle} numberOfLines={2}>{video.title || 'Untitled video'}</Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>{video.channel_name || video.channel_username || 'Teleplay'}</Text>
                <Text style={styles.suggestionMeta}>{formatViews(video.views)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!trendingSuggestions.length && <Text style={styles.emptySuggestions}>Trending videos will appear here.</Text>}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  fullscreenScrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  videoWrapper: {
    backgroundColor: 'black',
    borderRadius: 0,
    overflow: 'hidden',
    marginTop: 0,
    aspectRatio: 16 / 9,
    alignSelf: 'center',
  },
  fullscreenVideoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    marginTop: 0,
    borderRadius: 0,
    aspectRatio: undefined,
    alignSelf: 'auto',
  },
  fullscreenMinimizeButton: {
    position: 'absolute',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    zIndex: 2000,
    elevation: 2000,
  },
  fullscreenMinimizeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  audioWrapper: {
    aspectRatio: undefined,
    height: 240,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  controlButton: {
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsPanel: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  speedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  speedButtonActive: {
    backgroundColor: '#4ea1ff',
    borderColor: '#4ea1ff',
  },
  speedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  speedButtonTextActive: {
    color: '#fff',
  },
  moreOptionsPanel: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBox: {
    backgroundColor: '#333',
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadBtn: {
    backgroundColor: '#4ea1ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#1D1D1D',
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    width: '95%',
    maxWidth: 760,
  },
  titleBlock: {
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.45,
    lineHeight: 29,
  },
  metadataBlock: { paddingTop: 14 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
  },
  subscribeButton: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24,
    justifyContent: 'center', minHeight: 42, paddingHorizontal: 14, flexShrink: 0,
  },
  subscribedButton: { backgroundColor: '#D9D9D9' },
  subscribeButtonText: { color: '#101010', fontSize: 14, fontWeight: '800' },
  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 4, marginBottom: 16 },
  roundAction: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4B8FEC', alignItems: 'center', justifyContent: 'center' },
  roundActionDisabled: { opacity: 0.4 },
  channelRow: { borderTopWidth: 1, borderTopColor: '#3A3A3A', paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  channelAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#5A3131', flexShrink: 0 },
  channelIdentity: { flex: 1, minWidth: 0 },
  channelTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  channelHandle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 2 },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    color: '#4ea1ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '600',
    marginRight: 8,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  downloadProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  downloadProgressText: { color: '#C9D9F8', fontSize: 14, fontWeight: '700' },
  cancelDownloadText: { color: '#FF9B9B', fontSize: 14, fontWeight: '800' },
  suggestionsSection: { width: '95%', maxWidth: 760, marginTop: 32 },
  suggestionsHeading: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  suggestionCard: { flexDirection: 'row', marginBottom: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
  suggestionThumbnail: { width: 148, aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: '#252525' },
  suggestionInfo: { flex: 1, minWidth: 0, paddingLeft: 12, justifyContent: 'center' },
  suggestionTitle: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  suggestionMeta: { color: '#aaa', fontSize: 13, marginTop: 4 },
  emptySuggestions: { color: '#aaa', fontSize: 14, paddingBottom: 16 },
  loaderBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4ea1ff',
    borderRadius: 8,
  },
  downloadBtnDisabled: {
    opacity: 0.55,
  },
});
