import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  BackHandler,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Camera, Plus, Heart, Play, Flame, Sparkles, Clock3 } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { openMobilePlayer } from '../util/mobileStreaming';
import { useToast } from '../../components/ToastProvider';
import { addToHistory } from '../util/history';
import { useBottomAppBarVisibility } from '../../components/BottomAppBarVisibility';

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function HomeScreen() {
  const BASE_URL = (extra?.BASE_URL || '').replace(/\/+$/, '');
  console.log('BASE_URL:', BASE_URL);

  // -------- State variables --------
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedChannel, setHighlightedChannel] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [feedFilter, setFeedFilter] = useState<'forYou' | 'trending' | 'newest'>('forYou');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const router = useRouter();
  const showToast = useToast();
  const { setBottomAppBarHidden } = useBottomAppBarVisibility();
  const abortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const lastScrollYRef = useRef(0);

  const handleFeedScroll = (event: any) => {
    const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
    if (nextY <= 4) setBottomAppBarHidden(false);
    else if (nextY > lastScrollYRef.current + 8) setBottomAppBarHidden(true);
    else if (nextY < lastScrollYRef.current - 8) setBottomAppBarHidden(false);
    lastScrollYRef.current = nextY;
  };

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!searchText.trim() && !isSearchFocused && !suggestions.length) return false;
        Keyboard.dismiss();
        searchInputRef.current?.blur();
        setIsSearchFocused(false);
        setSearchText('');
        setSuggestions([]);
        setChannels([]);
        setErrorMsg(null);
        return true;
      });
      return () => subscription.remove();
    }, [isSearchFocused, searchText, suggestions.length]),
  );

  useEffect(() => {
    const loadFeaturedVideos = async () => {
      try {
        const response = await fetch(`${BASE_URL}/discover/uploads`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success && Array.isArray(data.data)) setFeaturedVideos(data.data);
      } catch (error) {
        console.error('Could not load featured videos:', error);
      }
    };
    void loadFeaturedVideos();
  }, [BASE_URL]);

  const normalizeImageUri = (raw: unknown) => {
    if (typeof raw !== 'string') return '';
    const uri = raw.trim();
    if (!uri) return '';
    if (uri.startsWith('data:')) return uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      if (uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('0.0.0.0')) return '';
      return uri;
    }
    if (!BASE_URL) return uri;
    if (uri.startsWith('/')) return `${BASE_URL}${uri}`;
    return `${BASE_URL}/${uri}`;
  };

  // -------- Suggestions (autocomplete) --------
  const handleSuggest = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    try {
      const url = `${BASE_URL}/channel/search?query=${encodeURIComponent(trimmed)}`;
      const resp = await fetch(url);
      if (!resp.ok) return;

      const data = await resp.json();
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.results)
        ? data.results
        : [];

      // const names = list
      //   .map((item) => item.channel_name || item.username || item.title)
      //   .filter(Boolean);

      // setSuggestions([...new Set(names)].slice(0, 6));
    
      const names = list
      .map((item) => item.channel_name || item.username || item.title)
      .filter(Boolean);
    
    const filtered = names.filter((n) =>
      n.toLowerCase().includes(trimmed.toLowerCase())
    );
    
    if (filtered.length === 0) {
      setSuggestions([]); // nothing matches → no dropdown
    } else if (
      filtered.length === 1 &&
      filtered[0].toLowerCase() === trimmed.toLowerCase()
    ) {
      setSuggestions([]); // exact match → hide dropdown
    } else {
      setSuggestions([...new Set(filtered)].slice(0, 6));
    }
    
    
    
    
    } catch (err) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      void handleSuggest(searchText);
      void handleSearch(searchText);
    }, 300);
    return () => clearTimeout(id);
  }, [searchText]);

  // -------- Search logic --------
  interface Channel {
    channel_id: number;
    channel_name: string;
    username?: string;
    upload_id?: number;
    title?: string;
    tags?: string;
    input_link?: string;
    source?: 'channel' | 'upload';
  }

  const handleSearch = async (query: string) => {
    console.log('handleSearch called with query:', query);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setChannels([]);
      setHighlightedChannel(null);
      setErrorMsg(null);
      setIsSearching(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsSearching(true);
    setErrorMsg(null);

    try {
      const url = `${BASE_URL}/channel/search?query=${encodeURIComponent(trimmedQuery)}`;
      const resp = await fetch(url, { signal: abortRef.current.signal });

      if (resp.status === 404) {
        setChannels([]);
        setHighlightedChannel(null);
        return;
      }

      if (!resp.ok) {
        setChannels([]);
        setErrorMsg('Search failed. Try again.');
        return;
      }

      const data = await resp.json();

      const list: Channel[] = Array.isArray(data)
        ? data
        : Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.results)
        ? data.results
        : [];

      const uniqueList = list.filter(
        (item, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              `${t.source ?? 'channel'}:${t.channel_id ?? ''}:${t.upload_id ?? ''}` ===
              `${item.source ?? 'channel'}:${item.channel_id ?? ''}:${item.upload_id ?? ''}`
          )
      );

      setChannels(uniqueList);

      if (list.length > 0) {
        const lowerQuery = trimmedQuery.toLowerCase();
        const match = list.find((ch) =>
          (ch.channel_name || ch.username || '').toLowerCase().includes(lowerQuery)
        );
        setHighlightedChannel(match?.channel_id ?? null);
      } else {
        setHighlightedChannel(null);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setChannels([]);
        setHighlightedChannel(null);
        setErrorMsg('Network error. Check server URL or Wi-Fi.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenVideo = async (item: Channel) => {
    try {
      // Preserve the Home card thumbnail; the player records the actual
      // playback start as well, so all entry paths stay covered.
      await addToHistory(item);
      await openMobilePlayer(router, item, BASE_URL, '/');
    } catch (err) {
      console.error('Error opening search result:', err);
      showToast('This video is not available right now. Please try again.', 'error');
    }
  };

  // -------- Subscribe --------
  const handleSubscribe = async (channelId: string) => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      if (!userId || !token) {
        showToast('Please sign in before subscribing to a channel.', 'error');
        return;
      }

      const resp = await fetch(`${BASE_URL}/channel/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // userId is retained for compatibility with older API deployments.
        // The current API verifies it against the JWT and never trusts it alone.
        body: JSON.stringify({ userId: Number(userId), channelId: Number(channelId) }),
      });

      if (resp.status === 409) {
        showToast('You are already subscribed to this channel.', 'info');
        return;
      }

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${resp.status}`);
      }

      showToast('Subscribed successfully.');
    } catch (e: any) {
      showToast(e.message || 'Could not subscribe. Please try again.', 'error');
    }
  };

  // -------- Highlight matches --------
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlightMatch = (text: string, query: string) => {
    const base = text ?? '';
    if (!query) return <Text style={{ color: '#000' }}>{base}</Text>;
    const safe = escapeRegExp(query);
    const regex = new RegExp(`(${safe})`, 'gi');
    const parts = base.split(regex);
    return (
      <Text>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text
              key={`${part}-${i}`}
              style={{ color: '#0088cc', fontWeight: '700' }}
            >
              {part}
            </Text>
          ) : (
            <Text key={`${part}-${i}`} style={{ color: '#000' }}>
              {part}
            </Text>
          )
        )}
      </Text>
    );
  };

  const renderVideoFeed = (videos: any[]) => videos.map((video, index) => (
    <TouchableOpacity
      key={`${video.id ?? video.upload_id ?? index}`}
      style={styles.feedCard}
      onPress={() => void handleOpenVideo({ ...video, source: 'upload', upload_id: video.id ?? video.upload_id })}
      activeOpacity={0.9}
    >
      <View style={styles.feedThumbnailWrap}>
        <Image style={styles.feedThumbnail} source={{ uri: normalizeImageUri(video.thumbnail) || 'https://placehold.co/640x360/png?text=Teleplay' }} />
        <View style={styles.feedPlay}><Play size={18} fill="#fff" color="#fff" /></View>
      </View>
      <View style={styles.feedInfo}>
        <Text style={styles.feedTitle} numberOfLines={2}>{video.title || 'Untitled video'}</Text>
        <Text style={styles.feedMeta} numberOfLines={1}>{video.channel_name || video.channel_username || 'Teleplay'}{typeof video.views === 'number' ? ` · ${video.views} views` : ''}</Text>
      </View>
    </TouchableOpacity>
  ));

  const displayedVideos = feedFilter === 'trending'
    ? [...featuredVideos].sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    : feedFilter === 'newest'
      ? [...featuredVideos].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      : featuredVideos;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View style={styles.brandBlock}>
          <Image source={require('../../assets/images/logo.png')} style={styles.brandLogo} />
          <View><Text style={styles.brandName}>TELEPLAY</Text><Text style={styles.brandTagline}>Find something worth watching</Text></View>
        </View>
        <View style={styles.communityBadge}><Sparkles size={15} color="#0B78D1" /><Text style={styles.communityText}>Community</Text></View>
      </View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#fff" strokeWidth={2} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search channels, titles, or tags"
            placeholderTextColor="#d0d0d0"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={() => void handleSearch(searchText)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => router.push('/qr-scanner')}
          >
            <Camera size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionItem}
                onPress={() => {
                  setSearchText(s);
                  setSuggestions([]);
                  void handleSearch(s);
                }}
              >
                <Search size={16} color="#555" style={{ marginRight: 8 }} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!errorMsg && <Text style={{ color: '#d00', marginTop: 8 }}>{errorMsg}</Text>}
      </View>

      {/* Discover/Search Channels */}
      <ScrollView
        style={styles.channelsSection}
        contentContainerStyle={styles.channelsContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.sectionHeading}>
          {isSearching
            ? 'Searching…'
            : searchText.trim()
            ? 'Search Results'
            : 'Explore videos'}
        </Text>

        {!searchText.trim() && !isSearching ? <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity style={[styles.filterChip, feedFilter === 'forYou' && styles.filterChipActive]} onPress={() => setFeedFilter('forYou')}><Sparkles size={15} color={feedFilter === 'forYou' ? '#fff' : '#475467'} /><Text style={[styles.filterText, feedFilter === 'forYou' && styles.filterTextActive]}>For you</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, feedFilter === 'trending' && styles.filterChipActive]} onPress={() => setFeedFilter('trending')}><Flame size={15} color={feedFilter === 'trending' ? '#fff' : '#475467'} /><Text style={[styles.filterText, feedFilter === 'trending' && styles.filterTextActive]}>Trending</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, feedFilter === 'newest' && styles.filterChipActive]} onPress={() => setFeedFilter('newest')}><Clock3 size={15} color={feedFilter === 'newest' ? '#fff' : '#475467'} /><Text style={[styles.filterText, feedFilter === 'newest' && styles.filterTextActive]}>Newest</Text></TouchableOpacity>
          </ScrollView>
          {renderVideoFeed(displayedVideos)}
          {!featuredVideos.length && <Text style={{ color: '#667085' }}>New videos from the Teleplay community will appear here.</Text>}
        </> : null}
        {searchText.trim() && (!channels || channels.length === 0) && !isSearching ? (
          <Text style={{ color: '#555' }}>
            {searchText.trim() ? 'No matches found.' : 'Search channels, titles, or tags.'}
          </Text>
        ) : null}

        <View>
	        {channels.map((item: any, idx: number) => {
	            const id = item.channel_id ?? item.upload_id ?? String(idx);
	            const source = item.source ?? 'channel';
	            const avatar =
	              normalizeImageUri(item.profile_image) ||
	              item.avatar ||
	              'https://via.placeholder.com/120x90';
	            const isHighlighted = highlightedChannel === id;

	            if (source === 'channel') {
	              const name = item.channel_name ?? item.name ?? 'Unnamed';
	              return (
	                <TouchableOpacity
	                  key={id}
	                  style={[
	                    styles.resultRow,
	                    // isHighlighted && { borderColor: '#0088cc', borderWidth: 2 },
	                  ]}
	                  onPress={() => router.push(`/channel/${item.channel_id}`)}
	                >
	                  <Image
	                    source={{ uri: avatar }}
	                    style={[styles.resultThumbnail, { width: 70, height: 70, borderRadius: 35 }]}
	                    onError={(e) => {
	                      console.log('Channel avatar load failed:', {
	                        channelId: item.channel_id,
	                        profile_image: item.profile_image,
	                        avatar,
	                        error: e?.nativeEvent,
	                      });
	                    }}
	                  />
	                  <View style={styles.resultInfo}>
	                    <Text style={styles.resultTitle}>
	                      {highlightMatch(name, searchText)}
	                    </Text>
                    <TouchableOpacity
                      style={styles.subscribeButton}
                      onPress={() => handleSubscribe(String(item.channel_id))}
                    >
                      <Heart size={14} color="#ffffff" />
                      <Text style={styles.subscribeText}>Subscribe</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
	            } else if (source === 'upload') {
	              const title = item.title ?? 'Untitled';
	              return (
	                <TouchableOpacity
                    key={id}
                    style={styles.resultRow}
                    onPress={() => void handleOpenVideo(item)}
                  >
	                  <Image
	                    source={{ uri: avatar }}
	                    style={[styles.resultThumbnail, { width: 70, height: 70, borderRadius: 8 }]}
	                    onError={(e) => {
	                      console.log('Upload row image load failed:', {
	                        channelId: item.channel_id,
	                        uploadId: item.upload_id,
	                        profile_image: item.profile_image,
	                        avatar,
	                        error: e?.nativeEvent,
	                      });
	                    }}
	                  />
	                  <View style={styles.resultInfo}>
	                    <Text style={styles.resultTitle}>
	                      {highlightMatch(title, searchText)}
	                    </Text>
                    <Text style={styles.resultChannel} numberOfLines={1}>
                      {item.channel_name}
                    </Text>
                    {!!item.tags && (
                      <Text style={styles.resultTags} numberOfLines={1}>
                        Tags: {item.tags}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.subscribeButton, { backgroundColor: '#555' }]}
                      onPress={() => void handleOpenVideo(item)}
                    >
                      <Text style={styles.subscribeText}>View</Text>
                    </TouchableOpacity>
                  </View>
	                </TouchableOpacity>
              );
            }
            return null;
          })}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/add-link')}
      >
        <Plus size={24} color="#ffffff" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 10 },
  brandBlock: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, brandLogo: { width: 38, height: 38, borderRadius: 12, flexShrink: 0 }, brandName: { flexShrink: 1, fontSize: 16, fontWeight: '900', color: '#101828', letterSpacing: 1 }, brandTagline: { flexShrink: 1, color: '#667085', fontSize: 12, marginTop: 1 },
  communityBadge: { flexShrink: 0, backgroundColor: '#EAF4FF', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }, communityText: { color: '#0B78D1', fontSize: 11, fontWeight: '800' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 12, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B78D1',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
    shadowColor: '#0B78D1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    marginRight: 12,
  },
  cameraButton: { padding: 7, marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12 },
  suggestionBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  channelsSection: { marginTop: 4, paddingHorizontal: 20 }, channelsContent: { paddingBottom: 118 }, sectionHeading: { fontSize: 22, fontWeight: '800', color: '#101828', marginBottom: 14, letterSpacing: -0.35 },
  filterRow: { gap: 9, paddingBottom: 18 }, filterChip: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE3EA', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 99 }, filterChipActive: { backgroundColor: '#0B78D1', borderColor: '#0B78D1', shadowColor: '#0B78D1', shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 }, filterText: { color: '#475467', fontSize: 13, fontWeight: '700' }, filterTextActive: { color: '#FFF' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 16,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  resultThumbnail: {
    width: 120,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 15, fontWeight: '700', color: '#101828',
    marginBottom: 6,
  },
  resultChannel: { color: '#555', fontSize: 13, marginBottom: 2 },
  resultTags: { color: '#777', fontSize: 12, marginBottom: 2 },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088cc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  subscribeText: { color: '#ffffff', marginLeft: 4, fontSize: 12 },
  feedCard: { padding: 10, paddingBottom: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 20, shadowColor: '#101828', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  feedThumbnailWrap: { position: 'relative' }, feedThumbnail: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: '#E5E7EB' },
  feedPlay: { position: 'absolute', top: '50%', left: '50%', marginLeft: -21, marginTop: -21, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  feedInfo: { paddingHorizontal: 4, paddingTop: 11 }, feedTitle: { fontSize: 17, fontWeight: '800', color: '#101828', letterSpacing: -0.2, lineHeight: 22 },
  feedMeta: { color: '#667085', fontSize: 13, marginTop: 5 },
  floatingButton: {
    position: 'absolute',
    right: 20, bottom: 96, width: 58, height: 58, backgroundColor: '#0B78D1', borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
