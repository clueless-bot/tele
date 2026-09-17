import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { User, Heart, Download, LogOut, Info, MessageSquare, ChevronRight, QrCode } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useToast } from '../../components/ToastProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomAppBarVisibility } from '../../components/BottomAppBarVisibility';

export default function MenuScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const showToast = useToast();
  const { setBottomAppBarHidden } = useBottomAppBarVisibility();
  const lastScrollYRef = useRef(0);

  const handleMenuScroll = (event: any) => {
    const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
    if (nextY <= 4) setBottomAppBarHidden(false);
    else if (nextY > lastScrollYRef.current + 8) setBottomAppBarHidden(true);
    else if (nextY < lastScrollYRef.current - 8) setBottomAppBarHidden(false);
    lastScrollYRef.current = nextY;
  };

  // Check for JWT and user info on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const name = await SecureStore.getItemAsync('userName');
        const email = await SecureStore.getItemAsync('userEmail');

        if (!token) {
          showToast('Please sign in to continue.', 'error');
          router.replace('/auth/login');
        } else {
          setUserName(name);
          setUserEmail(email);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        showToast('Your session could not be verified. Please sign in again.', 'error');
        router.replace('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userName');
      await SecureStore.deleteItemAsync('userEmail');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
      showToast('Could not sign out. Please try again.', 'error');
    }
  };

  const menuItems = [
    { title: 'Scan QR Code', icon: QrCode, color: '#1a9bd7', onPress: () => router.push('/qr-scanner') },
    { title: 'Create Channel', icon: Heart, color: '#000000', onPress: () => showToast('Create Channel is coming soon.', 'info') },
    { title: 'Downloads', icon: Download, color: '#000000', onPress: () => router.push('/download') },
    { title: 'About', icon: Info, color: '#000000', onPress: () => showToast('Teleplay helps you discover and play shared video.', 'info') },
    { title: 'Help & Feedback', icon: MessageSquare, color: '#000000', onPress: () => router.push('/help-feedback') },
    { title: 'Sign Out', icon: LogOut, color: '#ff4d4d', onPress: handleSignOut },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088cc" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={handleMenuScroll} scrollEventThrottle={16}>
      <Text style={styles.pageTitle}>Profile & settings</Text>
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <User size={28} color="#fff" strokeWidth={2} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName ?? 'User'}</Text>
          <Text style={styles.userEmail}>{userEmail ?? 'No Email'}</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
              <item.icon size={20} color={item.color} strokeWidth={2} />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
            <ChevronRight size={20} color="#8e8e93" strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { padding: 20, paddingBottom: 104 },
  pageTitle: { color: '#101828', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B78D1', borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0B78D1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 5,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  userEmail: { flexShrink: 1, fontSize: 14, color: '#EAF4FF' },
  menuSection: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#EAECF0',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#101828' },
});
