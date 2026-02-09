import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from './supabase.js';

const AuthContext = createContext(null);

function parseOficina(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'string' && val.startsWith('[')) {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : [val];
    } catch (_) { return [val]; }
  }
  return val;
}

async function fetchProfileAndPermissions(userId) {
  const { data: profile, error: e1 } = await supabase
    .from('profiles')
    .select('id, email, nombre, rol, oficina')
    .eq('id', userId)
    .single();
  if (e1 || !profile) return null;
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('rol', profile.rol);
  const permissions = (perms || []).map((r) => r.permission);
  return {
    ...profile,
    oficina: parseOficina(profile.oficina),
    permissions,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    let cancelled = false;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session?.user) return;
        return fetchProfileAndPermissions(session.user.id)
          .then(setUser)
          .catch(() => setUser(null));
      })
      .catch(() => {})
      .finally(() => {
        cancelled = true;
        window.clearTimeout(timeout);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (session?.user) {
        const u = await fetchProfileAndPermissions(session.user.id);
        setUser(u);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Error al iniciar sesión');
    const fullUser = await fetchProfileAndPermissions(data.user.id);
    if (!fullUser) {
      await supabase.auth.signOut();
      throw new Error('No se encontró tu perfil. Ejecutá en Supabase (SQL Editor) el INSERT en la tabla profiles con tu User UID de Authentication → Users.');
    }
    setUser(fullUser);
    return fullUser;
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
  };

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
        login,
        logout,
        supabase,
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
