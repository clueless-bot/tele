import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

export default function ShortLinkRedirectScreen() {
  const router = useRouter();
  const { code = "" } = useLocalSearchParams();

  useEffect(() => {
    if (!code) return;

    const canonicalShortUrl = `https://teleplay.in/s/${code}`;

    router.replace({
      pathname: "/videoplay/VideoPlayerPage",
      params: {
        shortUrl: encodeURIComponent(canonicalShortUrl),
        title: "Teleplay Content",
      },
    });
  }, [code, router]);

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  text: {
    marginTop: 16,
    color: "#fff",
    fontSize: 16,
  },
});

