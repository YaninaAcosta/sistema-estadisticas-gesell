import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'relevamiento_token';
const USER_KEY = 'relevamiento_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiBase = import.meta.env.VITE_API_URL || '';
  const api = (path, options = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    return fetch(`${apiBase}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const saved = localStorage.getItem(USER_KEY);
    if (!token || !saved) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al iniciar sesión');
    }
    const { token, user: u } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    const meRes = await api('/auth/me');
    if (meRes.ok) {
      const fullUser = await meRes.json();
      setUser(fullUser);
      localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
      return fullUser;
    }
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const permissions = user?.permissions || [];
  const canEditAlojamientos = permissions.includes('edit_alojamientos');
  const canEditRelevamientos = permissions.includes('edit_relevamiento');
  const canLaunchRelevamiento = permissions.includes('launch_relevamiento');
  const canManageUsers = permissions.includes('manage_users');
  const canViewInmobiliarias = permissions.includes('view_inmobiliarias');
  const canEditInmobiliarias = permissions.includes('edit_inmobiliarias');
  const canLaunchInmobiliarias = permissions.includes('launch_inmobiliarias');
  const canViewBalnearios = permissions.includes('view_balnearios');
  const canEditBalnearios = permissions.includes('edit_balnearios');
  const canLaunchBalnearios = permissions.includes('launch_balnearios');
  const isAdmin = user?.rol === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        api,
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
