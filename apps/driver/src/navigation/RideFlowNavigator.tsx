import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AcceptRideScreen from '../screens/ride/AcceptRideScreen';
import EnRouteToPickupScreen from '../screens/ride/EnRouteToPickupScreen';
import ConfirmPickupScreen from '../screens/ride/ConfirmPickupScreen';
import DropOffScreen from '../screens/ride/DropOffScreen';
import RideCompleteScreen from '../screens/ride/RideCompleteScreen';

const Stack = createStackNavigator();

export default function RideFlowNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="AcceptRide" component={AcceptRideScreen} />
      <Stack.Screen name="EnRouteToPickup" component={EnRouteToPickupScreen} />
      <Stack.Screen name="ConfirmPickup" component={ConfirmPickupScreen} />
      <Stack.Screen name="DropOff" component={DropOffScreen} />
      <Stack.Screen name="RideComplete" component={RideCompleteScreen} />
    </Stack.Navigator>
  );
}
