import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const USE_BACKEND = !!API_BASE;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [backendToken, setBackendToken] = useState(null);

  useEffect(() => {
    if (!USE_BACKEND) {
      setLoading(false);
      return;
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data);
        setBackendToken(token);
      })
      .catch(() => {
        localStorage.removeItem('backend_token');
        setBackendToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    return () => {};
  }, []);

  const login = async (email, password) => {
    if (!USE_BACKEND) {
      throw new Error('La app requiere el backend. Configurá VITE_API_URL (ej. URL de Render).');
    }
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    if (typeof localStorage !== 'undefined') localStorage.setItem('backend_token', data.token);
    setBackendToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('backend_token');
    setBackendToken(null);
    setUser(null);
  };

  const dataClient = USE_BACKEND && backendToken
    ? { _backend: true, apiBase: API_BASE, token: backendToken }
    : supabase;

  const permissions = user?.permissions || [];
  const canEditAlojamientos = user?.rol === 'admin' || permissions.includes('edit_alojamientos');
  const canEditRelevamientos = user?.rol === 'admin' || permissions.includes('edit_relevamiento');
  const canLaunchRelevamiento = user?.rol === 'admin' || permissions.includes('launch_relevamiento');
  const canManageUsers = user?.rol === 'admin' || permissions.includes('manage_users');
  const canViewInmobiliarias = user?.rol === 'admin' || permissions.includes('view_inmobiliarias');
  const canEditInmobiliarias = user?.rol === 'admin' || permissions.includes('edit_inmobiliarias');
  const canLaunchInmobiliarias = user?.rol === 'admin' || permissions.includes('launch_inmobiliarias');
  const canViewBalnearios = user?.rol === 'admin' || permissions.includes('view_balnearios');
  const canEditBalnearios = user?.rol === 'admin' || permissions.includes('edit_balnearios');
  const canLaunchBalnearios = user?.rol === 'admin' || permissions.includes('launch_balnearios');
  const isAdmin = user?.rol === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        login,
        logout,
        supabase,
        dataClient,
        canEditAlojamientos,
        canEditRelevamientos,
        canLaunchRelevamiento,
        canManageUsers,
        canViewInmobiliarias,
        canEditInmobiliarias,
        canLaunchInmobiliarias,
        canViewBalnearios,
        canEditBalnearios,
        canLaunchBalnearios,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
