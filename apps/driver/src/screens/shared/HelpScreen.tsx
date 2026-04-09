import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

const FAQ_ITEMS = [
  {
    question: 'How do I start driving?',
    answer: 'Go online by tapping Drive Now on the home screen.',
  },
  {
    question: 'How do I get paid?',
    answer: 'Earnings are deposited to your Stripe account weekly, or use Instant Payout.',
  },
  {
    question: 'What if a rider cancels?',
    answer: "You'll be notified and can accept new rides immediately.",
  },
  {
    question: 'How does the subscription work?',
    answer: 'Pay $100/week or $360/month for platform access. You keep 100% of every fare.',
  },
];

export default function HelpScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (index: number) => {
    setExpanded(expanded === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@stylride.com');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>FAQ</Text>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {FAQ_ITEMS.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />}
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() => toggle(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.faqQuestion, { color: t.text }]}>{item.question}</Text>
              {expanded === index ? (
                <ChevronUp size={14} color={t.textSecondary} strokeWidth={1.5} />
              ) : (
                <ChevronDown size={14} color={t.textSecondary} strokeWidth={1.5} />
              )}
            </TouchableOpacity>
            {expanded === index && (
              <Text style={[styles.faqAnswer, { color: t.textSecondary }]}>{item.answer}</Text>
            )}
          </React.Fragment>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.orange }]}
        onPress={handleContactSupport}
        activeOpacity={0.7}
      >
        <Mail size={14} color="#FFFFFF" strokeWidth={1.5} />
        <Text style={styles.contactText}>Contact Support</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  faqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  faqQuestion: { fontSize: 12, fontWeight: '500', flex: 1, marginRight: 8 },
  faqAnswer: { fontSize: 11, fontWeight: '400', lineHeight: 16, paddingBottom: 10 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 40,
  },
  contactText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
