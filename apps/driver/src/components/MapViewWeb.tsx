import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';

// Web fallback for react-native-maps
// Shows a styled placeholder on web, real MapView on native

let NativeMapView: any = null;
let PROVIDER_GOOGLE: any = undefined;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  NativeMapView = maps.default;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

export { PROVIDER_GOOGLE };

export interface MapHandle {
  animateToRegion: (region: any, duration?: number) => void;
}

const MapViewCross = forwardRef<MapHandle, any>(({ children, style, initialRegion, ...props }, ref) => {
  const nativeRef = React.useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any, duration?: number) => {
      nativeRef.current?.animateToRegion?.(region, duration);
    },
  }));

  if (Platform.OS === 'web') {
    return (
      <View style={[style, webStyles.container]}>
        <View style={webStyles.grid}>
          {/* Simulated map grid */}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`h${i}`} style={[webStyles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`v${i}`} style={[webStyles.gridLineV, { left: `${(i + 1) * 14}%` }]} />
          ))}
        </View>
        {/* Center pin */}
        <View style={webStyles.pinContainer}>
          <View style={webStyles.pin} />
          <View style={webStyles.pinShadow} />
        </View>
        <Text style={webStyles.coordText}>
          {initialRegion ? `${initialRegion.latitude.toFixed(4)}, ${initialRegion.longitude.toFixed(4)}` : 'Map'}
        </Text>
        <Text style={webStyles.webLabel}>Web Preview — Maps available on device</Text>
        {children}
      </View>
    );
  }

  return (
    <NativeMapView
      ref={nativeRef}
      style={style}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      {...props}
    >
      {children}
    </NativeMapView>
  );
});

export default MapViewCross;

const webStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E8E0D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(180,170,160,0.3)',
  } as any,
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(180,170,160,0.3)',
  } as any,
  pinContainer: {
    alignItems: 'center',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginTop: 2,
  },
  coordText: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
    fontWeight: '600',
  },
  webLabel: {
    position: 'absolute',
    bottom: 12,
    fontSize: 10,
    color: '#AAA',
    fontWeight: '500',
  },
});
