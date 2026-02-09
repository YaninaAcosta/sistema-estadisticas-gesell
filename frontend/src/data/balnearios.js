/**
 * Helpers para relevamiento balnearios (solo Supabase).
 */

export async function getRelevamientoBalnFechas(supabase) {
  const { data: fromRelev } = await supabase.from('relevamiento_balnearios').select('fecha').order('fecha', { ascending: false }).limit(100);
  const { data: fromConfig } = await supabase.from('balnearios_config').select('fecha');
  const set = new Set([...(fromRelev || []).map((r) => r.fecha), ...(fromConfig || []).map((r) => r.fecha)]);
  return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
}

export async function getRelevamientoBaln(supabase, fecha, isAdmin) {
  let qBaln = supabase.from('balnearios').select('*').order('prestador');
  if (!isAdmin) qBaln = qBaln.or('oculto.is.null,oculto.eq.0');
  const { data: balnearios, error: e1 } = await qBaln;
  if (e1) throw e1;
  const { data: relevamientos, error: e2 } = await supabase.from('relevamiento_balnearios').select('*').eq('fecha', fecha);
  if (e2) throw e2;
  const byBaln = Object.fromEntries((relevamientos || []).map((r) => [r.balneario_id, r]));
  return { fecha, list: (balnearios || []).map((b) => ({ balneario: b, relevamiento: byBaln[b.id] || null })) };
}

export async function saveRelevamientoBaln(supabase, payload, agenteNombre) {
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
