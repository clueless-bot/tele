import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { addToHistory } from './util/history';
import { isMagnetLink, openMobilePlayer } from './util/mobileStreaming';
import { useToast } from '../components/ToastProvider';

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function AddLinkScreen() {
  const BASE_URL = extra.BASE_URL;
  const router = useRouter();
  const [link, setLink] = useState('');
  const showToast = useToast();

  const handleOpen = async () => {
    try {
      const inputLink = link.trim();
      if (!inputLink) {
        showToast('Paste a video, cloud, or magnet link before opening the player.', 'error');
        return;
      }
      const isMagnet = isMagnetLink(inputLink);

      // 🔍 Extract title from magnet link (dn parameter)
      const match = isMagnet ? inputLink.match(/[?&]dn=([^&]+)/) : null;
      const decodedTitle = match
        ? decodeURIComponent(match[1].replace(/\+/g, ' '))
        : 'Unknown Title';

      const item = { title: decodedTitle, input_link: inputLink };
      await addToHistory(item);

      await openMobilePlayer(router, item, BASE_URL, '/add-link');

    } catch (err: any) {
      console.error('[AddLink] Error starting stream', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
      showToast('Could not start this stream. Check the link and try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#000" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Play Video</Text>
          </View>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="Paste video, cloud, or magnet link here"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            textAlignVertical="top"
          />

          {/* Button */}
          <TouchableOpacity style={styles.openButton} onPress={handleOpen}>
            <Text style={styles.openButtonText}>Open</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0088cc',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#AFC6FF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: -2,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#DCE5FF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    minHeight: 120,
  },
  openButton: {
    alignSelf: 'center',
    backgroundColor: '#0088cc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
