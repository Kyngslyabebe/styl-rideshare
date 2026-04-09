import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Inbox, DollarSign, Car, IdCard, FileCheck,
  CreditCard, Landmark, Zap, Settings, UserPlus, Users,
  Tag, TrendingUp, Clock, HelpCircle, LogOut, Sun, Moon, Camera,
  MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { signOut } from '../services/auth';
import { colors as appColors } from '../theme/colors';

export default function DrawerSidebar({ navigation }: any) {
  const { t, colors, toggleTheme, mode } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);

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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const navigate = (screen: string) => {
    navigation.navigate(screen);
  };

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'D';

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Profile header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('Profile')} activeOpacity={0.7}>
          <View style={[styles.avatar, { backgroundColor: appColors.orange + '20' }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: appColors.orange }]}>{initial}</Text>
            )}
          </View>
          <View style={[styles.cameraBadge, { backgroundColor: appColors.orange }]}>
            <Camera size={12} color="#FFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate('Profile')} activeOpacity={0.8}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {profile?.full_name || 'Driver'}
          </Text>
          <Text style={[styles.viewProfile, { color: colors.orange }]}>View profile →</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: appColors.orange }]}>
            {driver?.rating ? Number(driver.rating).toFixed(1) : '5.0'}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Rating</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.cardBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: appColors.orange }]}>
            {driver?.total_rides || 0}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Rides</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.cardBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: appColors.orange }]}>
            ${Number(driver?.total_earnings || 0).toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Earned</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: t.cardBorder }]} />

      {/* Menu items */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <MenuItem icon={Inbox} label="Inbox" color={t.text} onPress={() => navigate('Inbox')} />
        <MenuItem icon={MessageCircle} label="Support" color={t.text} onPress={() => navigate('SupportChat')} />
        <MenuItem icon={DollarSign} label="My rate card" color={t.text} onPress={() => navigate('RateCard')} />
        <MenuItem icon={Car} label="Manage vehicles" color={t.text} onPress={() => navigate('VehicleManage')} />
        <MenuItem icon={IdCard} label="Driver's license" color={t.text} onPress={() => navigate('License')} />
        <MenuItem icon={FileCheck} label="My documents" color={t.text} onPress={() => navigate('Documents')} />

        <View style={[styles.sectionDivider, { backgroundColor: t.cardBorder }]} />

        <MenuItem icon={CreditCard} label="My subscription" color={t.text} onPress={() => navigate('Subscription')} />
        <MenuItem icon={Landmark} label="Stripe dashboard" color={t.text} onPress={() => navigate('Earnings')} />
        <MenuItem icon={Zap} label="Instant payout" color={t.text} onPress={() => navigate('Earnings')} />
        <MenuItem icon={Settings} label="Settings" color={t.text} onPress={() => navigate('Settings')} />

        <View style={[styles.sectionDivider, { backgroundColor: t.cardBorder }]} />

        <MenuItem icon={UserPlus} label="Refer a rider" color={t.text} onPress={() => navigate('ReferRider')} />
        <MenuItem icon={Users} label="Refer a driver" color={t.text} onPress={() => navigate('ReferDriver')} />
        <MenuItem icon={Tag} label="Promo codes" color={t.text} onPress={() => navigate('RateCard')} />
        <MenuItem icon={TrendingUp} label="Earnings" color={t.text} onPress={() => navigate('Earnings')} />
        <MenuItem icon={Clock} label="Ride history" color={t.text} onPress={() => navigate('RideHistory')} />

        <View style={[styles.sectionDivider, { backgroundColor: t.cardBorder }]} />

        <MenuItem icon={HelpCircle} label="Help" color={t.text} onPress={() => navigate('Help')} />
        <MenuItem
          icon={mode === 'dark' ? Sun : Moon}
          label={`${mode === 'dark' ? 'Light' : 'Dark'} mode`}
          color={t.text}
          onPress={toggleTheme}
        />
        <MenuItem icon={LogOut} label="Sign out" color={colors.error} onPress={handleSignOut} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* App version */}
      <Text style={[styles.version, { color: t.textSecondary }]}>Styl Driver v1.0.0</Text>
    </View>
  );
}

function MenuItem({ icon: Icon, label, color, onPress }: {
  icon: any; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Icon size={14} color={color} strokeWidth={1.5} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    marginTop: 20,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: { fontSize: 30, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  viewProfile: { fontSize: 10, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 11, fontWeight: '700' },
  statLabel: { fontSize: 8, fontWeight: '400', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 20 },
  divider: { height: 1, marginHorizontal: 18 },
  menuScroll: { flex: 1, paddingTop: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  menuLabel: { fontSize: 11, fontWeight: '500' },
  sectionDivider: { height: 1, marginHorizontal: 18, marginVertical: 5 },
  version: { fontSize: 9, textAlign: 'center', paddingBottom: 16, fontWeight: '400' },
});
