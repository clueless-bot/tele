import { Tabs, usePathname } from 'expo-router';
import { Search, Video, Clapperboard, Menu } from 'lucide-react-native';
import { TouchableOpacity, Animated, GestureResponderEvent } from 'react-native';
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomAppBarVisibilityContext } from '../../components/BottomAppBarVisibility';

function CustomTabBarButton({
  accessibilityState,
  children,
  onPress,
  label,
  routePath,
}: {
  accessibilityState?: { selected?: boolean }, // <- make it optional
  children: (color: string) => React.ReactNode,
  onPress: (e: GestureResponderEvent) => void,
  label: string,
  routePath: string,
}) {
  const pathname = usePathname();
  // Expo Router does not always pass accessibilityState to a custom tab
  // button. Use the current pathname as the reliable source of selection.
  const focused = pathname === routePath || (routePath === '/' && pathname === '/index') || accessibilityState?.selected === true;

  // animate flex instead of width
  const flexAnim = useRef(new Animated.Value(focused ? 2 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(flexAnim, {
      toValue: focused ? 2 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();

    Animated.timing(opacityAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ flex: flexAnim, minWidth: 0 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ flex: 1 }}>
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? '#0B78D1' : 'transparent',
            borderRadius: 17,
            paddingHorizontal: focused ? 14 : 8,
            height: 56,
          }}
        >
          {children(focused ? '#fff' : '#667085')}

          {focused && (
            <Animated.Text
              style={{
                color: '#fff',
              marginLeft: 7,
              fontWeight: '600',
              fontSize: 15,
                opacity: opacityAnim,
              }}
            >
              {label}
            </Animated.Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}



export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const isTabBarHidden = useRef(false);
  const hiddenOffset = 60 + Math.max(insets.bottom, 12) + 20;
  const setBottomAppBarHidden = useCallback((hidden: boolean) => {
    if (isTabBarHidden.current === hidden) return;
    isTabBarHidden.current = hidden;
    Animated.timing(tabBarTranslateY, {
      toValue: hidden ? hiddenOffset : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [hiddenOffset, tabBarTranslateY]);
  const bottomAppBarValue = useMemo(() => ({ setBottomAppBarHidden }), [setBottomAppBarHidden]);

  return (
    <BottomAppBarVisibilityContext.Provider value={bottomAppBarValue}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          position: 'absolute',
          bottom: Math.max(insets.bottom, 12),
          left: 16,
          right: 16,
          height: 60,
          padding: 2,
          borderRadius: 18,
          overflow: 'hidden',
          transform: [{ translateY: tabBarTranslateY }],
          elevation: 16,
          shadowColor: '#101828',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routePath="/" label="Search" onPress={props.onPress!}>
              {(color) => <Search size={28} color={color} strokeWidth={2.4} />}
            </CustomTabBarButton>
          ),
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: 'Video',
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routePath="/video" label="History" onPress={props.onPress!}>
              {(color) => <Video size={25} color={color} strokeWidth={2.4} />}
            </CustomTabBarButton>
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Subscriptions',
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routePath="/subscription" label="Subs" onPress={props.onPress!}>
              {(color) => <Clapperboard size={24} color={color} strokeWidth={2.4} />}
            </CustomTabBarButton>
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} routePath="/menu" label="Menu" onPress={props.onPress!}>
              {(color) => <Menu size={27} color={color} strokeWidth={2.4} />}
            </CustomTabBarButton>
          ),
        }}
      />
    </Tabs>
    </BottomAppBarVisibilityContext.Provider>
  );
}
