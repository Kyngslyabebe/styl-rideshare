import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import RideCompleteModal from '../../components/RideCompleteModal';

export default function RideCompleteScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t } = useTheme();
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
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
