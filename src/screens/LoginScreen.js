
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    try { await login({ email, password }); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TPM Login</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <View style={styles.row}>
        <TextInput style={[styles.input,{flex:1}]} placeholder="Password" secureTextEntry={!show} value={password} onChangeText={setPassword} />
        <TouchableOpacity onPress={() => setShow(!show)} style={styles.eye}><Text>{show?'🙈':'👁️'}</Text></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onSubmit} style={styles.btn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:24, justifyContent:'center' },
  title: { fontSize:28, fontWeight:'700', marginBottom:24, textAlign:'center' },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:12 },
  row: { flexDirection:'row', alignItems:'center' },
  eye: { padding:12, borderWidth:1, borderColor:'#ddd', borderRadius:8, marginLeft:8 },
  btn: { backgroundColor:'#111827', padding:14, borderRadius:8, alignItems:'center', marginTop:4 },
  btnText: { color:'#fff', fontWeight:'700' },
  error: { color:'#b00020', marginBottom:8, textAlign:'center' }
});
