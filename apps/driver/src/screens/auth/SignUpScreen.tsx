import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { signUpWithEmail } from '../../services/auth';

export default function SignUpScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, fullName.trim());
      Alert.alert('Success', 'Check your email to confirm your account', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn') },
      ]);
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={t.text} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Join Styl and start driving</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Full Name"
            placeholderTextColor={t.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Email"
            placeholderTextColor={t.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={t.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.orange }, loading && styles.disabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('SignIn')}>
          <Text style={[styles.linkText, { color: t.textSecondary }]}>Already have an account? </Text>
          <Text style={[styles.linkBold, { color: colors.orange }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 56 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 14, marginLeft: -6 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, fontWeight: '400', marginTop: 4, marginBottom: 28 },
  form: { gap: 12 },
  input: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontWeight: '400' },
  button: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkText: { fontSize: 13, fontWeight: '400' },
  linkBold: { fontSize: 13, fontWeight: '600' },
});
