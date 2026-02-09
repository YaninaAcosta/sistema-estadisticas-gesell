/**
 * Helpers para relevamiento balnearios (Supabase o backend).
 */
import { backendRequest } from './backendApi.js';

export async function getRelevamientoBalnFechas(client) {
  if (client?._backend) return backendRequest(client, '/api/relevamiento-balnearios/fechas');
  const supabase = client;
  const [resRelev, resConfig] = await Promise.all([
    supabase.from('relevamiento_balnearios').select('fecha').order('fecha', { ascending: false }).limit(100),
    supabase.from('balnearios_config').select('fecha'),
  ]);
  const set = new Set([
    ...(resRelev.data || []).map((r) => r.fecha),
    ...(resConfig.data || []).map((r) => r.fecha),
  ]);
  return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
}

export async function getRelevamientoBaln(client, fecha, isAdmin) {
  if (client?._backend) return backendRequest(client, `/api/relevamiento-balnearios?fecha=${encodeURIComponent(fecha)}`);
  const supabase = client;
  let qBaln = supabase.from('balnearios').select('*').order('prestador');
  if (!isAdmin) qBaln = qBaln.or('oculto.is.null,oculto.eq.0');
  const [resBaln, resRelev] = await Promise.all([
    qBaln,
    supabase.from('relevamiento_balnearios').select('*').eq('fecha', fecha),
  ]);
  const { data: balnearios, error: e1 } = resBaln;
  const { data: relevamientos, error: e2 } = resRelev;
  if (e1) throw e1;
  if (e2) throw e2;
  const byBaln = Object.fromEntries((relevamientos || []).map((r) => [r.balneario_id, r]));
  return { fecha, list: (balnearios || []).map((b) => ({ balneario: b, relevamiento: byBaln[b.id] || null })) };
}

export async function saveRelevamientoBaln(client, payload, agenteNombre) {
  if (client?._backend) {
    return backendRequest(client, '/api/relevamiento-balnearios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  const supabase = client;
  const op = payload.ocupacion_pct != null ? Math.min(100, Math.max(0, Number(payload.ocupacion_pct))) : null;
  const row = {
    fecha: payload.fecha,
    balneario_id: payload.balneario_id,
    ocupacion_pct: op,
    llamados: payload.llamados ?? null,
    observaciones: payload.observaciones ?? null,
    oficina: payload.oficina ?? null,
    agente: agenteNombre ?? null,
  };
  const { data, error } = await supabase.from('relevamiento_balnearios').upsert(row, { onConflict: 'fecha,balneario_id' }).select().single();
  if (error) throw error;
  return data;
}
