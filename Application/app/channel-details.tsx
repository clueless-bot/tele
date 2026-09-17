import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';

// Placeholder for a VideoCard component, assuming it exists or will be created
const VideoCard = ({ video }: { video: any }) => (
  <View style={videoCardStyles.card}>
    <Image source={{ uri: video.thumbnail }} style={videoCardStyles.thumbnail} />
    <View style={videoCardStyles.info}>
      <Text style={videoCardStyles.title}>{video.title}</Text>
      <Text style={videoCardStyles.format}>{video.format}</Text>
      <Text style={videoCardStyles.languages}>{video.languages}</Text>
    </View>
    <TouchableOpacity style={videoCardStyles.optionsButton}>
      <MoreVertical size={20} color="#333" />
    </TouchableOpacity>
  </View>
);

const videoCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 100,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  format: {
    fontSize: 12,
    color: '#666',
  },
  languages: {
    fontSize: 12,
    color: '#666',
  },
  optionsButton: {
    padding: 5,
  },
});

export default function ChannelDetailsScreen() {
  const { channelId, channelName, channelUserId } = useLocalSearchParams();

  // Dummy data for videos, replace with API call later
  const channelVideos = [
    { id: '1', title: 'Jawan', thumbnail: 'https://via.placeholder.com/100x60', format: 'FORMAT (HD, MVK,)', languages: 'Hindi, Teli, Tamil,' },
    { id: '2', title: 'Jawan', thumbnail: 'https://via.placeholder.com/100x60', format: 'FORMAT (HD, MVK,)', languages: 'Hindi, Teli, Tamil,' },
    { id: '3', title: 'Jawan', thumbnail: 'https://via.placeholder.com/100x60', format: 'FORMAT (HD, MVK,)', languages: 'Hindi, Teli, Tamil,' },
    { id: '4', title: 'Jawan', thumbnail: 'https://via.placeholder.com/100x60', format: 'FORMAT (HD, MVK,)', languages: 'Hindi, Teli, Tamil,' },
    { id: '5', title: 'Jawan', thumbnail: 'https://via.placeholder.com/100x60', format: 'FORMAT (HD, MVK,)', languages: 'Hindi, Teli, Tamil,' },
  ];

  const handleSubscribe = () => {
    console.log(`Subscribing to channel ${channelName}`);
    // Implement actual subscribe logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.headerInfo}>
            <Text style={styles.channelName}>{channelName || 'Channel name'}</Text>
            <Text style={styles.channelUserId}>@{channelUserId || 'channel_user_id'}</Text>
          </View>
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>Subscribe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentToggle}>
          <TouchableOpacity style={styles.toggleButtonActive}>
            <Text style={styles.toggleButtonTextActive}>Latest</Text>
          </TouchableOpacity>
          {/* Add other toggle buttons if needed */}
        </View>

        <View style={styles.videoList}>
          {channelVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollViewContent: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ccc',
    marginRight: 15,
  },
  headerInfo: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  channelName: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  channelUserId: {
    flexShrink: 1,
    fontSize: 14,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#6495ED',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexShrink: 0,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  contentToggle: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  toggleButtonTextActive: {
    fontWeight: 'bold',
    color: '#333',
  },
  videoList: {
    // Styles for the list of videos
  },
});
