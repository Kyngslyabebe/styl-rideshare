import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Copy, Gift } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

export default function ReferralScreen({ navigation, route }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const type: 'rider' | 'driver' = route?.params?.type || 'rider';
  const screenTitle = type === 'driver' ? 'Refer a Driver' : 'Refer a Rider';
  const referralCode = user?.id ? user.id.substring(0, 8).toUpperCase() : 'STYL0000';

  const handleShare = () => {
    Alert.alert('Copied!', `Referral code ${referralCode} copied to clipboard.`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.giftRow}>
        <Gift size={32} color={colors.orange} strokeWidth={1.5} />
      </View>

      <Text style={[styles.subtitle, { color: t.textSecondary }]}>Your referral code</Text>

      <View style={[styles.codeCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={[styles.code, { color: colors.orange }]}>{referralCode}</Text>
      </View>

      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.orange }]}
        onPress={handleShare}
        activeOpacity={0.7}
      >
        <Copy size={14} color="#FFFFFF" strokeWidth={1.5} />
        <Text style={styles.shareText}>Share Code</Text>
      </TouchableOpacity>

      <View style={[styles.infoCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={[styles.infoTitle, { color: t.text }]}>How it works</Text>
        <Text style={[styles.infoBody, { color: t.textSecondary }]}>
          Share your referral code with friends. When they sign up and complete their first ride,
          you both earn a reward.
        </Text>
        <View style={[styles.bonusRow, { backgroundColor: colors.orange + '12' }]}>
          <Text style={[styles.bonusText, { color: colors.orange }]}>
            Earn $10 for each friend who completes their first ride
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  giftRow: { alignItems: 'center', marginBottom: 12 },
  subtitle: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 },
  codeCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  code: { fontSize: 20, fontWeight: '700', letterSpacing: 3 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 20,
  },
  shareText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  infoCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 40,
  },
  infoTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  infoBody: { fontSize: 11, fontWeight: '400', lineHeight: 16, marginBottom: 10 },
  bonusRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bonusText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
