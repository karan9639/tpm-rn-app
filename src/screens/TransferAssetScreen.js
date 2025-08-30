
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as api from '../services/api';

export default function TransferAssetScreen() {
  const [assetId, setAssetId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setMsg('');
    if (!assetId || !locationId) { setMsg('Asset ID and Location ID are required'); return; }
    setLoading(true);
    try {
      await api.change_asset_location({ assetId, locationId, remark });
      setMsg('Location changed successfully');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transfer Asset</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <TextInput placeholder="Asset ID" value={assetId} onChangeText={setAssetId} style={styles.input} />
      <TextInput placeholder="Location ID" value={locationId} onChangeText={setLocationId} style={styles.input} />
      <TextInput placeholder="Remark (optional)" value={remark} onChangeText={setRemark} style={styles.input} />
      <TouchableOpacity onPress={submit} style={styles.btn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Transferring...' : 'Transfer'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16 },
  title: { fontSize:20, fontWeight:'700', marginBottom:12 },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:12 },
  btn: { backgroundColor:'#111827', padding:14, borderRadius:8, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' },
  msg: { textAlign:'center', marginBottom:8 }
});
