import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';

interface StripeStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  loading: boolean;
}

export function useStripeConnect(driverId: string | undefined) {
  const [status, setStatus] = useState<StripeStatus>({
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    onboardingComplete: false,
    loading: true,
  });

  // Load account ID from DB, then check Stripe status if account exists
  useEffect(() => {
    if (!driverId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('stripe_account_id')
          .eq('id', driverId)
          .single();

        const accountId = data?.stripe_account_id || null;

        if (accountId) {
          // Check live status from Stripe
          const { data: stripeData } = await supabase.functions.invoke('stripe-connect-status', {
            body: { account_id: accountId },
          });

          setStatus({
            accountId,
            chargesEnabled: stripeData?.charges_enabled || false,
            payoutsEnabled: stripeData?.payouts_enabled || false,
            onboardingComplete: stripeData?.details_submitted || false,
            loading: false,
          });
        } else {
          setStatus((prev) => ({ ...prev, accountId: null, loading: false }));
        }
      } catch {
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, [driverId]);

  const startOnboarding = async () => {
    if (!driverId) return;
    setStatus((prev) => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { driver_id: driverId },
      });

      if (error) {
        let errorMsg = 'Setup failed. Please try again.';
        try {
          const body = await error.context.json();
          errorMsg = body?.error || errorMsg;
        } catch {
          // Ignore HTML or non-JSON error bodies
        }
        errorMsg = String(errorMsg).replace(/<[^>]*>/g, '').trim() || 'Setup failed';
        Alert.alert('Stripe Setup Error', errorMsg);
        setStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (!data?.url) {
        const errText = typeof data === 'string' ? '' : data?.error;
        Alert.alert('Stripe Setup Error', errText || 'No onboarding URL returned');
        setStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Open Stripe onboarding in browser
      await WebBrowser.openBrowserAsync(data.url);

      // Browser closed — check live account status from Stripe
      const accountId = data.account_id;
      const { data: refreshed } = await supabase
        .from('drivers')
        .select('stripe_account_id')
        .eq('id', driverId)
        .single();

      const finalAccountId = refreshed?.stripe_account_id || accountId;

      if (finalAccountId) {
        const { data: stripeData } = await supabase.functions.invoke('stripe-connect-status', {
          body: { account_id: finalAccountId },
        });

        setStatus({
          accountId: finalAccountId,
          chargesEnabled: stripeData?.charges_enabled || false,
          payoutsEnabled: stripeData?.payouts_enabled || false,
          onboardingComplete: stripeData?.details_submitted || false,
          loading: false,
        });
      } else {
        setStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Stripe onboarding failed:', err);
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const openDashboard = async () => {
    if (!status.accountId) return;

    try {
      const { data } = await supabase.functions.invoke('stripe-connect-dashboard', {
        body: { account_id: status.accountId },
      });

      if (data?.url) {
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (err) {
      console.error('Dashboard open failed:', err);
    }
  };

  return { ...status, startOnboarding, openDashboard };
}
