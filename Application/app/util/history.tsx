import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';

const BASE_URL = String((Constants.expoConfig?.extra as { BASE_URL?: string } | undefined)?.BASE_URL || '').replace(/\/+$/, '');

export const addToHistory = async (video: any) => {
  try {
    const userId = await SecureStore.getItemAsync("userId");
    const storageKey = `watchHistory:${userId || "guest"}`;

    // Migrate legacy global history to guest bucket to avoid cross-user mixing.
    const legacy = await AsyncStorage.getItem("watchHistory");
    if (legacy) {
      const existingGuest = await AsyncStorage.getItem("watchHistory:guest");
      if (!existingGuest) {
        await AsyncStorage.setItem("watchHistory:guest", legacy);
      }
      await AsyncStorage.removeItem("watchHistory");
    }

    const history = await AsyncStorage.getItem(storageKey);
    let historyList = history ? JSON.parse(history) : [];

    const entryId =
      video?.id ||
      video?.output_link ||
      video?.outputLink ||
      video?.input_link ||
      video?.inputLink ||
      video?.shortUrl ||
      video?.short_link ||
      video?.magnetLink ||
      `${Date.now()}`;

    const previousEntry = historyList.find((item: any) => item.id === entryId);
    // avoid duplicates → remove if already exists
    historyList = historyList.filter((item: any) => item.id !== entryId);

    // add to the top
    historyList.unshift({
      ...video,
      id: entryId,
      // Different API endpoints use different thumbnail field names. Store a
      // single canonical value so the History tab can always render artwork.
      thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || video?.cover || video?.image || previousEntry?.thumbnail || '',
      watchedAt: new Date().toISOString(),
    });

    // keep only last 20
    if (historyList.length > 20) historyList.pop();

    await AsyncStorage.setItem(storageKey, JSON.stringify(historyList));

    // Signed-in users also get a server-backed history, available across
    // devices. Local history remains available for offline/guest playback.
    const token = await SecureStore.getItemAsync('userToken');
    if (token && BASE_URL) {
      const uploadId = Number(video?.id ?? video?.upload_id ?? video?.uploadId);
      const response = await fetch(`${BASE_URL}/watch-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          contentKey: String(entryId),
          uploadId: Number.isInteger(uploadId) && uploadId > 0 ? uploadId : undefined,
          title: video?.title || 'Untitled Video',
          thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || video?.cover || video?.image || null,
          input_link: video?.input_link || video?.inputLink || video?.magnetLink || null,
          output_link: video?.output_link || video?.outputLink || video?.shortUrl || video?.short_link || null,
          description: video?.description || null,
          language: video?.language || null,
        }),
      });
      if (!response.ok) console.warn('Unable to sync watch history:', response.status);
    }
  } catch (err) {
    console.error("Error saving to history:", err);
  }
};
