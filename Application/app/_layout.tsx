import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ToastProvider } from '@/components/ToastProvider';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSession, setCheckingSession] = useState(true);
  const isPlayerRoute = pathname.startsWith('/videoplay');

  useEffect(() => {
    // Only the player should follow device rotation. Keeping the discovery,
    // search and account screens portrait avoids the stretched layout shown
    // when the phone is accidentally held sideways.
    if (isPlayerRoute) return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      .catch(() => undefined);
  }, [isPlayerRoute]);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync('userToken').then((token) => {
      if (!active) return;
      const onAuthScreen = pathname.startsWith('/auth/');
      if (!token && !onAuthScreen) router.replace('/auth/login');
      if (token && onAuthScreen) router.replace('/');
      setCheckingSession(false);
    }).catch(() => {
      if (active) {
        router.replace('/auth/login');
        setCheckingSession(false);
      }
    });
    return () => { active = false; };
  }, [pathname, router]);

  return (
    <ToastProvider>
      {checkingSession ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View> : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
      <StatusBar style={isPlayerRoute ? "light" : "dark"} />
    </ToastProvider>
  );
}
