import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { addToHistory } from '../util/history';
import { openMobilePlayer } from '../util/mobileStreaming';
import { shareUpload } from '../util/share';
import { Share2 } from 'lucide-react-native';
import { useToast } from '../../components/ToastProvider';
type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function ChannelPage() {
  const BASE_URL = extra.BASE_URL;
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const showToast = useToast();

  const readJsonSafely = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    const text = await res.text();
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`Expected JSON but got ${contentType || "unknown"} (HTTP ${res.status}): ${preview}`);
  };

  const normalizeImageUri = (raw: unknown) => {
    if (typeof raw !== "string") return "";
    const uri = raw.trim();
    if (!uri) return "";
    if (uri.startsWith("data:")) return uri;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
    if (!BASE_URL) return uri;
    if (uri.startsWith("/")) return `${BASE_URL}${uri}`;
    return `${BASE_URL}/${uri}`;
  };

  const normalizeThumbnailUri = (raw: unknown) => {
    if (typeof raw !== "string") return "";
    const uri = raw.trim();
    if (!uri) return "";
    if (uri.startsWith("data:")) return uri;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
    // If it looks like a path (relative or absolute), resolve it against BASE_URL.
    if (uri.startsWith("/") || uri.includes(".") || uri.includes("utils/")) {
      return normalizeImageUri(uri);
    }
    // Otherwise treat it as raw base64.
    return `data:image/jpeg;base64,${uri}`;
  };

  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"All" | "popular">("All");
  const [error, setError] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);

  const fetchSubscriptionState = useCallback(async () => {
    const userId = await SecureStore.getItemAsync("userId");
    const token = await SecureStore.getItemAsync("userToken");
    if (!userId || !token || !id) {
      setIsSubscribed(false);
      return;
    }

    const checkResp = await fetch(
      `${BASE_URL}/channel/${id}/isSubscribed?userId=${encodeURIComponent(userId)}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
    );
    if (!checkResp.ok) throw new Error(`HTTP ${checkResp.status}`);
    const result = await readJsonSafely(checkResp);
    setIsSubscribed(result.subscribed === true);
  }, [BASE_URL, id]);

  // --- Fetch functions ---
  const fetchChannelContent = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/content/${id}`);
      const data = await readJsonSafely(res);
      if (data.content) setVideos(data.content);
      else setError(data.message || "No content found");
    } catch (err: any) {
      setError("Error fetching content: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Subscribe ---
  const handleSubscribe = async () => {
    if (subscriptionPending) return;
    setSubscriptionPending(true);
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const token = await SecureStore.getItemAsync("userToken");
      if (!userId || !token) {
        showToast('Please sign in before subscribing to a channel.', 'error');
        return;
      }
      const resp = await fetch(`${BASE_URL}/channel/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: Number(userId), channelId: Number(id) }),
      });
      if (!resp.ok && resp.status !== 409) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${resp.status}`);
      }
      await fetchSubscriptionState();
      showToast('Subscribed successfully.');
    } catch (e: any) {
      console.error("Error subscribing:", e);
      showToast(e.message || 'Could not subscribe. Please try again.', 'error');
    } finally {
      setSubscriptionPending(false);
    }
  };

  // --- Unsubscribe ---
  const handleUnsubscribe = async () => {
    if (subscriptionPending) return;
    setSubscriptionPending(true);
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const token = await SecureStore.getItemAsync("userToken");
      if (!userId || !token) {
        showToast('Please sign in before changing subscriptions.', 'error');
        return;
      }
      const resp = await fetch(`${BASE_URL}/channel/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: Number(userId), channelId: Number(id) }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await fetchSubscriptionState();
      showToast('Unsubscribed successfully.', 'info');
    } catch (e) {
      console.error("Error unsubscribing:", e);
      showToast('Could not unsubscribe. Please try again.', 'error');
    } finally {
      setSubscriptionPending(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchChannel = async () => {
      try {
        const resp = await fetch(`${BASE_URL}/channel/${id}`);
        const data = await readJsonSafely(resp);
        setChannel(data);

        fetchChannelContent();
      } catch (e) {
        console.error(e);
      }
    };

    fetchChannel();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptionState().catch((e) => {
        console.error("Error checking subscription:", e);
      });
    }, [fetchSubscriptionState]),
  );

  if (loading) return <Text style={{ margin: 20 }}>Loading...</Text>;
  if (!channel) return <Text style={{ margin: 20 }}>Channel not found</Text>;

  // --- Video click logic ---
  const handleVideoClick = async (item: any) => {
    try {
      // ✅ Save to history
      await addToHistory(item);

      await openMobilePlayer(router, item, BASE_URL, `/channel/${id}`);
    } catch (err: any) {
      console.error("Error starting stream:", err);
      showToast('Could not start this stream. Please try again.', 'error');
    }
  };

  const handleShareVideo = async (item: any) => {
    try {
      await shareUpload({ baseUrl: BASE_URL, uploadId: item.id, title: item.title });
      showToast('Share sheet opened.', 'info');
    } catch (err: any) {
      console.error('Error sharing content:', err);
      showToast(err.message || 'Unable to open the share sheet. Please try again.', 'error');
    }
  };

  return (
    <FlatList
      data={videos}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.videoCard} onPress={() => handleVideoClick(item)}>
          <Image
            source={{
              uri: item.thumbnail
                ? normalizeThumbnailUri(item.thumbnail)
                : "https://via.placeholder.com/150",
            }}
            style={styles.videoThumb}
          />
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">{item.title || 'Untitled video'}</Text>
            <Text style={styles.videoDetails} numberOfLines={1}>Language: {item.language || 'Unknown'}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Share ${item.title || 'video'}`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              handleShareVideo(item);
            }}
            style={styles.shareButton}
          >
            <Share2 size={20} color="#007bff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
      ListHeaderComponent={
        <>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={{
                uri:
                  normalizeImageUri(channel?.avatar ?? channel?.profile_image)
                    ? normalizeImageUri(channel?.avatar ?? channel?.profile_image)
                    : "https://via.placeholder.com/100",
              }}
              style={styles.avatar}
            />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>
                {channel?.name || "Channel"}
              </Text>
              <Text style={styles.channelUsername}>
                @{channel?.username || "user"}
              </Text>
            </View>

            {/* Subscribe/Unsubscribe button */}
            <TouchableOpacity
              style={[styles.subscribeBtn, isSubscribed && styles.subscribedBtn]}
              onPress={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={subscriptionPending}
            >
              <Text style={[styles.subscribeText, isSubscribed && styles.subscribedText]}>
                {isSubscribed ? "Unsubscribe" : "Subscribe"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={activeTab === "All" ? styles.activeTab : styles.tab}
              onPress={() => {
                setActiveTab("All");
                fetchChannelContent();
              }}
            >
              <Text style={styles.tabText}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={activeTab === "popular" ? styles.activeTab : styles.tab}
              onPress={() => {
                setActiveTab("popular");
              }}
            >
              <Text style={styles.tabText}>Popular</Text>
            </TouchableOpacity>
          </View>
        </>
      }
      ListEmptyComponent={error ? <Text style={{ margin: 20, color: "red" }}>{error}</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginVertical: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    width: "100%",
  },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  channelInfo: { flexGrow: 1, flexShrink: 1, minWidth: 0, marginRight: 10, justifyContent: "center" },
  channelName: { flexShrink: 1, fontSize: 18, fontWeight: "700", color: "#000" },
  channelUsername: { flexShrink: 1, fontSize: 14, color: "#555" },

  subscribeBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "center",
    minWidth: 100,
    flexShrink: 0,
  },
  subscribedBtn: {
    backgroundColor: "red",
  },
  subscribeText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  subscribedText: { color: "#fff", fontWeight: "600", textAlign: "center" },

  tabs: { flexDirection: "row", marginVertical: 12 },
  tab: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  activeTab: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#ccc",
  },
  tabText: { fontSize: 14, fontWeight: "600" },

  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    minHeight: 96,
  },
  videoThumb: { width: 100, height: 96 },
  videoInfo: { flex: 1, minWidth: 0, padding: 8, justifyContent: "center" },
  videoTitle: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: "700", marginBottom: 4 },
  videoDetails: { fontSize: 12, color: "#555" },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    marginHorizontal: 4,
    borderRadius: 22,
  },
});
