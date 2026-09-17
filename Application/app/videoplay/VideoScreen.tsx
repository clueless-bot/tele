import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoSource, VideoView, type ContentType } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useDismissToast } from '../../components/ToastProvider';

export default function VideoScreen({
  videoSource = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  audioOnly = false,
  title = 'Audio',
  onPlaybackError,
  onPlaybackStarted,
  onPauseHandleReady,
  onFullscreenToggle,
  isFullscreen = false,
}: {
  videoSource: VideoSource;
  audioOnly?: boolean;
  title?: string;
  onPlaybackError?: (message: string) => void;
  onPlaybackStarted?: () => boolean | void;
  onPauseHandleReady?: (pause: () => void) => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}) {
  const normalizedSource = useMemo<VideoSource>(() => {
    if (typeof videoSource !== 'string') return videoSource;

    const path = videoSource.toLowerCase().split('?')[0].split('#')[0];
    let contentType: ContentType = 'progressive';
    if (path.endsWith('.m3u8')) contentType = 'hls';
    else if (path.endsWith('.mpd')) contentType = 'dash';
    else if (path.endsWith('.ism') || path.endsWith('.isml')) contentType = 'smoothStreaming';

    return {
      uri: videoSource,
      contentType,
      useCaching: false,
      metadata: { title },
    };
  }, [title, videoSource]);

  const player = useVideoPlayer(normalizedSource, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.25;
    player.bufferOptions = {
      // Start promptly, then let Media3 build a larger buffer while playback
      // continues. The old two-second gate made every remote source wait.
      preferredForwardBufferDuration: 20,
      minBufferForPlayback: 1,
      maxBufferBytes: 64 * 1024 * 1024,
      prioritizeTimeOverSizeThreshold: true,
    };
    player.play();
  });

  useEffect(() => {
    // Expo Video releases its native player during unmount. Exposing a pause
    // callback lets the parent stop playback *before* navigation, without
    // calling pause on an already-released native object during cleanup.
    onPauseHandleReady?.(() => {
      try {
        player.pause();
      } catch {
        // The player may already have been released by a route transition.
      }
    });
  }, [onPauseHandleReady, player]);

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const { status, error } = useEvent(player, 'statusChange', {
    status: player.status,
    error: undefined,
  });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0, bufferedPosition: 0, currentLiveTimestamp: null, currentOffsetFromLive: null });
  const { duration: loadedDuration } = useEvent(player, 'sourceLoad', { duration: 0, videoSource: null, availableVideoTracks: [], availableAudioTracks: [], availableSubtitleTracks: [] });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack });

  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [seekWidth, setSeekWidth] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [playerViewport, setPlayerViewport] = useState({ width: 0, height: 0 });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);
  const hasReportedPlayback = useRef(false);
  const videoViewRef = useRef<VideoView>(null);
  const lastTapRef = useRef(0);
  const scrubStartTimeRef = useRef(0);
  const scrubWasPlayingRef = useRef(false);
  const isActivelyScrubbingRef = useRef(false);
  const dismissToast = useDismissToast();

  useEffect(() => {
    hasReportedPlayback.current = false;
  }, [videoSource]);

  useEffect(() => {
    if (isPlaying) {
      setHasStartedPlayback(true);
      if (!hasReportedPlayback.current) {
        hasReportedPlayback.current = onPlaybackStarted?.() !== false;
      }
    }
  }, [isPlaying, onPlaybackStarted]);

  useEffect(() => {
    if (!isPlaying || settingsVisible) return;
    const timer = setTimeout(() => setControlsVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [currentTime, isPlaying, settingsVisible]);

  useEffect(() => {
    if (status === 'error') {
      onPlaybackError?.(error?.message || 'Media3 could not play this source.');
    }
  }, [error?.message, onPlaybackError, status]);

  const isPlayerLoading = status === 'loading';
  const loadingLabel = hasStartedPlayback ? 'Buffering stream...' : 'Loading video...';
  const duration = Number.isFinite(loadedDuration) && loadedDuration > 0 ? loadedDuration : player.duration;
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const fittedLandscapeVideoStyle = useMemo(() => {
    const sourceWidth = videoTrack?.size.width ?? 0;
    const sourceHeight = videoTrack?.size.height ?? 0;
    const { width: viewportWidth, height: viewportHeight } = playerViewport;
    if (!isFullscreen || sourceWidth <= 0 || sourceHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return undefined;

    // Size the native view to the source aspect ratio. This keeps the video's
    // original width/height relationship in landscape instead of stretching
    // the rendering surface to the phone's (usually much wider) aspect ratio.
    const sourceAspectRatio = sourceWidth / sourceHeight;
    const viewportAspectRatio = viewportWidth / viewportHeight;
    return sourceAspectRatio >= viewportAspectRatio
      ? { width: viewportWidth, height: viewportWidth / sourceAspectRatio }
      : { width: viewportHeight * sourceAspectRatio, height: viewportHeight };
  }, [isFullscreen, playerViewport, videoTrack?.size.height, videoTrack?.size.width]);
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
  };
  const seekToPosition = (positionX: number, width: number) => {
    if (!duration || width <= 0) return;
    player.currentTime = Math.max(0, Math.min(duration, (positionX / width) * duration));
  };
  const handleVideoTap = (positionX: number, width: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      player.seekBy(positionX < width / 2 ? -10 : 10);
      setControlsVisible(true);
    } else {
      setControlsVisible((visible) => !visible);
    }
    lastTapRef.current = now;
  };

  const panResponder = useMemo(() => PanResponder.create({
    // This layer owns touches only on the video itself; the controls are
    // rendered above it and remain fully tappable.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      scrubStartTimeRef.current = player.currentTime;
      scrubWasPlayingRef.current = player.playing;
      isActivelyScrubbingRef.current = false;
    },
    onPanResponderMove: (_event, gesture) => {
      if (!duration || !videoWidth || Math.abs(gesture.dx) < 6 || Math.abs(gesture.dx) <= Math.abs(gesture.dy)) return;
      if (!isActivelyScrubbingRef.current) {
        isActivelyScrubbingRef.current = true;
        if (scrubWasPlayingRef.current) player.pause();
        dismissToast();
      }
      const nextTime = Math.max(0, Math.min(duration, scrubStartTimeRef.current + (gesture.dx / videoWidth) * duration));
      setControlsVisible(true);
      setScrubPreview(nextTime);
      player.currentTime = nextTime;
    },
    onPanResponderRelease: (_event, gesture) => {
      const wasHorizontalSeek = duration > 0 && videoWidth > 0 && Math.abs(gesture.dx) >= 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      if (wasHorizontalSeek) {
        const nextTime = Math.max(0, Math.min(duration, scrubStartTimeRef.current + (gesture.dx / videoWidth) * duration));
        player.currentTime = nextTime;
        setScrubPreview(null);
        if (scrubWasPlayingRef.current) player.play();
        isActivelyScrubbingRef.current = false;
      } else {
        handleVideoTap(gesture.x0, videoWidth);
      }
    },
    onPanResponderTerminate: () => {
      setScrubPreview(null);
      if (isActivelyScrubbingRef.current && scrubWasPlayingRef.current) player.play();
      isActivelyScrubbingRef.current = false;
    },
  }), [dismissToast, duration, player, videoWidth]);

  const renderPlayerSurface = (fullscreen: boolean) => (
      <View
        style={[styles.videoContainer, fullscreen && styles.fullscreenContainer]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setPlayerViewport((current) => current.width === width && current.height === height ? current : { width, height });
        }}
      >
        {audioOnly ? (
          <View style={styles.audioArtwork}>
            <Ionicons name="musical-notes" size={64} color="#4ea1ff" />
            <Text style={styles.audioTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.audioSubtitle}>Audio stream</Text>
          </View>
        ) : (
          <VideoView
            ref={videoViewRef}
            style={[styles.video, fullscreen && fittedLandscapeVideoStyle]}
            player={player}
            nativeControls={false}
            // SurfaceView is drawn below Android modals. TextureView keeps
            // the actual video visible in Teleplay's custom fullscreen modal.
            surfaceType="textureView"
            contentFit="contain"
          />
        )}

        {!audioOnly && <View style={styles.gestureLayer} onLayout={(event) => setVideoWidth(event.nativeEvent.layout.width)} {...panResponder.panHandlers} />}

        {scrubPreview !== null && <View pointerEvents="none" style={styles.scrubPreview}><Text style={styles.scrubPreviewText}>{formatTime(scrubPreview)}</Text></View>}

        {!audioOnly && controlsVisible && duration > 0 && (
          <View style={[styles.youtubeControls, fullscreen && styles.landscapeControls]} pointerEvents="box-none">
            <View style={[styles.topControls, fullscreen && styles.landscapeTopControls]}>
              <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
              <View style={[styles.topActions, fullscreen && styles.fullscreenTopActions]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Player settings" style={styles.topButton} onPress={() => setSettingsVisible((visible) => !visible)}><Ionicons name="settings-outline" size={21} color="#fff" /></Pressable>
                {!fullscreen && <Pressable accessibilityRole="button" accessibilityLabel="Enter fullscreen" style={styles.topButton} onPress={onFullscreenToggle}><Ionicons name="expand-outline" size={22} color="#fff" /></Pressable>}
              </View>
            </View>
            {settingsVisible && <View style={styles.settingsMenu}>
              <Text style={styles.settingsLabel}>Playback speed</Text>
              <View style={styles.speedList}>{[0.75, 1, 1.25, 1.5, 2].map((speed) => <Pressable key={speed} style={[styles.speedButton, player.playbackRate === speed && styles.speedButtonActive]} onPress={() => { player.playbackRate = speed; setSettingsVisible(false); }}><Text style={[styles.speedText, player.playbackRate === speed && styles.speedTextActive]}>{speed === 1 ? 'Normal' : `${speed}x`}</Text></Pressable>)}</View>
            </View>}
            <View style={[styles.seekRow, fullscreen && styles.landscapeSeekRow]}>
              <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
              <Pressable
                accessibilityRole="adjustable"
                accessibilityLabel="Video seek bar"
                style={styles.seekTouchTarget}
                onLayout={(event) => setSeekWidth(event.nativeEvent.layout.width)}
                onPressIn={dismissToast}
                onPress={(event) => seekToPosition(event.nativeEvent.locationX, seekWidth)}
              >
                <View style={styles.seekTrack}>
                  <View style={[styles.seekProgress, { width: `${progress * 100}%` }]} />
                  <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
                </View>
              </Pressable>
              <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
            </View>
            <View style={[styles.quickControls, fullscreen && styles.landscapeQuickControls]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back 10 seconds" style={[styles.quickButton, fullscreen && styles.landscapeQuickButton]} onPress={() => player.seekBy(-10)}><Ionicons name="play-back" size={18} color="#fff" /><Text style={[styles.quickText, fullscreen && styles.landscapeQuickText]}>10</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'} style={[styles.playButton, fullscreen && styles.landscapePlayButton]} onPress={() => isPlaying ? player.pause() : player.play()}><Ionicons name={isPlaying ? 'pause' : 'play'} size={fullscreen ? 19 : 21} color="#111" /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Forward 10 seconds" style={[styles.quickButton, fullscreen && styles.landscapeQuickButton]} onPress={() => player.seekBy(10)}><Ionicons name="play-forward" size={18} color="#fff" /><Text style={[styles.quickText, fullscreen && styles.landscapeQuickText]}>10</Text></Pressable>
            </View>
          </View>
        )}

        {isPlayerLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{loadingLabel}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.loadingOverlay}>
            <Ionicons name="alert-circle-outline" size={28} color="#ff8a80" />
            <Text style={styles.errorText}>
              {error?.message || 'This media format or codec is not supported on this device.'}
            </Text>
          </View>
        )}

      </View>
  );

  return (
    <View style={styles.contentContainer}>
      {renderPlayerSurface(isFullscreen)}
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  video: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  audioArtwork: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  audioTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  audioSubtitle: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  gestureLayer: { ...StyleSheet.absoluteFillObject },
  scrubPreview: { position: 'absolute', alignSelf: 'center', top: '42%', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  scrubPreviewText: { color: '#fff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  youtubeControls: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 16, paddingTop: 14, backgroundColor: 'rgba(0,0,0,0.32)' },
  // Landscape uses the original compact arrangement: transport controls stay
  // centred and the timeline is independently anchored above Android's
  // navigation area. Keeping these elements out of one vertical flow prevents
  // controls from being clipped on short landscape screens.
  landscapeControls: { paddingHorizontal: 12, paddingBottom: 0, paddingTop: 0 },
  landscapeTopControls: { top: 8, left: 10, right: 10 },
  topControls: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  videoTitle: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 12 }, topActions: { flexDirection: 'row', gap: 8 }, fullscreenTopActions: { marginRight: 122 }, topButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  settingsMenu: { position: 'absolute', right: 12, top: 56, width: 210, borderRadius: 14, padding: 12, backgroundColor: 'rgba(18,18,18,0.96)' }, settingsLabel: { color: '#D0D5DD', fontSize: 12, fontWeight: '700', marginBottom: 8 }, speedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, speedButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#333' }, speedButtonActive: { backgroundColor: '#FF0033' }, speedText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, speedTextActive: { color: '#FFF' },
  seekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeLabel: { color: '#fff', fontSize: 11, fontVariant: ['tabular-nums'] },
  seekTouchTarget: { flex: 1, height: 28, justifyContent: 'center' },
  seekTrack: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.36)', overflow: 'visible' },
  seekProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: '#FF0033' },
  seekThumb: { position: 'absolute', top: -4, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF0033' },
  quickControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 8, minHeight: 56 },
  quickButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  quickText: { color: '#fff', position: 'absolute', fontSize: 10, fontWeight: '800', top: 16 },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingLeft: 3 },
  // Keep the scrubber clear of Android's gesture/navigation area. On some
  // devices the fullscreen container extends behind that area, which otherwise
  // makes a bottom: 10 timeline appear to disappear completely.
  landscapeSeekRow: { position: 'absolute', left: 16, right: 16, bottom: 46, zIndex: 4, elevation: 4 },
  landscapeQuickControls: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -19, gap: 20, minHeight: 38 },
  landscapeQuickButton: { width: 42, height: 36 },
  landscapeQuickText: { fontSize: 9, top: 12 },
  landscapePlayButton: { width: 38, height: 38, borderRadius: 19 },
});
