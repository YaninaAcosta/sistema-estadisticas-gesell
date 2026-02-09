/**
 * Helpers para relevamiento inmobiliarias (solo Supabase).
 */

export async function getRelevamientoInmobFechas(supabase) {
  const { data: fromRelev } = await supabase.from('relevamiento_inmobiliarias').select('fecha').order('fecha', { ascending: false }).limit(100);
  const { data: fromConfig } = await supabase.from('inmobiliarias_config').select('fecha');
  const set = new Set([...(fromRelev || []).map((r) => r.fecha), ...(fromConfig || []).map((r) => r.fecha)]);
  return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
}

export async function getRelevamientoInmob(supabase, fecha, isAdmin) {
  let qInm = supabase.from('inmobiliarias').select('*').order('prestador');
  if (!isAdmin) qInm = qInm.or('oculto.is.null,oculto.eq.0');
  const { data: inmobiliarias, error: e1 } = await qInm;
  if (e1) throw e1;
  const { data: relevamientos, error: e2 } = await supabase.from('relevamiento_inmobiliarias').select('*').eq('fecha', fecha);
  if (e2) throw e2;
  const byInmob = Object.fromEntries((relevamientos || []).map((r) => [r.inmobiliaria_id, r]));
  return { fecha, list: (inmobiliarias || []).map((i) => ({ inmobiliaria: i, relevamiento: byInmob[i.id] || null })) };
}

export async function saveRelevamientoInmob(supabase, payload, agenteNombre) {
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
