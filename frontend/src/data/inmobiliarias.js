/**
 * Helpers para relevamiento inmobiliarias (Supabase o backend).
 */
import { backendRequest } from './backendApi.js';

export async function getRelevamientoInmobFechas(client) {
  if (client?._backend) return backendRequest(client, '/api/relevamiento-inmobiliarias/fechas');
  const supabase = client;
  const [resRelev, resConfig] = await Promise.all([
    supabase.from('relevamiento_inmobiliarias').select('fecha').order('fecha', { ascending: false }).limit(100),
    supabase.from('inmobiliarias_config').select('fecha'),
  ]);
  const set = new Set([
    ...(resRelev.data || []).map((r) => r.fecha),
    ...(resConfig.data || []).map((r) => r.fecha),
  ]);
  return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
}

export async function getRelevamientoInmob(client, fecha, isAdmin) {
  if (client?._backend) return backendRequest(client, `/api/relevamiento-inmobiliarias?fecha=${encodeURIComponent(fecha)}`);
  const supabase = client;
  let qInm = supabase.from('inmobiliarias').select('*').order('prestador');
  if (!isAdmin) qInm = qInm.or('oculto.is.null,oculto.eq.0');
  const [resInm, resRelev] = await Promise.all([
    qInm,
    supabase.from('relevamiento_inmobiliarias').select('*').eq('fecha', fecha),
  ]);
  const { data: inmobiliarias, error: e1 } = resInm;
  const { data: relevamientos, error: e2 } = resRelev;
  if (e1) throw e1;
  if (e2) throw e2;
  const byInmob = Object.fromEntries((relevamientos || []).map((r) => [r.inmobiliaria_id, r]));
  return { fecha, list: (inmobiliarias || []).map((i) => ({ inmobiliaria: i, relevamiento: byInmob[i.id] || null })) };
}

export async function saveRelevamientoInmob(client, payload, agenteNombre) {
  if (client?._backend) {
    return backendRequest(client, '/api/relevamiento-inmobiliarias', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  const supabase = client;
  const od = payload.ocupacion_dptos_pct != null ? Math.min(100, Math.max(0, Number(payload.ocupacion_dptos_pct))) : null;
  const oc = payload.ocupacion_casas_pct != null ? Math.min(100, Math.max(0, Number(payload.ocupacion_casas_pct))) : null;
  const row = {
    fecha: payload.fecha,
    inmobiliaria_id: payload.inmobiliaria_id,
    ocupacion_dptos_pct: od,
    ocupacion_casas_pct: oc,
    llamados: payload.llamados ?? null,
    observaciones: payload.observaciones ?? null,
    oficina: payload.oficina ?? null,
    agente: agenteNombre ?? null,
  };
  const { data, error } = await supabase.from('relevamiento_inmobiliarias').upsert(row, { onConflict: 'fecha,inmobiliaria_id' }).select().single();
  if (error) throw error;
  return data;
}
