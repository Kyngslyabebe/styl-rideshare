import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  isOnline: boolean;
  onToggle: () => void;
}

export default function OnlineToggle({ isOnline, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isOnline ? colors.orange : '#333333' },
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.indicator, { backgroundColor: isOnline ? colors.success : '#666666' }]} />
      <Text style={styles.text}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 20,
    gap: 8,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
