import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { FileText, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

export default function LicenseScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('drivers')
        .select('license_number, license_expiry, license_image_url')
        .eq('id', user.id)
        .single();
      setDriver(data);
      if (data?.license_number) setLicenseNumber(data.license_number);
      if (data?.license_expiry) setLicenseExpiry(data.license_expiry);
      if (data?.license_image_url) setImageUri(data.license_image_url);
      setLoading(false);
    })();
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload your license.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to photograph your license.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Enter your license number.');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = driver?.license_image_url || null;

      // Upload image if it's a local URI (not already a URL)
      if (imageUri && !imageUri.startsWith('http')) {
        const ext = imageUri.split('.').pop() || 'jpg';
        const fileName = `${user.id}/license.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('driver-documents')
          .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

        if (uploadError) {
          console.warn('Upload error:', uploadError.message);
          // Still save the license info even if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('driver-documents')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      await supabase.from('drivers').update({
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry.trim() || null,
        license_image_url: imageUrl,
      }).eq('id', user.id);

      Alert.alert('Saved', 'License info updated.');
      setDriver({ ...driver, license_number: licenseNumber.trim(), license_expiry: licenseExpiry.trim(), license_image_url: imageUrl });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Image preview / upload area */}
      <TouchableOpacity
        style={[styles.imageArea, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={pickImage}
        activeOpacity={0.7}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.licenseImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Upload size={24} color={t.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.placeholderText, { color: t.textSecondary }]}>Tap to upload license photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.photoActions}>
        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: t.card, borderColor: t.cardBorder }]} onPress={pickImage}>
          <Upload size={14} color={t.text} strokeWidth={1.8} />
          <Text style={[styles.photoBtnText, { color: t.text }]}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: t.card, borderColor: t.cardBorder }]} onPress={takePhoto}>
          <Camera size={14} color={t.text} strokeWidth={1.8} />
          <Text style={[styles.photoBtnText, { color: t.text }]}>Camera</Text>
        </TouchableOpacity>
      </View>

      {/* License info form */}
      <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>License Number</Text>
      <TextInput
        style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
        placeholder="e.g. D123-4567-8900"
        placeholderTextColor={t.textSecondary}
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        autoCapitalize="characters"
      />

      <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Expiry Date</Text>
      <TextInput
        style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
        placeholder="MM/DD/YYYY"
        placeholderTextColor={t.textSecondary}
        value={licenseExpiry}
        onChangeText={setLicenseExpiry}
        keyboardType="numbers-and-punctuation"
      />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.orange }, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save License</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  imageArea: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 10,
  },
  licenseImage: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  placeholderText: { fontSize: 11, fontWeight: '400' },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoBtnText: { fontSize: 11, fontWeight: '500' },
  fieldLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginLeft: 2 },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 14,
  },
  saveBtn: { height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4, marginBottom: 40 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
