
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import * as api from '../services/api';

export default function MaintenanceRequestsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get_maintenance_requests();
      setItems(Array.isArray(data) ? data : (data?.requests || []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{flex:1, padding:16}}>
      <FlatList
        data={items}
        keyExtractor={(it, idx) => String(it?.id || it?._id || idx)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({item}) => (
          <View style={{ padding:12, borderWidth:1, borderColor:'#eee', borderRadius:8, marginBottom:12 }}>
            <Text style={{ fontWeight:'700' }}>{item?.title || 'Maintenance Request'}</Text>
            <Text>{item?.status || ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop:24}}>No maintenance requests</Text>}
      />
    </View>
  );
}
