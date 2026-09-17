import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';


type DownloadItem = {
  title: string;
  uri: string;
};


export default function DownloadScreen() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const router = useRouter();

  const fetchDownloads = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("downloads");
      const items = stored ? JSON.parse(stored) : [];
      const list: DownloadItem[] = Array.isArray(items) ? items : [];

      // Drop entries whose files were deleted outside the app.
      const existing: DownloadItem[] = [];
      for (const item of list) {
        if (!item?.uri) continue;
        try {
          const info = await FileSystem.getInfoAsync(item.uri);
          if (info.exists) existing.push(item);
        } catch {
          // ignore
        }
      }

      if (existing.length !== list.length) {
        await AsyncStorage.setItem("downloads", JSON.stringify(existing));
      }
      setDownloads(existing);
    } catch (err) {
      console.error("Error fetching downloads:", err);
    }
  }, []);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  useFocusEffect(
    useCallback(() => {
      fetchDownloads();
    }, [fetchDownloads])
  );

  const playVideo = (item: DownloadItem) => {
    // Navigate to the VideoPlayerPage with local URI
    router.push({
      pathname: "/videoplay/VideoPlayerPage",
      params: {
        videoUrl: item.uri,
        title: item.title,
        description: "Downloaded Video",
        language: "N/A",
        format: "mp4",
      },
    });
  };

const deleteVideo = async (item: DownloadItem) => {
	  Alert.alert("Delete Video", `Are you sure you want to delete "${item.title}"?`, [
	    { text: "Cancel", style: "cancel" },
	    {
	      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          // Delete file using legacy API
          await FileSystem.deleteAsync(item.uri, { idempotent: true });

	          // Update state and AsyncStorage
	          const updated = downloads.filter((d) => d.uri !== item.uri);
	          setDownloads(updated);
	          await AsyncStorage.setItem("downloads", JSON.stringify(updated));
	        } catch (err) {
	          console.error("Delete error:", err);
	          Alert.alert("Error", "Unable to delete video.");
	        }
	      },
	    },
	  ]);
	};


  if (downloads.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Downloads</Text>
        </View>

        <View style={styles.centered}>
          <Text style={{ color: "#ccc" }}>No downloaded videos yet.</Text>
        </View>
      </View>
    );
  }

  return (
       <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
      </View>

      <FlatList
        data={downloads}
        keyExtractor={(item) => item.uri}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => playVideo(item)}>
                <Ionicons name="play-circle" size={28} color="#4ea1ff" />
                <Text style={styles.btnText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => deleteVideo(item)}>
                <Ionicons name="trash" size={28} color="#ff4d4d" />
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 60,
    marginTop: 30,
    marginLeft: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
  },
  headerTitle: { color: "#1c1c1c", fontSize: 20, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  item: {
    backgroundColor: "blue",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  buttons: { flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
