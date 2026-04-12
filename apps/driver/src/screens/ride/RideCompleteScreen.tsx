import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import RideCompleteModal from '../../components/RideCompleteModal';

const QUEUED_RIDE_KEY = 'styl_queued_ride';

export default function RideCompleteScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t } = useTheme();
  const [visible, setVisible] = useState(true);

  const handleClose = async () => {
    setVisible(false);

    // Check for a queued en-route ride
    const queuedRideId = await AsyncStorage.getItem(QUEUED_RIDE_KEY);
    if (queuedRideId) {
      await AsyncStorage.removeItem(QUEUED_RIDE_KEY);
      navigation.replace('EnRouteToPickup', { rideId: queuedRideId });
      return;
    }

    navigation.popToTop();
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <RideCompleteModal visible={visible} rideId={rideId} onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
