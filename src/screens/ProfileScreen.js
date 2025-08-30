
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={{flex:1, padding:16}}>
      <Text style={{ fontSize:18, fontWeight:'700' }}>Profile</Text>
      <Text>{JSON.stringify(user, null, 2)}</Text>
      <TouchableOpacity onPress={logout} style={{ backgroundColor:'#ef4444', padding:12, borderRadius:8, marginTop:16, alignItems:'center' }}>
        <Text style={{color:'#fff', fontWeight:'700'}}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
