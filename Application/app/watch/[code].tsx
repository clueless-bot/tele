import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';

type Extra = {
  BASE_URL: string;
};

const extra = Constants.expoConfig?.extra as Extra;

export default function WatchRedirectScreen() {
  const router = useRouter();
  const { code = '', title = 'Teleplay Content' } = useLocalSearchParams();

  useEffect(() => {
    if (!code) return;
    const shortUrl = `${extra.BASE_URL}/s/${code}`;
    router.replace({
      pathname: '/videoplay/VideoPlayerPage',
      params: {
        shortUrl: encodeURIComponent(shortUrl),
        title: title as string,
      },
    });
  }, [code, title, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color="#1a9bd7" />
      <Text style={styles.text}>Preparing stream...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
});

