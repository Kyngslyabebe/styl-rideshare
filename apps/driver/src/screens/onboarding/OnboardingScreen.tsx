import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, TextInput, ActivityIndicator,
} from 'react-native';
import {
  CheckCircle, Camera, Upload, Car,
  Shield, Crown, ChevronRight, CreditCard,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { useStripeConnect } from '../../hooks/useStripeConnect';
import { signOut } from '../../services/auth';
import { colors as appColors } from '../../theme/colors';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'Documents', icon: Shield },
  { num: 2, label: 'Vehicle', icon: Car },
  { num: 3, label: 'Payouts', icon: CreditCard },
  { num: 4, label: 'Subscribe', icon: Crown },
];

type DocType = 'profile_photo' | 'license_front' | 'license_back' | 'vehicle_registration' | 'insurance';

const DOCS: { key: DocType; label: string; aspect: [number, number] }[] = [
  { key: 'profile_photo', label: 'Profile Photo', aspect: [1, 1] },
  { key: 'license_front', label: 'License (Front)', aspect: [16, 10] },
  { key: 'license_back', label: 'License (Back)', aspect: [16, 10] },
  { key: 'vehicle_registration', label: 'Vehicle Registration', aspect: [16, 10] },
  { key: 'insurance', label: 'Insurance Proof', aspect: [16, 10] },
];

const PLANS = [
  { id: 'daily', name: 'Daily', price: 20, period: 'day', desc: 'Drive for the day, no commitment' },
  { id: 'weekly', name: 'Weekly', price: 100, period: 'week', desc: 'Save $40/wk vs daily' },
  { id: 'monthly', name: 'Monthly', price: 360, period: 'month', desc: 'Save $240/mo vs daily', best: true },
];

export default function OnboardingScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const stripe = useStripeConnect(user?.id);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 — Documents
  const [docs, setDocs] = useState<Record<DocType, string | null>>({
    profile_photo: null, license_front: null, license_back: null,
    vehicle_registration: null, insurance: null,
  });
  const [uploading, setUploading] = useState<DocType | null>(null);

  // Step 2 — Vehicle
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [hasVehicle, setHasVehicle] = useState(false);

  // Step 4 — Subscription
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    const [{ data: driver }, { data: vehicles }] = await Promise.all([
      supabase.from('drivers').select('documents, document_status, stripe_account_id, subscription_status').eq('id', user.id).single(),
      supabase.from('vehicles').select('id').eq('driver_id', user.id).limit(1),
    ]);

    if (driver?.documents) {
      setDocs((prev) => ({ ...prev, ...driver.documents }));
    }

    const vehicleExists = (vehicles?.length || 0) > 0;
    setHasVehicle(vehicleExists);

    const allDocsUploaded = DOCS.every((d) => driver?.documents?.[d.key]);
    if (!allDocsUploaded) setStep(1);
    else if (!vehicleExists) setStep(2);
    else if (!driver?.stripe_account_id) setStep(3);
    else setStep(4);

    setLoading(false);
  };

  // ─── Step 1: Document upload ───
  const pickDoc = async (docType: DocType, source: 'gallery' | 'camera') => {
    if (source === 'gallery') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    }

    const docMeta = DOCS.find((d) => d.key === docType)!;
    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: docMeta.aspect, quality: 0.8 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: docMeta.aspect, quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      await uploadDoc(docType, result.assets[0].uri);
    }
  };

  const uploadDoc = async (docType: DocType, uri: string) => {
    if (!user) return;
    setUploading(docType);
    try {
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${user.id}/${docType}.${ext}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `${docType}.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);

      const { error } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, formData, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

      if (error) { Alert.alert('Upload Failed', error.message); setUploading(null); return; }

      const { data: urlData } = supabase.storage.from('driver-documents').getPublicUrl(fileName);
      const newDocs = { ...docs, [docType]: urlData.publicUrl };
      setDocs(newDocs);
      await supabase.from('drivers').update({ documents: newDocs }).eq('id', user.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploading(null);
    }
  };

  const showDocPicker = (docType: DocType) => {
    Alert.alert('Upload', 'Choose source', [
      { text: 'Camera', onPress: () => pickDoc(docType, 'camera') },
      { text: 'Gallery', onPress: () => pickDoc(docType, 'gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const allDocsUploaded = DOCS.every((d) => docs[d.key]);

  // ─── Step 2: Add vehicle ───
  const handleAddVehicle = async () => {
    if (!make.trim() || !model.trim() || !year.trim() || !color.trim() || !plate.trim()) {
      Alert.alert('Error', 'Fill in all vehicle fields.'); return;
    }
    setSaving(true);
    try {
      await supabase.from('vehicles').insert({
        driver_id: user!.id, make: make.trim(), model: model.trim(),
        year: parseInt(year, 10), color: color.trim(),
        license_plate: plate.trim().toUpperCase(),
      });
      setHasVehicle(true);
      setStep(3);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Step 3: Stripe Connect ───
  const handleStripeConnect = async () => {
    await stripe.startOnboarding();
    const { data } = await supabase.from('drivers').select('stripe_account_id').eq('id', user!.id).single();
    if (data?.stripe_account_id) setStep(4);
  };

  // ─── Step 4: Subscribe (earnings-only, no card) ───
  const handleSubscribe = async (planId: string, price: number) => {
    setSubscribing(planId);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (planId === 'daily') periodEnd.setDate(periodEnd.getDate() + 1);
      else if (planId === 'weekly') periodEnd.setDate(periodEnd.getDate() + 7);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from('driver_subscriptions').insert({
        driver_id: user!.id, plan: planId, price, status: 'collecting',
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      });

      await supabase.from('drivers').update({
        subscription_status: 'collecting',
        subscription_target: price,
        subscription_collected: 0,
        subscription_expires_at: periodEnd.toISOString(),
        document_status: 'pending_review',
        documents_submitted_at: new Date().toISOString(),
      }).eq('id', user!.id);

      // Send confirmation email (don't block on failure)
      supabase.functions.invoke('send-driver-email', {
        body: { driver_id: user!.id, type: 'documents_submitted' },
      }).catch(() => {});

      navigation.replace('WaitingApproval');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={appColors.orange} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.signOutLink}
          onPress={() => Alert.alert('Sign Out', 'Go back to sign in?', [
            { text: 'Cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
          ])}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: t.textSecondary }]}>← Sign Out</Text>
        </TouchableOpacity>
        <Text style={[styles.logo, { color: appColors.orange }]}>styl</Text>
        <Text style={[styles.headerSub, { color: t.textSecondary }]}>Driver Setup</Text>
      </View>

      {/* Step indicators */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => {
          const done = s.num < step;
          const active = s.num === step;
          return (
            <View key={s.num} style={styles.stepItem}>
              <View style={[styles.stepCircle, {
                backgroundColor: done ? colors.success : active ? appColors.orange : t.cardBorder,
              }]}>
                {done ? (
                  <CheckCircle size={14} color="#FFF" strokeWidth={2.5} />
                ) : (
                  <Text style={styles.stepNum}>{s.num}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, {
                color: active ? appColors.orange : done ? colors.success : t.textSecondary,
              }]}>{s.label}</Text>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: done ? colors.success : t.cardBorder }]} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── STEP 1: Documents ─── */}
        {step === 1 && (
          <View>
            <Text style={[styles.title, { color: t.text }]}>Upload Your Documents</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>
              All documents are required before you can drive.
            </Text>

            {DOCS.map((doc) => {
              const uploaded = !!docs[doc.key];
              const isUploading = uploading === doc.key;
              return (
                <TouchableOpacity
                  key={doc.key}
                  style={[styles.docCard, { backgroundColor: t.card, borderColor: uploaded ? colors.success + '50' : t.cardBorder }]}
                  onPress={() => showDocPicker(doc.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.docRow}>
                    <View style={[styles.thumbWrap, { backgroundColor: uploaded ? colors.success + '10' : t.cardBorder + '30' }]}>
                      {isUploading ? (
                        <ActivityIndicator size="small" color={appColors.orange} />
                      ) : uploaded ? (
                        <Image source={{ uri: docs[doc.key]! }} style={styles.thumb} resizeMode="cover" />
                      ) : (
                        <Camera size={16} color={t.textSecondary} strokeWidth={1.5} />
                      )}
                    </View>
                    <Text style={[styles.docLabel, { color: t.text, flex: 1 }]}>{doc.label}</Text>
                    {uploaded ? (
                      <CheckCircle size={16} color={colors.success} strokeWidth={2} />
                    ) : (
                      <Upload size={16} color={t.textSecondary} strokeWidth={1.5} />
                    )}
                  </View>
                  {uploaded && (
                    <Image source={{ uri: docs[doc.key]! }} style={styles.docPreview} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: allDocsUploaded ? appColors.orange : t.cardBorder }]}
              onPress={() => allDocsUploaded && setStep(2)}
              disabled={!allDocsUploaded}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <ChevronRight size={16} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── STEP 2: Vehicle ─── */}
        {step === 2 && (
          <View>
            <Text style={[styles.title, { color: t.text }]}>Add Your Vehicle</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>
              Enter your vehicle details so riders know what to look for.
            </Text>

            {hasVehicle ? (
              <View style={[styles.doneCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                <CheckCircle size={18} color={colors.success} strokeWidth={2} />
                <Text style={[styles.doneText, { color: colors.success }]}>Vehicle added!</Text>
              </View>
            ) : (
              <View style={[styles.formCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                {[
                  { placeholder: 'Make (e.g. Toyota)', value: make, set: setMake },
                  { placeholder: 'Model (e.g. Camry)', value: model, set: setModel },
                  { placeholder: 'Year (e.g. 2022)', value: year, set: setYear, keyboardType: 'number-pad' as const, maxLength: 4 },
                  { placeholder: 'Color', value: color, set: setColor },
                  { placeholder: 'License Plate', value: plate, set: setPlate, autoCapitalize: 'characters' as const },
                ].map((f) => (
                  <TextInput
                    key={f.placeholder}
                    style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={t.textSecondary}
                    value={f.value}
                    onChangeText={f.set}
                    keyboardType={f.keyboardType}
                    maxLength={f.maxLength}
                    autoCapitalize={f.autoCapitalize}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: appColors.orange }, saving && { opacity: 0.7 }]}
                  onPress={handleAddVehicle}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Text style={styles.nextBtnText}>Save & Continue</Text>
                      <ChevronRight size={16} color="#FFF" strokeWidth={2} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {hasVehicle && (
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: appColors.orange }]}
                onPress={() => setStep(3)}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <ChevronRight size={16} color="#FFF" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── STEP 3: Stripe Connect (Payouts) ─── */}
        {step === 3 && (
          <View>
            <Text style={[styles.title, { color: t.text }]}>Set Up Payouts</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>
              Connect your bank account through Stripe to receive ride earnings.
            </Text>

            <View style={[styles.infoCard, { backgroundColor: appColors.orange + '08', borderColor: appColors.orange + '25' }]}>
              <Text style={[styles.infoText, { color: t.textSecondary }]}>
                You'll be taken to Stripe's secure page to enter your bank details. This takes about 2 minutes.
              </Text>
            </View>

            {stripe.accountId ? (
              <View style={[styles.doneCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                <CheckCircle size={18} color={colors.success} strokeWidth={2} />
                <Text style={[styles.doneText, { color: colors.success }]}>Payout account connected!</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: appColors.orange }, stripe.loading && { opacity: 0.7 }]}
              onPress={stripe.accountId ? () => setStep(4) : handleStripeConnect}
              disabled={stripe.loading}
              activeOpacity={0.85}
            >
              {stripe.loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Text style={styles.nextBtnText}>
                    {stripe.accountId ? 'Continue' : 'Connect Stripe'}
                  </Text>
                  <ChevronRight size={16} color="#FFF" strokeWidth={2} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── STEP 4: Choose Subscription (earnings-only) ─── */}
        {step === 4 && (
          <View>
            <Text style={[styles.title, { color: t.text }]}>Choose Your Plan</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>
              Your subscription is collected from your ride earnings. 60% of each fare goes toward your plan until fully paid — then you keep 100%.
            </Text>

            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: t.card, borderColor: plan.best ? appColors.orange : t.cardBorder },
                ]}
                onPress={() => handleSubscribe(plan.id, plan.price)}
                disabled={subscribing !== null}
                activeOpacity={0.8}
              >
                {plan.best && (
                  <View style={[styles.bestBadge, { backgroundColor: appColors.orange }]}>
                    <Text style={styles.bestText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: t.text }]}>{plan.name}</Text>
                    <Text style={[styles.planDesc, { color: t.textSecondary }]}>{plan.desc}</Text>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={[styles.planPrice, { color: appColors.orange }]}>
                      ${plan.price}
                    </Text>
                    <Text style={[styles.planPer, { color: t.textSecondary }]}>/{plan.period}</Text>
                  </View>
                  {subscribing === plan.id ? (
                    <ActivityIndicator color={appColors.orange} size="small" style={{ marginLeft: 10 }} />
                  ) : (
                    <ChevronRight size={18} color={t.textSecondary} strokeWidth={1.5} style={{ marginLeft: 6 }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <View style={[styles.infoCard, { backgroundColor: appColors.orange + '08', borderColor: appColors.orange + '25' }]}>
              <Text style={[styles.infoText, { color: t.textSecondary }]}>
                No card needed. Your subscription is automatically collected from your ride earnings. Once fully paid, you keep 100% of your fares for the rest of the period.
              </Text>
            </View>

            <Text style={[styles.note, { color: t.textSecondary }]}>
              After subscribing, your documents will be submitted for review. Our team will approve you within 24 hours.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Back button (steps 2+) */}
      {step > 1 && (
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: t.cardBorder }]}
          onPress={() => setStep((step - 1) as Step)}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, { color: t.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 8, position: 'relative' },
  signOutLink: { position: 'absolute', top: 54, left: 16, padding: 6 },
  signOutText: { fontSize: 12, fontWeight: '500' },
  logo: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNum: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stepLabel: { fontSize: 9, fontWeight: '500', marginTop: 4 },
  stepLine: { position: 'absolute', top: 14, right: -20, width: 40, height: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 12, lineHeight: 18, marginBottom: 20 },
  docCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbWrap: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  thumb: { width: 40, height: 40 },
  docLabel: { fontSize: 13, fontWeight: '600' },
  docPreview: { width: '100%', height: 120, borderRadius: 8, marginTop: 10 },
  formCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
  input: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  doneCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  doneText: { fontSize: 13, fontWeight: '600' },
  infoCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  infoText: { fontSize: 11, lineHeight: 16 },
  planCard: { borderRadius: 10, borderWidth: 1.5, padding: 16, marginBottom: 10, overflow: 'hidden' },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  planName: { fontSize: 15, fontWeight: '700' },
  planDesc: { fontSize: 11, marginTop: 1 },
  planRight: { alignItems: 'flex-end', marginLeft: 'auto' },
  planPrice: { fontSize: 20, fontWeight: '800' },
  planPer: { fontSize: 10, fontWeight: '400' },
  bestBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 3, borderBottomLeftRadius: 8 },
  bestText: { color: '#FFF', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  note: { fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 8 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: 10, gap: 6, marginTop: 8,
  },
  nextBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  backBtn: {
    position: 'absolute', bottom: 30, left: 16,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  backBtnText: { fontSize: 12, fontWeight: '500' },
});
