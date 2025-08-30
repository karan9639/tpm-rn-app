
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('auth_token');
      const userJson = await AsyncStorage.getItem('user');
      if (token) setIsAuthenticated(true);
      if (userJson) setUser(JSON.parse(userJson));
      setIsLoading(false);
    })();
  }, []);

  const login = async ({ email, password }) => {
    const data = await api.login({ email, password });
    await AsyncStorage.setItem('auth_token', data?.token ?? '');
    await AsyncStorage.setItem('user', JSON.stringify(data?.user ?? null));
    setUser(data?.user ?? null);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    await AsyncStorage.multiRemove(['auth_token','user']);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
