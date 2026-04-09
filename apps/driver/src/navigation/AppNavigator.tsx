import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator';
import RideFlowNavigator from './RideFlowNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import WaitingApprovalScreen from '../screens/onboarding/WaitingApprovalScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import RideHistoryScreen from '../screens/shared/RideHistoryScreen';
import VehicleManageScreen from '../screens/profile/VehicleManageScreen';
import SubscriptionScreen from '../screens/profile/SubscriptionScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import HelpScreen from '../screens/shared/HelpScreen';
import InboxScreen from '../screens/shared/InboxScreen';
import SupportChatScreen from '../screens/shared/SupportChatScreen';
import RateCardScreen from '../screens/shared/RateCardScreen';
import LicenseScreen from '../screens/shared/LicenseScreen';
import DocumentsScreen from '../screens/shared/DocumentsScreen';
import ReferralScreen from '../screens/shared/ReferralScreen';
import { ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { reopenDrawer } from './drawerRef';
import { supabase } from '../services/supabase';

const Stack = createStackNavigator();

type DriverState = 'loading' | 'onboarding' | 'waiting' | 'approved';

export default function AppNavigator() {
  const { session, loading, user } = useAuth();
  const { t } = useTheme();
  const [driverState, setDriverState] = useState<DriverState>('loading');

  useEffect(() => {
    if (!user) { setDriverState('loading'); return; }
    checkDriverState();
  }, [user]);

  const checkDriverState = async () => {
    if (!user) return;

    const { data: driver } = await supabase
      .from('drivers')
      .select('is_approved, document_status, subscription_status, stripe_account_id, documents')
      .eq('id', user.id)
      .single();

    if (!driver) {
      // No driver record yet — create one and show onboarding
      await supabase.from('drivers').insert({ id: user.id });
      setDriverState('onboarding');
      return;
    }

    // Already approved — go to main app
    if (driver.is_approved) {
      setDriverState('approved');
      return;
    }

    // Documents submitted, waiting for review
    if (driver.document_status === 'pending_review') {
      setDriverState('waiting');
      return;
    }

    // Everything else (new, rejected, incomplete) — show onboarding
    setDriverState('onboarding');
  };

  if (loading || (session && driverState === 'loading')) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  const screenOptions = {
    headerShown: true,
    headerBackTitle: 'Back',
    headerStyle: { backgroundColor: t.background },
    headerTintColor: t.text,
    headerTitleStyle: { fontSize: 15, fontWeight: '700' as const },
  };

  const drawerScreenOptions = (title: string) => ({
    ...screenOptions,
    headerTitle: title,
    headerLeft: ({ onPress }: any) => (
      <TouchableOpacity
        onPress={() => { onPress?.(); setTimeout(reopenDrawer, 100); }}
        style={{ paddingLeft: 12, paddingRight: 8, paddingVertical: 8 }}
        activeOpacity={0.7}
      >
        <ArrowLeft size={20} color={t.text} strokeWidth={2} />
      </TouchableOpacity>
    ),
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : driverState === 'onboarding' ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
            <Stack.Screen name="Main" component={HomeNavigator} />
          </>
        ) : driverState === 'waiting' ? (
          <>
            <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Main" component={HomeNavigator} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeNavigator} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
            <Stack.Screen name="RideFlow" component={RideFlowNavigator} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Earnings" component={EarningsScreen} options={drawerScreenOptions('Earnings')} />
            <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={drawerScreenOptions('Ride History')} />
            <Stack.Screen name="VehicleManage" component={VehicleManageScreen} options={drawerScreenOptions('Vehicles')} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={drawerScreenOptions('Subscription')} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={drawerScreenOptions('Profile')} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={drawerScreenOptions('Settings')} />
            <Stack.Screen name="Help" component={HelpScreen} options={drawerScreenOptions('Help & Support')} />
            <Stack.Screen name="Inbox" component={InboxScreen} options={drawerScreenOptions('Inbox')} />
            <Stack.Screen name="SupportChat" component={SupportChatScreen} options={drawerScreenOptions('Support')} />
            <Stack.Screen name="RateCard" component={RateCardScreen} options={drawerScreenOptions('My Rate Card')} />
            <Stack.Screen name="License" component={LicenseScreen} options={drawerScreenOptions("Driver's License")} />
            <Stack.Screen name="Documents" component={DocumentsScreen} options={drawerScreenOptions('My Documents')} />
            <Stack.Screen name="ReferRider" component={ReferralScreen} options={drawerScreenOptions('Refer a Rider')} initialParams={{ type: 'rider' }} />
            <Stack.Screen name="ReferDriver" component={ReferralScreen} options={drawerScreenOptions('Refer a Driver')} initialParams={{ type: 'driver' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
