
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AssetsScreen from '../screens/AssetsScreen';
import MaintenanceRequestsScreen from '../screens/MaintenanceRequestsScreen';
import TransferAssetScreen from '../screens/TransferAssetScreen';
import UpdateProcessScreen from '../screens/UpdateProcessScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AssetsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AssetsHome" component={AssetsScreen} options={{ title: 'Assets' }} />
    </Stack.Navigator>
  );
}

export default function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Assets" component={AssetsStack} />
      <Tab.Screen name="Maintenance" component={MaintenanceRequestsScreen} />
      <Tab.Screen name="Transfer" component={TransferAssetScreen} />
      <Tab.Screen name="UpdateProcess" component={UpdateProcessScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
