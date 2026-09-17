import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Constants from 'expo-constants';

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

type ApiSearchRow = {
  channel_id: number;
  channel_name: string;
  username?: string | null;
  profile_image?: string | null;
  upload_id?: number | null;
  title?: string | null;
  description?: string | null;
  input_link?: string | null;
  tags?: string | null;
  source?: 'channel' | 'upload';
};

export default function SearchResultsScreen() {
  const BASE_URL = (extra?.BASE_URL || '').replace(/\/+$/, '');
  console.log('BASE_URL:', BASE_URL);


  const { query } = useLocalSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<ApiSearchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/');
        return true;
      });
      return () => subscription.remove();
    }, [router]),
  );

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

  useEffect(() => {
    fetchSearchResults();
  }, [query]);

  const fetchSearchResults = async () => {
    try {
      const q = typeof query === "string" ? query : String(query ?? "");
      const response = await fetch(`${BASE_URL}/channel/search?query=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(Array.isArray(data?.content) ? data.content : []);
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the renderItem function
  const renderItem = ({ item }: { item: ApiSearchRow }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push({ pathname: "/channel/[id]", params: { id: String(item.channel_id) } })}
    >
      {(() => {
        const raw = normalizeImageUri(item.profile_image);
        const uri = raw.includes("localhost") || raw.includes("127.0.0.1") ? "" : raw;
        const fallback = "https://images.unsplash.com/photo-1771230381241-5814b491125b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
        return (
          <Image
            source={{ uri: uri || fallback }}
            style={styles.avatar}
            onError={(e) => {
              console.log("Avatar load failed:", { channelId: item.channel_id, profile_image: item.profile_image, uri, error: e?.nativeEvent });
            }}
          />
        );
      })()}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.channel_name}</Text>
        {!!item.username && <Text style={styles.channelName} numberOfLines={1}>@{item.username}</Text>}
        {!!item.title && <Text style={styles.metaText} numberOfLines={2}>{item.title}</Text>}
      </View>
    </TouchableOpacity>
  );
  
  // Update styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    backButton: {
      position: 'absolute',
      left: 15,
      padding: 5,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: '#000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContainer: {
      padding: 15,
    },
    resultCard: {
      flexDirection: 'row',
      marginBottom: 12,
      padding: 8,
      alignItems: 'center',
    },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: "#eee" },
    videoInfo: {
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },
    videoTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: '#000',
      marginBottom: 4,
    },
    channelName: {
      fontSize: 14,
      color: '#606060',
      marginBottom: 4,
    },
    metaText: {
      fontSize: 14,
      color: '#606060',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50,
    },
    emptyText: {
      fontSize: 16,
      color: '#666',
    },
  });
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <ArrowLeft size={24} color="#000" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Search Results</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0088cc" />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.channel_id}:${item.upload_id ?? "channel"}`}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
