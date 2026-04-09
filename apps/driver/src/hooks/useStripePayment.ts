import { useState } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

const isExpoGo = Constants.appOwnership === 'expo';

// Dynamically import Stripe only in dev builds
let useStripeHook: () => any = () => ({
  initPaymentSheet: async () => ({ error: { message: 'Stripe not available in Expo Go' } }),
  presentPaymentSheet: async () => ({ error: { code: 'Unavailable', message: 'Use a development build to test Stripe' } }),
});

if (!isExpoGo) {
  try {
    const stripe = require('@stripe/stripe-react-native');
    useStripeHook = stripe.useStripe;
  } catch {}
}

export function useStripePayment(userId: string | undefined) {
  const { initPaymentSheet, presentPaymentSheet } = useStripeHook();
  const [loading, setLoading] = useState(false);

  const addCard = async (): Promise<boolean> => {
    if (!userId) return false;

    if (isExpoGo) {
      Alert.alert('Dev Build Required', 'Stripe Payment Sheet requires a development build. Card saving is not available in Expo Go.');
      return false;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-setup-intent', {
        body: { user_id: userId },
      });

      if (fnError || !data?.setup_intent_client_secret) {
        Alert.alert('Error', 'Could not initialize payment setup. Try again.');
        setLoading(false);
        return false;
      }

      const { error: initError } = await initPaymentSheet({
        customerId: data.customer_id,
        customerEphemeralKeySecret: data.ephemeral_key_secret,
        setupIntentClientSecret: data.setup_intent_client_secret,
        merchantDisplayName: 'Styl',
        style: 'automatic',
        returnURL: 'styl-driver://stripe-return',
      });

      if (initError) {
        console.error('Payment Sheet init error:', initError);
        Alert.alert('Error', 'Could not open payment form.');
        setLoading(false);
        return false;
      }

      const { error: presentError } = await presentPaymentSheet();
      setLoading(false);

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error', presentError.message);
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('addCard error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
      setLoading(false);
      return false;
    }
  };

  const fetchSavedCards = async () => {
    if (!userId) return [];
    try {
      const { data } = await supabase.functions.invoke('stripe-list-cards', {
        body: { user_id: userId },
      });
      return data?.cards || [];
    } catch {
      return [];
    }
  };

  return { addCard, fetchSavedCards, loading };
}
