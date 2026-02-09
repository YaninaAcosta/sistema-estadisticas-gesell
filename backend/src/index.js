import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware, requirePermission, getPermissionsForRole, PERMISSIONS, setPermissionsForRole } from './auth.js';
import { supabase } from './supabase.js';

const OFICINAS_OPTIONS = ['Centro', 'Mar de las Pampas', 'Norte', 'Terminal'];

const CATEGORIAS_CANONICAL = [
  'Sin categorizar', 'Hotel', 'Hotel 1*', 'Hotel 2*', 'Hotel 3*',
  'Apart Hotel', 'Hostería 2*', 'Departamentos con servicios',
];
function normalizeCategoria(val) {
  if (val == null || val === '') return null;
  const str = Array.isArray(val) ? val.join(', ') : String(val);
  const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const normalized = parts.map((p) => {
    const lower = p.toLowerCase();
    const found = CATEGORIAS_CANONICAL.find((c) => c.toLowerCase() === lower);
    return found || p;
  });
  return [...new Set(normalized)].join(', ');
}

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
function serializeOficina(val) {
  if (val == null) return null;
  if (Array.isArray(val)) return val.length ? JSON.stringify(val) : null;
  return String(val);
}

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = [
  'http://localhost:5173',
  ...(corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : []),
];
function corsOptions(req, callback) {
  const origin = req.header('Origin');
  const ok = !origin || allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin);
  callback(null, {
    origin: ok ? origin : false,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
app.use(cors(corsOptions));
app.use(express.json());

// —— Auth ——
import { comparePassword, createToken, findUserByEmail, getPermissionsForRole } from './auth.js';

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const user = await findUserByEmail(email);
    if (!user || !comparePassword(password, user.password_hash)) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const permissions = user.rol === 'admin' ? PERMISSIONS.map((p) => p.key) : (await getPermissionsForRole(user.rol));
    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        oficina: parseOficina(user.oficina),
        permissions: permissions || [],
      },
    });
  } catch (e) { next(e); }
});

app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase.from('users').select('id, email, nombre, rol, oficina').eq('id', req.user.id).maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const permissions = user.rol === 'admin' ? PERMISSIONS.map((p) => p.key) : (await getPermissionsForRole(user.rol));
    res.json({ ...user, oficina: parseOficina(user.oficina), permissions });
  } catch (e) { next(e); }
});

// —— Alojamientos ——
app.get('/api/alojamientos', authMiddleware, requirePermission('view_alojamientos'), async (req, res, next) => {
  try {
    const isAdmin = req.user.rol === 'admin';
    let q = supabase.from('alojamientos').select('*').order('prestador');
    if (!isAdmin) q = q.or('oculto.is.null,oculto.eq.0');
    const { data: rows, error } = await q;
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/alojamientos', authMiddleware, requirePermission('edit_alojamientos'), async (req, res, next) => {
  try {
    const { localidad, categoria, prestador, web, funcionamiento, observaciones, direccion, telefono_fijo, whatsapp, pagina_web, plazas_totales, oficina } = req.body || {};
    if (!prestador) return res.status(400).json({ error: 'Prestador requerido' });
    const row = {
      localidad: localidad || 'Villa Gesell',
      categoria: normalizeCategoria(categoria) || null,
      prestador,
      web: web || null,
      funcionamiento: funcionamiento || null,
      observaciones: observaciones || null,
      direccion: direccion || null,
      telefono_fijo: telefono_fijo || null,
      whatsapp: whatsapp || null,
      pagina_web: pagina_web || null,
      plazas_totales: plazas_totales ?? null,
      oficina: oficina || null,
    };
    const { data, error } = await supabase.from('alojamientos').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

app.put('/api/alojamientos/:id', authMiddleware, requirePermission('edit_alojamientos'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { localidad, categoria, prestador, web, funcionamiento, observaciones, direccion, telefono_fijo, whatsapp, pagina_web, plazas_totales, oficina, oculto } = req.body || {};
    const { data: existing, error: eErr } = await supabase.from('alojamientos').select('*').eq('id', id).maybeSingle();
    if (eErr) throw eErr;
    if (!existing) return res.status(404).json({ error: 'Alojamiento no encontrado' });
    const ocultoVal = (req.user.rol === 'admin' && oculto !== undefined) ? (oculto ? 1 : 0) : (existing.oculto ?? 0);
    const upd = {
      localidad: localidad ?? existing.localidad ?? '',
      categoria: normalizeCategoria(categoria) ?? existing.categoria ?? null,
      prestador: prestador ?? existing.prestador ?? '',
      web: web ?? null,
      funcionamiento: funcionamiento ?? null,
      observaciones: observaciones ?? null,
      direccion: direccion ?? null,
      telefono_fijo: telefono_fijo ?? null,
      whatsapp: whatsapp ?? null,
      pagina_web: pagina_web ?? null,
      plazas_totales: plazas_totales ?? null,
      oficina: oficina ?? null,
      oculto: ocultoVal,
    };
    const { data, error } = await supabase.from('alojamientos').update(upd).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

app.delete('/api/alojamientos/:id', authMiddleware, requirePermission('edit_alojamientos'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data: deleted, error } = await supabase.from('alojamientos').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!deleted?.length) return res.status(404).json({ error: 'Alojamiento no encontrado' });
    await supabase.from('relevamientos').delete().eq('alojamiento_id', id);
    res.status(204).send();
  } catch (e) { next(e); }
});

// —— Inmobiliarias ——
app.get('/api/inmobiliarias', authMiddleware, requirePermission('view_inmobiliarias'), async (req, res, next) => {
  try {
    const isAdmin = req.user.rol === 'admin';
    let q = supabase.from('inmobiliarias').select('*').order('prestador');
    if (!isAdmin) q = q.or('oculto.is.null,oculto.eq.0');
    const { data: rows, error } = await q;
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/inmobiliarias', authMiddleware, requirePermission('edit_inmobiliarias'), async (req, res, next) => {
  try {
    const { localidad, prestador, direccion, telefono_fijo, whatsapp, oficina } = req.body || {};
    if (!prestador) return res.status(400).json({ error: 'Prestador requerido' });
    const row = { localidad: localidad || 'Villa Gesell', prestador, direccion: direccion || null, telefono_fijo: telefono_fijo || null, whatsapp: whatsapp || null, oficina: oficina || null };
    const { data, error } = await supabase.from('inmobiliarias').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

app.put('/api/inmobiliarias/:id', authMiddleware, requirePermission('edit_inmobiliarias'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { localidad, prestador, direccion, telefono_fijo, whatsapp, oficina, oculto } = req.body || {};
    const { data: existing, error: eErr } = await supabase.from('inmobiliarias').select('*').eq('id', id).maybeSingle();
    if (eErr) throw eErr;
    if (!existing) return res.status(404).json({ error: 'Inmobiliaria no encontrada' });
    const ocultoVal = (req.user.rol === 'admin' && oculto !== undefined) ? (oculto ? 1 : 0) : (existing.oculto ?? 0);
    const upd = { localidad: localidad ?? '', prestador: prestador ?? '', direccion: direccion ?? null, telefono_fijo: telefono_fijo ?? null, whatsapp: whatsapp ?? null, oficina: oficina ?? null, oculto: ocultoVal };
    const { data, error } = await supabase.from('inmobiliarias').update(upd).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

app.delete('/api/inmobiliarias/:id', authMiddleware, requirePermission('edit_inmobiliarias'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data: deleted, error } = await supabase.from('inmobiliarias').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!deleted?.length) return res.status(404).json({ error: 'Inmobiliaria no encontrada' });
    await supabase.from('relevamiento_inmobiliarias').delete().eq('inmobiliaria_id', id);
    res.status(204).send();
  } catch (e) { next(e); }
});

app.get('/api/inmobiliarias-config', authMiddleware, requirePermission('view_inmobiliarias'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (fecha) {
      const { data, error } = await supabase.from('inmobiliarias_config').select('*').eq('fecha', fecha).maybeSingle();
      if (error) throw error;
      return res.json(data ? { fecha: data.fecha } : null);
    }
    const { data: rows, error } = await supabase.from('inmobiliarias_config').select('fecha').order('fecha', { ascending: false });
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/inmobiliarias-config', authMiddleware, requirePermission('launch_inmobiliarias'), async (req, res, next) => {
  try {
    const { fecha } = req.body || {};
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });
    const { data, error } = await supabase.from('inmobiliarias_config').upsert({ fecha }, { onConflict: 'fecha' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

app.get('/api/relevamiento-inmobiliarias/fechas', authMiddleware, requirePermission('view_inmobiliarias'), async (req, res, next) => {
  try {
    const { data: fromRelev } = await supabase.from('relevamiento_inmobiliarias').select('fecha').order('fecha', { ascending: false }).limit(100);
    const { data: fromConfig } = await supabase.from('inmobiliarias_config').select('fecha');
    const set = new Set([...(fromRelev || []).map((r) => r.fecha), ...(fromConfig || []).map((r) => r.fecha)]);
    const fechas = [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
    res.json(fechas);
  } catch (e) { next(e); }
});

app.get('/api/relevamiento-inmobiliarias', authMiddleware, requirePermission('view_inmobiliarias'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' });
    const isAdmin = req.user.rol === 'admin';
    let qInm = supabase.from('inmobiliarias').select('*').order('prestador');
    if (!isAdmin) qInm = qInm.or('oculto.is.null,oculto.eq.0');
    const { data: inmobiliarias, error: e1 } = await qInm;
    if (e1) throw e1;
    const { data: relevamientos, error: e2 } = await supabase.from('relevamiento_inmobiliarias').select('*').eq('fecha', fecha);
    if (e2) throw e2;
    const byInmob = Object.fromEntries((relevamientos || []).map((r) => [r.inmobiliaria_id, r]));
    const list = (inmobiliarias || []).map((i) => ({ inmobiliaria: i, relevamiento: byInmob[i.id] || null }));
    res.json({ fecha, list });
  } catch (e) { next(e); }
});

app.post('/api/relevamiento-inmobiliarias', authMiddleware, requirePermission('edit_inmobiliarias'), async (req, res, next) => {
  try {
    const { fecha, inmobiliaria_id, ocupacion_dptos_pct, ocupacion_casas_pct, llamados, observaciones, oficina } = req.body || {};
    if (!fecha || !inmobiliaria_id) return res.status(400).json({ error: 'fecha e inmobiliaria_id requeridos' });
    const { data: user } = await supabase.from('users').select('nombre').eq('id', req.user.id).maybeSingle();
    const agente = user?.nombre ?? null;
    const od = ocupacion_dptos_pct != null ? Math.min(100, Math.max(0, Number(ocupacion_dptos_pct))) : null;
    const oc = ocupacion_casas_pct != null ? Math.min(100, Math.max(0, Number(ocupacion_casas_pct))) : null;
    const payload = { fecha, inmobiliaria_id, ocupacion_dptos_pct: od, ocupacion_casas_pct: oc, llamados: llamados ?? null, observaciones: observaciones ?? null, oficina: oficina ?? null, agente };
    const { data, error } = await supabase.from('relevamiento_inmobiliarias').upsert(payload, { onConflict: 'fecha,inmobiliaria_id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// —— Balnearios ——
app.get('/api/balnearios', authMiddleware, requirePermission('view_balnearios'), async (req, res, next) => {
  try {
    const isAdmin = req.user.rol === 'admin';
    let q = supabase.from('balnearios').select('*').order('prestador');
    if (!isAdmin) q = q.or('oculto.is.null,oculto.eq.0');
    const { data: rows, error } = await q;
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/balnearios', authMiddleware, requirePermission('edit_balnearios'), async (req, res, next) => {
  try {
    const { localidad, prestador, direccion, telefono_fijo, whatsapp, oficina } = req.body || {};
    if (!prestador) return res.status(400).json({ error: 'Prestador requerido' });
    const row = { localidad: localidad || 'Villa Gesell', prestador, direccion: direccion || null, telefono_fijo: telefono_fijo || null, whatsapp: whatsapp || null, oficina: oficina || null };
    const { data, error } = await supabase.from('balnearios').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

app.put('/api/balnearios/:id', authMiddleware, requirePermission('edit_balnearios'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { localidad, prestador, direccion, telefono_fijo, whatsapp, oficina, oculto } = req.body || {};
    const { data: existing, error: eErr } = await supabase.from('balnearios').select('*').eq('id', id).maybeSingle();
    if (eErr) throw eErr;
    if (!existing) return res.status(404).json({ error: 'Balneario no encontrado' });
    const ocultoVal = (req.user.rol === 'admin' && oculto !== undefined) ? (oculto ? 1 : 0) : (existing.oculto ?? 0);
    const upd = { localidad: localidad ?? '', prestador: prestador ?? '', direccion: direccion ?? null, telefono_fijo: telefono_fijo ?? null, whatsapp: whatsapp ?? null, oficina: oficina ?? null, oculto: ocultoVal };
    const { data, error } = await supabase.from('balnearios').update(upd).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

app.delete('/api/balnearios/:id', authMiddleware, requirePermission('edit_balnearios'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data: deleted, error } = await supabase.from('balnearios').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!deleted?.length) return res.status(404).json({ error: 'Balneario no encontrado' });
    await supabase.from('relevamiento_balnearios').delete().eq('balneario_id', id);
    res.status(204).send();
  } catch (e) { next(e); }
});

app.get('/api/balnearios-config', authMiddleware, requirePermission('view_balnearios'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (fecha) {
      const { data, error } = await supabase.from('balnearios_config').select('*').eq('fecha', fecha).maybeSingle();
      if (error) throw error;
      return res.json(data ? { fecha: data.fecha } : null);
    }
    const { data: rows, error } = await supabase.from('balnearios_config').select('fecha').order('fecha', { ascending: false });
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/balnearios-config', authMiddleware, requirePermission('launch_balnearios'), async (req, res, next) => {
  try {
    const { fecha } = req.body || {};
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });
    const { data, error } = await supabase.from('balnearios_config').upsert({ fecha }, { onConflict: 'fecha' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

app.get('/api/relevamiento-balnearios/fechas', authMiddleware, requirePermission('view_balnearios'), async (req, res, next) => {
  try {
    const { data: fromRelev } = await supabase.from('relevamiento_balnearios').select('fecha').order('fecha', { ascending: false }).limit(100);
    const { data: fromConfig } = await supabase.from('balnearios_config').select('fecha');
    const set = new Set([...(fromRelev || []).map((r) => r.fecha), ...(fromConfig || []).map((r) => r.fecha)]);
    const fechas = [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
    res.json(fechas);
  } catch (e) { next(e); }
});

app.get('/api/relevamiento-balnearios', authMiddleware, requirePermission('view_balnearios'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' });
    const isAdmin = req.user.rol === 'admin';
    let qBaln = supabase.from('balnearios').select('*').order('prestador');
    if (!isAdmin) qBaln = qBaln.or('oculto.is.null,oculto.eq.0');
    const { data: balnearios, error: e1 } = await qBaln;
    if (e1) throw e1;
    const { data: relevamientos, error: e2 } = await supabase.from('relevamiento_balnearios').select('*').eq('fecha', fecha);
    if (e2) throw e2;
    const byBaln = Object.fromEntries((relevamientos || []).map((r) => [r.balneario_id, r]));
    const list = (balnearios || []).map((b) => ({ balneario: b, relevamiento: byBaln[b.id] || null }));
    res.json({ fecha, list });
  } catch (e) { next(e); }
});

app.post('/api/relevamiento-balnearios', authMiddleware, requirePermission('edit_balnearios'), async (req, res, next) => {
  try {
    const { fecha, balneario_id, ocupacion_pct, llamados, observaciones, oficina } = req.body || {};
    if (!fecha || !balneario_id) return res.status(400).json({ error: 'fecha y balneario_id requeridos' });
    const { data: user } = await supabase.from('users').select('nombre').eq('id', req.user.id).maybeSingle();
    const agente = user?.nombre ?? null;
    const op = ocupacion_pct != null ? Math.min(100, Math.max(0, Number(ocupacion_pct))) : null;
    const payload = { fecha, balneario_id, ocupacion_pct: op, llamados: llamados ?? null, observaciones: observaciones ?? null, oficina: oficina ?? null, agente };
    const { data, error } = await supabase.from('relevamiento_balnearios').upsert(payload, { onConflict: 'fecha,balneario_id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// —— Relevamiento config ——
app.get('/api/relevamiento-config', authMiddleware, requirePermission('view_relevamiento'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (fecha) {
      const { data, error } = await supabase.from('relevamiento_config').select('*').eq('fecha', fecha).maybeSingle();
      if (error) throw error;
      return res.json(data || { fecha, consultar_ocupacion: 1, consultar_reservas: 0 });
    }
    const { data: rows, error } = await supabase.from('relevamiento_config').select('*').order('fecha', { ascending: false });
    if (error) throw error;
    res.json(rows || []);
  } catch (e) { next(e); }
});

app.post('/api/relevamiento-config', authMiddleware, requirePermission('launch_relevamiento'), async (req, res, next) => {
  try {
    const { fecha, consultar_ocupacion, consultar_reservas } = req.body || {};
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });
    const row = { fecha, consultar_ocupacion: consultar_ocupacion ? 1 : 0, consultar_reservas: consultar_reservas ? 1 : 0 };
    const { data, error } = await supabase.from('relevamiento_config').upsert(row, { onConflict: 'fecha' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// —— Relevamientos (alojamientos) ——
app.get('/api/relevamientos/fechas', authMiddleware, requirePermission('view_relevamiento'), async (req, res, next) => {
  try {
    const { data: fromRelev } = await supabase.from('relevamientos').select('fecha').order('fecha', { ascending: false }).limit(100);
    const { data: fromConfig } = await supabase.from('relevamiento_config').select('fecha');
    const set = new Set([...(fromRelev || []).map((r) => r.fecha), ...(fromConfig || []).map((r) => r.fecha)]);
    const fechas = [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
    res.json(fechas);
  } catch (e) { next(e); }
});

app.get('/api/relevamientos', authMiddleware, requirePermission('view_relevamiento'), async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' });
    const { data: configRow } = await supabase.from('relevamiento_config').select('*').eq('fecha', fecha).maybeSingle();
    const config = configRow || { consultar_ocupacion: 1, consultar_reservas: 0 };
    const isAdmin = req.user.rol === 'admin';
    let qAloj = supabase.from('alojamientos').select('*').order('prestador');
    if (!isAdmin) qAloj = qAloj.or('oculto.is.null,oculto.eq.0');
    const { data: alojamientos, error: e1 } = await qAloj;
    if (e1) throw e1;
    const { data: relevamientos, error: e2 } = await supabase.from('relevamientos').select('*').eq('fecha', fecha);
    if (e2) throw e2;
    const byAloj = Object.fromEntries((relevamientos || []).map((r) => [r.alojamiento_id, r]));
    const list = (alojamientos || []).map((a) => {
      const r = byAloj[a.id];
      const plazasTotales = a.plazas_totales ?? null;
      const plazasOcupadas = r?.plazas_ocupadas ?? null;
      const ocupacionPct = plazasTotales != null && plazasTotales > 0 && plazasOcupadas != null ? Math.round((plazasOcupadas / plazasTotales) * 100) : null;
      return {
        alojamiento: a,
        relevamiento: r ? { id: r.id, plazas_ocupadas_anterior: r.plazas_ocupadas_anterior, plazas_ocupadas: r.plazas_ocupadas, reservas: r.reservas, disponibilidad_texto: r.disponibilidad_texto, llamados: r.llamados, observaciones: r.observaciones, oficina: r.oficina, agente: r.agente } : null,
        ocupacion_pct: ocupacionPct,
      };
    });
    res.json({ fecha, config: { consultar_ocupacion: !!config.consultar_ocupacion, consultar_reservas: !!config.consultar_reservas }, list });
  } catch (e) { next(e); }
});

app.post('/api/relevamientos', authMiddleware, requirePermission('edit_relevamiento'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const { fecha, alojamiento_id, plazas_ocupadas_anterior, plazas_ocupadas, reservas, disponibilidad_texto, llamados, observaciones, oficina } = body;
    if (fecha == null || fecha === '' || alojamiento_id == null || alojamiento_id === '') {
      return res.status(400).json({ error: 'fecha y alojamiento_id requeridos' });
    }
    const { data: aloj } = await supabase.from('alojamientos').select('plazas_totales, oficina').eq('id', alojamiento_id).maybeSingle();
    const plazasTotales = aloj?.plazas_totales ?? null;
    if (plazas_ocupadas != null && plazasTotales != null && Number(plazas_ocupadas) > Number(plazasTotales)) return res.status(400).json({ error: 'Las plazas ocupadas no pueden superar las plazas totales' });
    const reservasVal = reservas != null ? Math.min(100, Math.max(0, Number(reservas))) : null;
    const { data: user } = await supabase.from('users').select('nombre').eq('id', req.user.id).maybeSingle();
    const agente = user?.nombre ?? null;
    const oficinaFinal = oficina ?? aloj?.oficina ?? null;
    const { data: existingRow } = await supabase.from('relevamientos').select('id').eq('fecha', fecha).eq('alojamiento_id', alojamiento_id).maybeSingle();
    const payload = {
      fecha,
      alojamiento_id,
      plazas_relevadas: plazasTotales,
      plazas_ocupadas_anterior: plazas_ocupadas_anterior ?? null,
      plazas_ocupadas: plazas_ocupadas ?? null,
      reservas: reservasVal,
      disponibilidad_texto: disponibilidad_texto ?? null,
      llamados: llamados ?? null,
      observaciones: observaciones ?? null,
      oficina: oficinaFinal,
      agente,
    };
    if (existingRow) {
      const { data, error } = await supabase.from('relevamientos').update(payload).eq('id', existingRow.id).select().single();
      if (error) throw error;
      return res.json(data);
    }
    const { data, error } = await supabase.from('relevamientos').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

app.post('/api/relevamientos/copiar-ultimo', authMiddleware, requirePermission('edit_relevamiento'), async (req, res, next) => {
  try {
    const { fecha, alojamiento_id } = req.body || {};
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });
    const { data: ultimaList } = await supabase.from('relevamientos').select('fecha').order('fecha', { ascending: false }).limit(1);
    const ultimaRow = ultimaList?.[0];
    const ultima = ultimaRow ? { f: ultimaRow.fecha } : null;
    if (!ultima?.f) return res.status(400).json({ error: 'No hay relevamientos previos para copiar' });
    const { data: user } = await supabase.from('users').select('nombre').eq('id', req.user.id).maybeSingle();
    const agente = user?.nombre ?? null;
    let q = supabase.from('relevamientos').select('*').eq('fecha', ultima.f);
    if (alojamiento_id) q = q.eq('alojamiento_id', alojamiento_id);
    const { data: rows, error: e1 } = await q;
    if (e1) throw e1;
    if (!rows?.length) return res.status(400).json({ error: 'No hay dato previo para este alojamiento' });
    for (const r of rows) {
      const { data: ex } = await supabase.from('relevamientos').select('id').eq('fecha', fecha).eq('alojamiento_id', r.alojamiento_id).maybeSingle();
      const row = { fecha, alojamiento_id: r.alojamiento_id, plazas_relevadas: r.plazas_relevadas, plazas_ocupadas_anterior: r.plazas_ocupadas_anterior, plazas_ocupadas: r.plazas_ocupadas, reservas: r.reservas, disponibilidad_texto: r.disponibilidad_texto, llamados: r.llamados, observaciones: r.observaciones, oficina: r.oficina, agente };
      if (ex) await supabase.from('relevamientos').update(row).eq('id', ex.id);
      else await supabase.from('relevamientos').insert(row);
    }
    res.json({ copiado: ultima.f, fecha, filas: rows.length });
  } catch (e) { next(e); }
});

// —— Permisos y usuarios (admin) ——
app.get('/api/permisos', authMiddleware, requirePermission('manage_users'), (req, res) => {
  res.json(PERMISSIONS);
});

app.get('/api/roles/:rol/permisos', authMiddleware, requirePermission('manage_users'), async (req, res, next) => {
  try {
    const permisos = await getPermissionsForRole(req.params.rol);
    res.json(permisos);
  } catch (e) { next(e); }
});

app.put('/api/roles/:rol/permisos', authMiddleware, requirePermission('manage_users'), async (req, res, next) => {
  try {
    const { rol } = req.params;
    const { permissions } = req.body || {};
    if (!['viewer', 'agente', 'admin'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    const valid = PERMISSIONS.map((p) => p.key);
    const toSet = (Array.isArray(permissions) ? permissions : []).filter((p) => valid.includes(p));
    await setPermissionsForRole(rol, toSet);
    res.json(await getPermissionsForRole(rol));
  } catch (e) { next(e); }
});

app.get('/api/users', authMiddleware, requirePermission('manage_users'), async (req, res, next) => {
  try {
    const { data: rows, error } = await supabase.from('users').select('id, email, nombre, rol, oficina').order('nombre');
    if (error) throw error;
    const withOficina = (rows || []).map((r) => ({ ...r, oficina: parseOficina(r.oficina) }));
    res.json(withOficina);
  } catch (e) { next(e); }
});

app.put('/api/users/:id', authMiddleware, requirePermission('manage_users'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { oficina, rol } = req.body || {};
    const { data: existing, error: eErr } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
    if (eErr) throw eErr;
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
    const upd = {};
    if (rol != null) {
      if (!['viewer', 'agente', 'admin'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
      upd.rol = rol;
    }
    if (oficina !== undefined) upd.oficina = serializeOficina(Array.isArray(oficina) ? oficina : oficina);
    if (Object.keys(upd).length) await supabase.from('users').update(upd).eq('id', id);
    const { data: row, error } = await supabase.from('users').select('id, email, nombre, rol, oficina').eq('id', id).single();
    if (error) throw error;
    res.json({ ...row, oficina: parseOficina(row.oficina) });
  } catch (e) { next(e); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Inicializar permisos por defecto y arrancar
async function init() {
  const { data } = await supabase.from('role_permissions').select('rol').limit(1);
  if (!data?.length) {
    await setPermissionsForRole('admin', PERMISSIONS.map((p) => p.key));
    await setPermissionsForRole('agente', ['view_relevamiento', 'edit_relevamiento', 'view_alojamientos', 'edit_alojamientos', 'view_inmobiliarias', 'edit_inmobiliarias', 'view_balnearios', 'edit_balnearios']);
    await setPermissionsForRole('viewer', ['view_relevamiento', 'view_alojamientos', 'view_inmobiliarias', 'view_balnearios']);
    console.log('Permisos por defecto cargados para viewer, agente, admin.');
  }
  app.listen(PORT, () => {
    console.log(`Backend relevamiento Villa Gesell en http://localhost:${PORT}`);
  });
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
