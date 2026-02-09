import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'relevamiento-gesell-secret-local';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function findUserByEmail(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findUserById(id) {
  const { data, error } = await supabase.from('users').select('id, email, nombre, rol, oficina').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export const PERMISSIONS = [
  { key: 'view_relevamiento', label: 'Ver relevamiento' },
  { key: 'edit_relevamiento', label: 'Editar relevamiento' },
  { key: 'view_alojamientos', label: 'Ver alojamientos' },
  { key: 'edit_alojamientos', label: 'Editar alojamientos' },
  { key: 'launch_relevamiento', label: 'Lanzar relevamiento' },
  { key: 'manage_users', label: 'Gestionar usuarios y permisos' },
  { key: 'view_inmobiliarias', label: 'Ver inmobiliarias' },
  { key: 'edit_inmobiliarias', label: 'Editar inmobiliarias' },
  { key: 'launch_inmobiliarias', label: 'Lanzar relevamiento inmobiliarias' },
  { key: 'view_balnearios', label: 'Ver balnearios' },
  { key: 'edit_balnearios', label: 'Editar balnearios' },
  { key: 'launch_balnearios', label: 'Lanzar relevamiento balnearios' },
];

export async function getPermissionsForRole(rol) {
  const { data, error } = await supabase.from('role_permissions').select('permission').eq('rol', rol);
  if (error) throw error;
  return (data || []).map((r) => r.permission);
}

export async function setPermissionsForRole(rol, permissions) {
  await supabase.from('role_permissions').delete().eq('rol', rol);
  if (!permissions?.length) return;
  const rows = permissions.map((permission) => ({ rol, permission }));
  const { error } = await supabase.from('role_permissions').insert(rows);
  if (error) throw error;
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (req.user.rol === 'admin') return next();
      const perms = await getPermissionsForRole(req.user.rol);
      if (!perms.includes(permission)) {
        return res.status(403).json({ error: 'Sin permiso para esta acción' });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  req.user = payload;
  next();
}

export function requireRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permiso para esta acción' });
    }
    next();
  };
}
