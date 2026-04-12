import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function WelcomeScreen({ navigation }: any) {
  const { t, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.hero}>
        <View style={[styles.logoBox, { backgroundColor: colors.orange }]}>
          <Text style={styles.logoBoxText}>STYL</Text>
        </View>
        <Text style={[styles.brandName, { color: colors.orange }]}>STYL</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Drive on your terms
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.orange }]}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: colors.orange }]}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.8}
        >
          <Smartphone size={16} color={colors.orange} strokeWidth={2} />
          <Text style={[styles.buttonOutlineText, { color: colors.orange }]}>
            Continue with Phone
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.7}
        >
          <Text style={[styles.linkText, { color: t.textSecondary }]}>Already have an account? </Text>
          <Text style={[styles.linkBold, { color: colors.orange }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },
  hero: { alignItems: 'center', flex: 1, justifyContent: 'center', marginBottom: 20 },
  logoBox: { width: 72, height: 72, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  logoBoxText: { fontSize: 16, fontWeight: '500', color: '#FFFFFF', letterSpacing: 4 },
  brandName: { fontSize: 32, fontWeight: '400', letterSpacing: 10 },
  subtitle: { fontSize: 14, fontWeight: '400', marginTop: 6 },
  actions: { gap: 12 },
  button: { height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonOutline: {
    height: 50, borderRadius: 10, borderWidth: 1.5,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  buttonOutlineText: { fontSize: 14, fontWeight: '500' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, marginTop: 4 },
  linkText: { fontSize: 13, fontWeight: '400' },
  linkBold: { fontSize: 13, fontWeight: '600' },
});
