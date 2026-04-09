import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Palette, Mail, Info, Trash2, Navigation } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { useNavPreference, NavApp } from '../../hooks/useNavPreference';

const PUSH_KEY = 'styl_push_enabled';

export default function SettingsScreen({ navigation }: any) {
  const { t, colors, toggleTheme, mode } = useTheme();
  const { user } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [email, setEmail] = useState('');
  const { navApp, setPreference } = useNavPreference();

  // Load persisted push preference
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PUSH_KEY);
        if (stored !== null) setPushEnabled(stored === 'true');
      } catch {}
    })();
  }, []);

  const handleTogglePush = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(PUSH_KEY, String(value));
    } catch {}
  };

  const navOptions: { value: NavApp; label: string }[] = [
    { value: 'google', label: 'Google Maps' },
    { value: 'waze', label: 'Waze' },
    ...(require('react-native').Platform.OS === 'ios' ? [{ value: 'apple' as NavApp, label: 'Apple Maps' }] : []),
  ];

  const cycleNavApp = () => {
    const idx = navOptions.findIndex((o) => o.value === navApp);
    const next = navOptions[(idx + 1) % navOptions.length];
    setPreference(next.value);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      if (data?.email) setEmail(data.email);
    })();
  }, [user]);

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Please contact support@stylride.com to delete your account.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Toggles */}
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Bell size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: t.text }]}>Push Notifications</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            trackColor={{ false: t.inputBorder, true: colors.orange }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <TouchableOpacity style={styles.row} onPress={toggleTheme} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <Palette size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: t.text }]}>Theme</Text>
          </View>
          <Text style={[styles.rowValue, { color: t.textSecondary }]}>
            {mode === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <TouchableOpacity style={styles.row} onPress={cycleNavApp} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <Navigation size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: t.text }]}>Navigation App</Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.orange }]}>
            {navOptions.find((o) => o.value === navApp)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Mail size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: t.text }]}>Account</Text>
          </View>
          <Text style={[styles.rowValue, { color: t.textSecondary }]} numberOfLines={1}>
            {email || 'Not set'}
          </Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Info size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: t.text }]}>App Version</Text>
          </View>
          <Text style={[styles.rowValue, { color: t.textSecondary }]}>1.0.0</Text>
        </View>
      </View>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
        <Trash2 size={13} color={colors.error} strokeWidth={1.5} />
        <Text style={[styles.deleteText, { color: colors.error }]}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rowLabel: { fontSize: 12, fontWeight: '500' },
  rowValue: { fontSize: 11, fontWeight: '400', maxWidth: 180, textAlign: 'right' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 40,
  },
  deleteText: { fontSize: 12, fontWeight: '600' },
});
