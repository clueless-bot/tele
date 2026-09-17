import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

type ToastTone = 'success' | 'info' | 'error';
type Toast = { message: string; tone: ToastTone };

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);
const DismissToastContext = createContext<(() => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const dismissToast = useCallback((horizontalDirection = 0) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    opacity.stopAnimation();
    translateY.stopAnimation();
    translateX.stopAnimation();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      horizontalDirection
        ? Animated.timing(translateX, { toValue: horizontalDirection * 420, duration: 140, useNativeDriver: true })
        : Animated.timing(translateY, { toValue: 16, duration: 140, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setToast(null); });
  }, [opacity, translateX, translateY]);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    opacity.stopAnimation();
    translateY.stopAnimation();
    translateX.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(16);
    translateX.setValue(0);
    setToast({ message, tone });

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      dismissToast();
    }, 30_000);
  }, [dismissToast, opacity, translateX, translateY]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_event, gesture) => translateX.setValue(gesture.dx),
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 72 || Math.abs(gesture.vx) > 0.7) {
        dismissToast((gesture.dx || gesture.vx) >= 0 ? 1 : -1);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  }), [dismissToast, translateX]);

  return (
    <ToastContext.Provider value={showToast}>
      <DismissToastContext.Provider value={dismissToast}>
      {children}
      {toast && (
        <Animated.View
          accessibilityLiveRegion="polite"
          {...panResponder.panHandlers}
          style={[
            styles.toast,
            styles[toast.tone],
            { opacity, transform: [{ translateX }, { translateY }] },
          ]}
        >
          <Text style={styles.message}>{toast.message}</Text>
        </Animated.View>
      )}
      </DismissToastContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast must be used inside ToastProvider.');
  return showToast;
}

export function useDismissToast() {
  const dismissToast = useContext(DismissToastContext);
  if (!dismissToast) throw new Error('useDismissToast must be used inside ToastProvider.');
  return dismissToast;
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    borderRadius: 16,
    elevation: 12,
    left: 20,
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    bottom: 96,
    zIndex: 1000,
  },
  success: { backgroundColor: '#16794A' },
  info: { backgroundColor: '#0B78D1' },
  error: { backgroundColor: '#B42318' },
  message: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
