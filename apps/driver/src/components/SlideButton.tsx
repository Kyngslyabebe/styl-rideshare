import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

const SCREEN_W = Dimensions.get('window').width;
const BUTTON_H = 50;
const HANDLE_SIZE = 40;
const PADDING = 5;

interface Props {
  label: string;
  onSlideComplete: () => void;
  color?: string;
  textColor?: string;
}

export default function SlideButton({ label, onSlideComplete, color = '#FF6B00', textColor = '#FFF' }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const maxSlide = SCREEN_W - 64 - HANDLE_SIZE - PADDING * 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only capture horizontal drags, ignore vertical
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 5;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        const x = Math.max(0, Math.min(gesture.dx, maxSlide));
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > maxSlide * 0.75) {
          Animated.spring(translateX, { toValue: maxSlide, useNativeDriver: true, speed: 20 }).start(() => {
            onSlideComplete();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 14 }).start();
        }
      },
    })
  ).current;

  const labelOpacity = translateX.interpolate({
    inputRange: [0, maxSlide * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { backgroundColor: color }]}>
      <Animated.Text style={[styles.label, { color: textColor, opacity: labelOpacity }]}>
        {label}
      </Animated.Text>
      <Animated.View
        style={[styles.handle, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <ChevronRight size={20} color={color} strokeWidth={2.5} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: BUTTON_H,
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: PADDING,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
