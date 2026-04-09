import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Clock, CheckCircle, Mail, FileText, Shield, HelpCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { signOut } from '../../services/auth';
import { colors as appColors } from '../../theme/colors';

export default function WaitingApprovalScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>('pending_review');

  useEffect(() => {
    if (!user) return;
    checkStatus();

    const channel = supabase
      .channel('driver-approval')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${user.id}`,
      }, (payload: any) => {
        const newStatus = payload.new?.document_status;
        setStatus(newStatus);
        if (newStatus === 'approved' && payload.new?.is_approved) {
          setTimeout(() => navigation.replace('Main'), 2000);
        }
        if (newStatus === 'rejected') {
          setTimeout(() => navigation.replace('Onboarding'), 3000);
        }
      })
      .subscribe();

    const interval = setInterval(checkStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const checkStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('drivers')
        .select('document_status, is_approved')
        .eq('id', user.id)
        .single();

      if (data) {
        setStatus(data.document_status);
        if (data.document_status === 'approved' && data.is_approved) {
          navigation.replace('Main');
        }
        if (data.document_status === 'rejected') {
          navigation.replace('Onboarding');
        }
      }
    } catch {}
  };

  const isApproved = status === 'approved';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: t.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <Text style={[styles.logo, { color: appColors.orange }]}>styl</Text>
      <Text style={[styles.logoSub, { color: t.textSecondary }]}>Driver</Text>

      {/* Main banner */}
      <View style={[
        styles.banner,
        {
          backgroundColor: isApproved ? colors.success + '10' : appColors.orange + '10',
          borderColor: isApproved ? colors.success + '30' : appColors.orange + '30',
        },
      ]}>
        <View style={[
          styles.bannerIcon,
          { backgroundColor: isApproved ? colors.success + '15' : appColors.orange + '15' },
        ]}>
          {isApproved ? (
            <CheckCircle size={28} color={colors.success} strokeWidth={1.5} />
          ) : (
            <Clock size={28} color={appColors.orange} strokeWidth={1.5} />
          )}
        </View>

        <Text style={[styles.bannerTitle, { color: t.text }]}>
          {isApproved ? "You're Approved!" : 'Application Under Review'}
        </Text>

        <Text style={[styles.bannerDesc, { color: t.textSecondary }]}>
          {isApproved
            ? 'Your account has been approved. Redirecting you to the app...'
            : 'Your documents and vehicle info have been submitted. Our support team will review your application within 24 hours.'
          }
        </Text>
      </View>

      {/* Email sent card */}
      {!isApproved && (
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <View style={[styles.cardIcon, { backgroundColor: appColors.orange + '12' }]}>
            <Mail size={16} color={appColors.orange} strokeWidth={2} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: t.text }]}>Confirmation Email Sent</Text>
            <Text style={[styles.cardDesc, { color: t.textSecondary }]}>
              Check your inbox for a confirmation of your submission.
            </Text>
          </View>
        </View>
      )}

      {/* What happens next */}
      {!isApproved && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>What happens next?</Text>

          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={[styles.cardIcon, { backgroundColor: colors.success + '12' }]}>
              <FileText size={16} color={colors.success} strokeWidth={2} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Document Review</Text>
              <Text style={[styles.cardDesc, { color: t.textSecondary }]}>
                Our team verifies your license, insurance, and vehicle registration.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={[styles.cardIcon, { backgroundColor: appColors.orange + '12' }]}>
              <Shield size={16} color={appColors.orange} strokeWidth={2} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Account Activation</Text>
              <Text style={[styles.cardDesc, { color: t.textSecondary }]}>
                Once approved, you'll get an email and the app will unlock automatically.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={[styles.cardIcon, { backgroundColor: colors.success + '12' }]}>
              <CheckCircle size={16} color={colors.success} strokeWidth={2} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Start Driving</Text>
              <Text style={[styles.cardDesc, { color: t.textSecondary }]}>
                Go online, accept rides, and start earning. You keep 100% of fares.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Help + Sign out */}
      {!isApproved && (
        <View style={styles.footer}>
          <View style={[styles.helpCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <HelpCircle size={14} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.helpText, { color: t.textSecondary }]}>
              Questions? Contact support through the Help section or email us.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => Alert.alert('Sign Out', 'Go back to sign in?', [
              { text: 'Cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 40 },
  logo: { fontSize: 36, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  logoSub: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginBottom: 28 },

  banner: {
    borderRadius: 12, borderWidth: 1, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  bannerIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  bannerDesc: { fontSize: 12, lineHeight: 18, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  cardDesc: { fontSize: 11, lineHeight: 15 },

  section: { marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },

  footer: { marginTop: 20 },
  helpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16,
  },
  helpText: { fontSize: 10, lineHeight: 14, flex: 1 },
  signOutBtn: { alignItems: 'center', padding: 10 },
  signOutText: { fontSize: 12, fontWeight: '600' },
});
