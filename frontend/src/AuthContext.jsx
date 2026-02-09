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

const RPC_TIMEOUT_MS = 4500;
const LOGIN_TIMEOUT_MS = 18000;

function timeoutPromise(ms, message = 'TIMEOUT') {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error(message)), ms)
  );
}

async function fetchProfileAndPermissions() {
  const { data: raw, error } = await supabase.rpc('get_my_profile_with_permissions');
  if (error || raw == null) {
    return null;
  }
  const profile = {
    id: raw.id,
    email: raw.email,
    nombre: raw.nombre,
    rol: raw.rol,
    oficina: parseOficina(raw.oficina),
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  };
  return profile;
}

async function fetchProfileAndPermissionsFallback(userId) {
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
  const [authError, setAuthError] = useState(null);

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
        return fetchProfileAndPermissions()
          .then((u) => u != null ? setUser(u) : fetchProfileAndPermissionsFallback(session.user.id).then(setUser))
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
        const u = await fetchProfileAndPermissions() ?? await fetchProfileAndPermissionsFallback(session.user.id);
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
    const doLogin = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message || 'Error al iniciar sesión');

      const stubUser = {
        id: data.user.id,
        email: data.user.email ?? '',
        nombre: 'Cargando…',
        rol: 'viewer',
        oficina: null,
        permissions: [],
        _loadingProfile: true,
      };
      setUser(stubUser);

      const loadProfile = async () => {
        let fullUser = null;
        try {
          fullUser = await Promise.race([
            fetchProfileAndPermissions(),
            timeoutPromise(RPC_TIMEOUT_MS),
          ]);
        } catch (_) {}
        if (fullUser == null) {
          fullUser = await fetchProfileAndPermissionsFallback(data.user.id);
        }
        if (!fullUser) {
          await supabase.auth.signOut();
          setUser(null);
          setAuthError('No se encontró tu perfil. Revisá en Supabase que exista el registro en la tabla profiles.');
          return;
        }
        setAuthError(null);
        setUser(fullUser);
      };
      loadProfile();

      return stubUser;
    };

    return await Promise.race([
      doLogin(),
      timeoutPromise(LOGIN_TIMEOUT_MS, 'La conexión está tardando mucho. Revisá tu internet e intentá de nuevo.'),
    ]);
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
        authError,
        clearAuthError: () => setAuthError(null),
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
