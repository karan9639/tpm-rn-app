
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import Tabs from './Tabs';
import AssetDetailsScreen from '../screens/AssetDetailsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="AssetDetails" component={AssetDetailsScreen} options={{ title: 'Asset Details' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
