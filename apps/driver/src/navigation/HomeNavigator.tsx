import React, { useRef, useCallback, useEffect } from 'react';
import { View, Animated, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import DrawerSidebar from '../components/DrawerSidebar';
import { setDrawerOpen } from './drawerRef';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.68;

export default function HomeNavigator({ navigation }: any) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const openDrawer = useCallback(() => {
    isOpen.current = true;
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => { setDrawerOpen(openDrawer); }, [openDrawer]);

  const closeDrawer = useCallback(() => {
    isOpen.current = false;
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pass drawer controls + parent navigation to screens
  const drawerNav = {
    openDrawer,
    closeDrawer,
    navigate: (screen: string, params?: any) => {
      closeDrawer();
      navigation.navigate(screen, { ...params, fromDrawer: true });
    },
  };

  return (
    <View style={styles.container}>
      <HomeScreen navigation={drawerNav} />

      {/* Overlay */}
      <Animated.View
        pointerEvents={isOpen.current || overlayOpacity ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
        <DrawerSidebar navigation={drawerNav} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  overlayTouch: { flex: 1 },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
});
