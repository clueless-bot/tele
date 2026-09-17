import { useState, useRef } from 'react';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useVideoDownload(videoUrl: string, title: string) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const controllerRef = useRef<FileSystem.DownloadResumable | null>(null);
  const DOWNLOADS_KEY = "downloads";

  const toSafeFilename = (name: string) => {
    const base = (name || "video")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120)
      .replace(/[^a-z0-9._ -]/gi, "_")
      .replace(/[\\/]/g, "_")
      .trim()
      .replace(/\s+/g, "_");

    const hasExt = /\.[a-z0-9]{2,5}$/i.test(base);
    return hasExt ? base : `${base}.mp4`;
  };

  // Progress callback
  const progressCallback = (progressData: FileSystem.DownloadProgressData) => {
    const progress =
      progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
    setDownloadProgress(progress);
  };

  // Ensure platform permissions
  const ensurePermissions = async (): Promise<boolean> => true;

  // Main download function
  const downloadVideo = async () => {
    try {
      console.log('Download button pressed');
      const hasPermission = await ensurePermissions();
      if (!hasPermission) {
        console.warn('Permissions not granted (non-Android flow). Aborting download.');
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      const filenameFromUrl = (() => {
        try {
          const url = new URL(videoUrl);
          const last = url.pathname.split("/").filter(Boolean).pop() || "";
          return last;
        } catch {
          const last = videoUrl.split("?")[0].split("#")[0].split("/").pop() || "";
          return last;
        }
      })();

      const filename = toSafeFilename(title || filenameFromUrl || "video");
      const fileUri = `${FileSystem.documentDirectory}${Date.now()}_${filename}`;

      console.log('⬇️ Downloading to:', fileUri);

      controllerRef.current = FileSystem.createDownloadResumable(
        videoUrl,
        fileUri,
        {},
        progressCallback
      );

      const result = await controllerRef.current?.downloadAsync();
      if (!result) {
        console.error('❌ Download failed: no result returned');
        Alert.alert('Error', 'Download failed.');
        return;
      }
      const { uri, status } = result;

      if (status === 200) {
        console.log('✅ Download complete:', uri);

        // Persist in AsyncStorage so the Downloads screen can list it.
        try {
          const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
          const existing = stored ? JSON.parse(stored) : [];
          const next = Array.isArray(existing) ? existing : [];
          const item = { title: title || filename, uri };
          const deduped = [item, ...next.filter((d: any) => d?.uri !== uri)];
          await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(deduped));
        } catch (e) {
          console.error("Failed to persist downloads list:", e);
        }

        Alert.alert('Saved', `Video saved in Downloads:\n${title || filename}`);

        return uri;
      } else {
        console.error('❌ Download failed, status:', status);
        Alert.alert('Error', `Download failed with status ${status}`);
      }
    } catch (error: any) {
      console.error('❌ Error downloading video:', error.message || error);
      Alert.alert('Error', 'Something went wrong while downloading.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Cancel download
  const cancelDownload = async () => {
    try {
      if (controllerRef.current) {
        await controllerRef.current.pauseAsync();
        controllerRef.current = null;
        Alert.alert('Cancelled', 'Download cancelled');
      }
    } catch (err) {
      console.error('Error cancelling download:', err);
    }
  };

  return {
    downloadVideo,
    cancelDownload,
    isDownloading,
    downloadProgress,
  };
}
