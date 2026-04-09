import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Car, Clock, CreditCard, Sun, Moon, LogOut, ChevronRight, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { signOut } from '../../services/auth';
import { colors as appColors } from '../../theme/colors';

export default function ProfileScreen({ navigation }: any) {
  const { t, colors, toggleTheme, mode } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('drivers').select('*').eq('id', user.id).single(),
      ]);
      setProfile(p);
      setDriver(d);
    })();
  }, [user]);

  const handleAvatarUpload = () => {
    Alert.alert('Update Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pickAvatar('camera') },
      { text: 'Gallery', onPress: () => pickAvatar('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickAvatar = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${user!.id}/avatar.${ext}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `avatar.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);

      const { error } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, formData, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

      if (error) { Alert.alert('Upload Failed', error.message); return; }

      const { data: urlData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user!.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Driver header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAvatarUpload} activeOpacity={0.7}>
          <View style={[styles.avatar, { backgroundColor: appColors.orange + '20' }]}>
            {uploadingAvatar ? (
              <ActivityIndicator color={appColors.orange} />
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: appColors.orange }]}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            )}
          </View>
          <View style={[styles.cameraBadge, { backgroundColor: appColors.orange }]}>
            <Camera size={10} color="#FFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {profile?.full_name || 'Driver'}
          </Text>
          <Text style={[styles.email, { color: t.textSecondary }]} numberOfLines={1}>
            {profile?.email || ''}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.statValue, { color: colors.orange }]}>
            {driver?.rating ? Number(driver.rating).toFixed(1) : '5.0'}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Rating</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.statValue, { color: colors.orange }]}>
            {driver?.total_rides || 0}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Rides</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.statValue, { color: colors.orange }]}>
            ${Number(driver?.total_earnings || 0).toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Earned</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon={Car} label="Manage Vehicles" color={t.text} secondaryColor={t.textSecondary} onPress={() => navigation.navigate('VehicleManage')} />
        <MenuItem icon={Clock} label="Ride History" color={t.text} secondaryColor={t.textSecondary} onPress={() => navigation.getParent()?.navigate('History')} />
        <MenuItem icon={CreditCard} label="Subscription" color={t.text} secondaryColor={t.textSecondary} onPress={() => navigation.navigate('Subscription')} />
        <MenuItem
          icon={mode === 'dark' ? Sun : Moon}
          label={`${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          color={t.text}
          secondaryColor={t.textSecondary}
          onPress={toggleTheme}
        />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <LogOut size={14} color={colors.error} strokeWidth={1.5} />
        <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({ icon: Icon, label, color, secondaryColor, onPress }: {
  icon: any; label: string; color: string; secondaryColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <Icon size={15} color={secondaryColor} strokeWidth={1.5} />
        <Text style={[styles.menuItemText, { color }]}>{label}</Text>
      </View>
      <ChevronRight size={14} color={secondaryColor} strokeWidth={1.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontSize: 20, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerInfo: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  email: { fontSize: 11, fontWeight: '400', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 9, fontWeight: '400', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  menu: { marginBottom: 14 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuItemText: { fontSize: 12, fontWeight: '500' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 40,
  },
  signOutText: { fontSize: 12, fontWeight: '600' },
});
