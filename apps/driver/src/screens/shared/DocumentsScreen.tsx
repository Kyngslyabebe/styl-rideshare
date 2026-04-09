import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import {
  Upload, Camera, CheckCircle, Clock, FileText, Send,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { colors as appColors } from '../../theme/colors';

type DocType = 'profile_photo' | 'license_front' | 'license_back' | 'vehicle_registration' | 'insurance';

interface DocItem {
  key: DocType;
  label: string;
  description: string;
  required: boolean;
}

const DOCUMENTS: DocItem[] = [
  { key: 'profile_photo', label: 'Profile Photo', description: 'Clear headshot for your driver profile', required: true },
  { key: 'license_front', label: "Driver's License (Front)", description: 'Front side of your valid driver\'s license', required: true },
  { key: 'license_back', label: "Driver's License (Back)", description: 'Back side of your driver\'s license', required: true },
  { key: 'vehicle_registration', label: 'Vehicle Registration', description: 'Current vehicle registration document', required: true },
  { key: 'insurance', label: 'Insurance Proof', description: 'Valid auto insurance certificate', required: true },
];

export default function DocumentsScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Record<DocType, string | null>>({
    profile_photo: null,
    license_front: null,
    license_back: null,
    vehicle_registration: null,
    insurance: null,
  });
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null); // null | 'pending_review' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('drivers')
      .select('documents, document_status')
      .eq('id', user.id)
      .single();

    if (data?.documents) {
      setUploads((prev) => ({ ...prev, ...data.documents }));
    }
    setSubmissionStatus(data?.document_status || null);
    setLoading(false);
  };

  const pickImage = async (docType: DocType, source: 'gallery' | 'camera') => {
    if (submissionStatus === 'pending_review') {
      Alert.alert('Under Review', 'Your documents are being reviewed. You cannot upload new files until the review is complete.');
      return;
    }

    if (source === 'gallery') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to upload documents.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to photograph documents.');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: docType === 'profile_photo' ? [1, 1] : [16, 10],
      quality: 0.8,
    };

    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync(options)
      : await ImagePicker.launchCameraAsync(options);

    if (!result.canceled && result.assets[0]) {
      await uploadDocument(docType, result.assets[0].uri);
    }
  };

  const uploadDocument = async (docType: DocType, uri: string) => {
    if (!user) return;
    setUploading(docType);

    try {
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${docType}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        setUploading(null);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(fileName);

      const newUploads = { ...uploads, [docType]: urlData.publicUrl };
      setUploads(newUploads);

      // Save to drivers table
      await supabase.from('drivers').update({
        documents: newUploads,
      }).eq('id', user.id);

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const allRequiredUploaded = DOCUMENTS.filter((d) => d.required).every((d) => uploads[d.key]);

  const handleSubmitAll = async () => {
    if (!user) return;
    if (!allRequiredUploaded) {
      Alert.alert('Missing Documents', 'Please upload all required documents before submitting.');
      return;
    }

    Alert.alert(
      'Submit Documents',
      'Submit all documents for review? You won\'t be able to change them until the review is complete.',
      [
        { text: 'Cancel' },
        {
          text: 'Submit', onPress: async () => {
            setSubmitting(true);
            try {
              await supabase.from('drivers').update({
                document_status: 'pending_review',
                documents_submitted_at: new Date().toISOString(),
              }).eq('id', user.id);

              // Send confirmation email
              await supabase.functions.invoke('send-driver-email', {
                body: { driver_id: user.id, type: 'documents_submitted' },
              });

              setSubmissionStatus('pending_review');
              Alert.alert(
                'Documents Submitted',
                'Your documents have been submitted for review. Our support team will review and provide an update within 24 hours. You\'ll receive a confirmation email shortly.',
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not submit documents');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const showUploadOptions = (docType: DocType) => {
    Alert.alert('Upload Document', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage(docType, 'camera') },
      { text: 'Photo Library', onPress: () => pickImage(docType, 'gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={appColors.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Status banner */}
      {submissionStatus === 'pending_review' && (
        <View style={[styles.banner, { backgroundColor: appColors.orange + '15', borderColor: appColors.orange + '40' }]}>
          <Clock size={14} color={appColors.orange} strokeWidth={2} />
          <Text style={[styles.bannerText, { color: appColors.orange }]}>
            Documents under review. Our team will get back to you within 24 hours.
          </Text>
        </View>
      )}
      {submissionStatus === 'approved' && (
        <View style={[styles.banner, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
          <CheckCircle size={14} color={colors.success} strokeWidth={2} />
          <Text style={[styles.bannerText, { color: colors.success }]}>
            Documents approved! You're all set to drive.
          </Text>
        </View>
      )}
      {submissionStatus === 'rejected' && (
        <View style={[styles.banner, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
          <FileText size={14} color={colors.error} strokeWidth={2} />
          <Text style={[styles.bannerText, { color: colors.error }]}>
            Some documents were rejected. Please re-upload and submit again.
          </Text>
        </View>
      )}

      {/* Instructions */}
      <Text style={[styles.instructions, { color: t.textSecondary }]}>
        Upload all required documents below. Once submitted, our support team will review and approve within 24 hours.
      </Text>

      {/* Document cards */}
      {DOCUMENTS.map((doc) => {
        const uploaded = !!uploads[doc.key];
        const isUploading = uploading === doc.key;
        const locked = submissionStatus === 'pending_review';

        return (
          <TouchableOpacity
            key={doc.key}
            style={[
              styles.docCard,
              { backgroundColor: t.card, borderColor: uploaded ? colors.success + '50' : t.cardBorder },
            ]}
            onPress={() => !locked && showUploadOptions(doc.key)}
            activeOpacity={locked ? 1 : 0.7}
          >
            <View style={styles.docRow}>
              {/* Thumbnail or placeholder */}
              <View style={[
                styles.thumbWrap,
                { backgroundColor: uploaded ? colors.success + '10' : t.cardBorder + '30' },
              ]}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={appColors.orange} />
                ) : uploaded ? (
                  <Image source={{ uri: uploads[doc.key]! }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <Upload size={16} color={t.textSecondary} strokeWidth={1.5} />
                )}
              </View>

              {/* Info */}
              <View style={styles.docInfo}>
                <View style={styles.labelRow}>
                  <Text style={[styles.docLabel, { color: t.text }]}>{doc.label}</Text>
                  {doc.required && <Text style={[styles.requiredBadge, { color: colors.error }]}>Required</Text>}
                </View>
                <Text style={[styles.docDesc, { color: t.textSecondary }]}>{doc.description}</Text>
              </View>

              {/* Status icon */}
              {uploaded ? (
                <CheckCircle size={16} color={colors.success} strokeWidth={2} />
              ) : (
                <Camera size={16} color={t.textSecondary} strokeWidth={1.5} />
              )}
            </View>

            {/* Image preview when uploaded */}
            {uploaded && (
              <Image
                source={{ uri: uploads[doc.key]! }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: t.textSecondary }]}>
          {DOCUMENTS.filter((d) => uploads[d.key]).length} of {DOCUMENTS.length} uploaded
        </Text>
        <View style={[styles.progressBar, { backgroundColor: t.cardBorder }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: allRequiredUploaded ? colors.success : appColors.orange,
                width: `${(DOCUMENTS.filter((d) => uploads[d.key]).length / DOCUMENTS.length) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Submit button */}
      {submissionStatus !== 'pending_review' && submissionStatus !== 'approved' && (
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: allRequiredUploaded ? appColors.orange : t.cardBorder },
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmitAll}
          disabled={!allRequiredUploaded || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Send size={14} color="#FFF" strokeWidth={2} />
              <Text style={styles.submitBtnText}>Submit All Documents</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={[styles.note, { color: t.textSecondary }]}>
        All documents are stored securely and only viewed by our support team during the approval process.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerText: { fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 16 },
  instructions: { fontSize: 11, lineHeight: 16, marginBottom: 16 },
  docCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  thumb: { width: 44, height: 44 },
  docInfo: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docLabel: { fontSize: 13, fontWeight: '600' },
  requiredBadge: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  docDesc: { fontSize: 10, marginTop: 2 },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 10,
  },
  progressRow: { marginTop: 6, marginBottom: 16 },
  progressText: { fontSize: 10, fontWeight: '500', marginBottom: 6 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  submitBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  note: { fontSize: 9, textAlign: 'center', marginTop: 4, lineHeight: 14 },
});
