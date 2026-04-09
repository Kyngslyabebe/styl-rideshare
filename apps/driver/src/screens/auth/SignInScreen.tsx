import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { signInWithEmail, resetPassword } from '../../services/auth';

export default function SignInScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Enter your email first');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('Email Sent', 'Check your inbox for a password reset link');
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
        <Text style={[styles.title, { color: t.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Sign in to start driving</Text>

        <View style={styles.form}>
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
            placeholder="Password"
            placeholderTextColor={t.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={[styles.forgotText, { color: colors.orange }]}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.orange }, loading && styles.disabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.phoneLink} onPress={() => {}} activeOpacity={0.7}>
          <Text style={[styles.phoneLinkText, { color: colors.orange }]}>Sign in with phone number</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('SignUp')}>
          <Text style={[styles.linkText, { color: t.textSecondary }]}>Don't have an account? </Text>
          <Text style={[styles.linkBold, { color: colors.orange }]}>Sign Up</Text>
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
  forgotText: { fontSize: 12, fontWeight: '500', textAlign: 'right' },
  button: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  phoneLink: { alignItems: 'center', marginTop: 12 },
  phoneLinkText: { fontSize: 13, fontWeight: '500' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkText: { fontSize: 13, fontWeight: '400' },
  linkBold: { fontSize: 13, fontWeight: '600' },
});
