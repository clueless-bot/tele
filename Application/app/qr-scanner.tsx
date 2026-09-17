import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera, ImagePlus } from 'lucide-react-native';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../components/ToastProvider';

export default function QRScannerScreen() {
  const router = useRouter();
  const showToast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [readingImage, setReadingImage] = useState(false);

  useEffect(() => { if (!permission) void requestPermission(); }, [permission, requestPermission]);

  const openScannedContent = (rawData: string) => {
    const data = rawData.trim();
    if (!data) {
      setScanned(false);
      showToast('The QR code did not contain a playable link.', 'error');
      return;
    }
    router.replace({
      pathname: '/videoplay/VideoPlayerPage',
      params: data.includes('/s/') || data.includes('teleplay')
        ? { shortUrl: encodeURIComponent(data), title: 'Teleplay Content' }
        : { videoUrl: encodeURIComponent(data), title: 'Scanned video' },
    });
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    openScannedContent(data);
  };

  const pickImage = async () => {
    try {
      setReadingImage(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('Allow photo access to scan a QR image from your gallery.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const imageUri = result.assets[0]?.uri;
      if (!imageUri) {
        showToast('The selected image could not be read. Please choose another image.', 'error');
        return;
      }
      const codes = await scanFromURLAsync(imageUri, ['qr']);
      if (!codes.length) {
        showToast('No QR code was found in that image. Choose a clearer QR image.', 'error');
        return;
      }
      setScanned(true);
      openScannedContent(codes[0].data);
    } catch (error) {
      console.error('Unable to scan QR image:', error);
      showToast('Unable to read that image. Please choose a valid QR image.', 'error');
    } finally {
      setReadingImage(false);
    }
  };

  if (!permission?.granted) return (
    <SafeAreaView style={styles.container}><Stack.Screen options={{ title: 'QR Scanner', headerShown: true }} />
      <View style={styles.center}><Camera size={56} color="#fff" /><Text style={styles.message}>Camera access is needed to scan a QR code.</Text>
      <TouchableOpacity style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Allow camera</Text></TouchableOpacity>
      <TouchableOpacity style={styles.galleryButton} onPress={pickImage}><ImagePlus size={20} color="#fff" /><Text style={styles.buttonText}>Choose QR image</Text></TouchableOpacity></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}><Stack.Screen options={{ title: 'Scan QR Code', headerShown: true }} />
      <CameraView style={styles.camera} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
      <View pointerEvents="none" style={styles.dim}><View style={styles.frame} /></View>
      <View style={styles.bottom}><Text style={styles.message}>Position a QR code inside the frame</Text>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage} disabled={readingImage}><ImagePlus size={20} color="#fff" /><Text style={styles.buttonText}>{readingImage ? 'Reading image…' : 'Choose from gallery'}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, camera: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  message: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }, button: { backgroundColor: '#0B78D1', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14 },
  galleryButton: { backgroundColor: '#0B78D1', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', gap: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }, buttonText: { color: '#fff', fontWeight: '800' },
  dim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' }, frame: { width: 248, height: 248, borderRadius: 22, borderWidth: 3, borderColor: '#fff', shadowColor: '#0B78D1', shadowOpacity: 0.8, shadowRadius: 20 },
  bottom: { position: 'absolute', bottom: 36, left: 20, right: 20, alignItems: 'center', gap: 14, backgroundColor: 'rgba(16,24,40,0.76)', borderRadius: 18, padding: 16 },
});
