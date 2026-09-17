import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, Play, History } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { openMobilePlayer } from '../util/mobileStreaming';
import { useToast } from '../../components/ToastProvider';
import { useBottomAppBarVisibility } from '../../components/BottomAppBarVisibility';

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function VideoScreen() {
  const BASE_URL = extra.BASE_URL;
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const showToast = useToast();
  const { setBottomAppBarHidden } = useBottomAppBarVisibility();
  const lastScrollYRef = useRef(0);

  const handleHistoryScroll = (event: any) => {
    const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
    if (nextY <= 4) setBottomAppBarHidden(false);
    else if (nextY > lastScrollYRef.current + 8) setBottomAppBarHidden(true);
    else if (nextY < lastScrollYRef.current - 8) setBottomAppBarHidden(false);
    lastScrollYRef.current = nextY;
  };

  // Load watch history when screen mounts
  const loadHistory = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const token = await SecureStore.getItemAsync('userToken');
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

      if (token && BASE_URL) {
        const response = await fetch(`${BASE_URL}/watch-history`, { headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } });
        if (response.ok) {
          const data = await response.json();
          const serverHistory = Array.isArray(data.history) ? data.history : [];
          setHistory(serverHistory);
          await AsyncStorage.setItem(storageKey, JSON.stringify(serverHistory));
          return;
        }
      }
      const saved = await AsyncStorage.getItem(storageKey);
      setHistory(saved ? JSON.parse(saved) : []);
    } catch (err) {
      console.error("Error loading watch history:", err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  // Remove a video from history
  const removeFromHistory = async (id: string) => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const storageKey = `watchHistory:${userId || "guest"}`;
      const item = history.find((entry) => String(entry.id) === String(id));
      const newHistory = history.filter(h => String(h.id) !== String(id));
      setHistory(newHistory);
      await AsyncStorage.setItem(storageKey, JSON.stringify(newHistory));
      const token = await SecureStore.getItemAsync('userToken');
      if (token && item?.historyId && BASE_URL) {
        const response = await fetch(`${BASE_URL}/watch-history/${item.historyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error("Error removing video from history:", err);
    }
  };

  const handlePlay = async (item: any) => {
    try {
      await openMobilePlayer(router, item, BASE_URL, '/video');
    } catch (err: any) {
      console.error('Error playing history item:', err);
      showToast('Could not open this video. Please try again.', 'error');
    }
  };

  const thumbnailFor = (item: any) => {
    const raw = item.thumbnail || item.thumbnailUrl || item.thumbnail_url || item.cover || item.image;
    if (typeof raw !== 'string' || !raw.trim()) return 'https://placehold.co/320x180/png?text=Teleplay';
    const thumbnail = raw.trim();
    if (thumbnail.startsWith('data:') || /^https?:\/\//i.test(thumbnail)) return thumbnail;
    if (thumbnail.startsWith('/')) return `${String(BASE_URL || '').replace(/\/+$/, '')}${thumbnail}`;
    return `data:image/jpeg;base64,${thumbnail}`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.videoCard}>
      <Image
        source={{ uri: thumbnailFor(item) }}
        style={styles.thumbnail}
      />
      <View style={styles.videoInfo}>
        <Text style={styles.title} numberOfLines={2}>{item.title || "Untitled Video"}</Text>
        <Text style={styles.time} numberOfLines={1}>
          Watched on {new Date(item.watchedAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handlePlay(item)} style={styles.playButton}>
          <Play size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFromHistory(item.id)} style={styles.deleteButton}>
          <Trash2 size={20} color="#ff4d4f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heading}><View><Text style={styles.eyebrow}>YOUR LIBRARY</Text><Text style={styles.header}>Watch history</Text></View><View style={styles.headingIcon}><History size={21} color="#0B78D1" /></View></View>
      {history.length === 0 ? (
        <View style={styles.emptyState}><History size={34} color="#98A2B3" /><Text style={styles.emptyTitle}>Nothing watched yet</Text><Text style={styles.emptyText}>Videos you play will appear here for quick access.</Text></View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id + index.toString()}
          renderItem={renderItem}
          onScroll={handleHistoryScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F7F9FC' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 20 },
  eyebrow: { color: '#0B78D1', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, header: { fontSize: 25, fontWeight: '800', color: '#101828', letterSpacing: -0.5, marginTop: 2 }, headingIcon: { backgroundColor: '#EAF4FF', borderRadius: 14, padding: 11 },
  videoCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 10, backgroundColor: '#FFF', borderRadius: 16, shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  thumbnail: { width: 112, height: 68, marginRight: 12, borderRadius: 10, backgroundColor: '#E5E7EB' },
  videoInfo: { flex: 1, minWidth: 0 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#101828' }, time: { flexShrink: 1, fontSize: 12, color: '#667085', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: {
    backgroundColor: '#0B78D1', padding: 9, borderRadius: 12,
  },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 30, marginTop: 44, borderWidth: 1, borderColor: '#EAECF0' }, emptyTitle: { color: '#101828', fontWeight: '800', fontSize: 17, marginTop: 12 }, emptyText: { color: '#667085', textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
