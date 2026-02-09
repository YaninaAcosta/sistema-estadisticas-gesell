/**
 * Acceso a relevamientos (alojamientos) vía Supabase o backend (cuando dataClient._backend).
 */
import { backendRequest } from './backendApi.js';

export async function getRelevamientoFechas(client) {
  if (client?._backend) return backendRequest(client, '/api/relevamientos/fechas');
  const supabase = client;
  const [resRelev, resConfig] = await Promise.all([
    supabase.from('relevamientos').select('fecha').order('fecha', { ascending: false }).limit(100),
    supabase.from('relevamiento_config').select('fecha'),
  ]);
  const set = new Set([
    ...(resRelev.data || []).map((r) => r.fecha),
    ...(resConfig.data || []).map((r) => r.fecha),
  ]);
  return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 80);
}

export async function getRelevamiento(client, fecha, isAdmin) {
  if (client?._backend) return backendRequest(client, `/api/relevamientos?fecha=${encodeURIComponent(fecha)}`);
  const supabase = client;
  const { data: configRow } = await supabase.from('relevamiento_config').select('*').eq('fecha', fecha).maybeSingle();
  const config = configRow || { consultar_ocupacion: 1, consultar_reservas: 0 };
  let qAloj = supabase.from('alojamientos').select('*').order('prestador');
  if (!isAdmin) qAloj = qAloj.or('oculto.is.null,oculto.eq.0');
  const [resAloj, resRelev] = await Promise.all([
    qAloj,
    supabase.from('relevamientos').select('*').eq('fecha', fecha),
  ]);
  const { data: alojamientos, error: e1 } = resAloj;
  const { data: relevamientos, error: e2 } = resRelev;
  if (e1) throw e1;
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
  return { fecha, config: { consultar_ocupacion: !!config.consultar_ocupacion, consultar_reservas: !!config.consultar_reservas }, list };
}

export async function saveRelevamiento(client, body, agenteNombre) {
  if (client?._backend) {
    return backendRequest(client, '/api/relevamientos', {
      method: 'POST',
      body: JSON.stringify({ ...body, agente: agenteNombre }),
    });
  }
  const supabase = client;
  const { fecha, alojamiento_id, plazas_ocupadas_anterior, plazas_ocupadas, reservas, disponibilidad_texto, llamados, observaciones, oficina } = body;
  const { data: aloj } = await supabase.from('alojamientos').select('plazas_totales, oficina').eq('id', alojamiento_id).maybeSingle();
  const plazasTotales = aloj?.plazas_totales ?? null;
  if (plazas_ocupadas != null && plazasTotales != null && Number(plazas_ocupadas) > Number(plazasTotales)) {
    throw new Error('Las plazas ocupadas no pueden superar las plazas totales');
  }
  const reservasVal = reservas != null ? Math.min(100, Math.max(0, Number(reservas))) : null;
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
    agente: agenteNombre ?? null,
  };
  if (existingRow) {
    const { data, error } = await supabase.from('relevamientos').update(payload).eq('id', existingRow.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('relevamientos').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function copiarUltimoRelevamiento(client, fecha, alojamientoId, agenteNombre) {
  if (client?._backend) {
    return backendRequest(client, '/api/relevamientos/copiar-ultimo', {
      method: 'POST',
      body: JSON.stringify({ fecha, alojamiento_id: alojamientoId }),
    });
  }
  const supabase = client;
  const { data: ultimaList } = await supabase.from('relevamientos').select('fecha').order('fecha', { ascending: false }).limit(1);
  const ultima = ultimaList?.[0]?.fecha;
  if (!ultima) throw new Error('No hay relevamientos previos para copiar');
  let q = supabase.from('relevamientos').select('*').eq('fecha', ultima);
  if (alojamientoId) q = q.eq('alojamiento_id', alojamientoId);
  const { data: rows, error: e1 } = await q;
  if (e1) throw e1;
  if (!rows?.length) throw new Error('No hay dato previo para este alojamiento');
  for (const r of rows) {
    const { data: ex } = await supabase.from('relevamientos').select('id').eq('fecha', fecha).eq('alojamiento_id', r.alojamiento_id).maybeSingle();
    const row = { fecha, alojamiento_id: r.alojamiento_id, plazas_relevadas: r.plazas_relevadas, plazas_ocupadas_anterior: r.plazas_ocupadas_anterior, plazas_ocupadas: r.plazas_ocupadas, reservas: r.reservas, disponibilidad_texto: r.disponibilidad_texto, llamados: r.llamados, observaciones: r.observaciones, oficina: r.oficina, agente: agenteNombre ?? null };
    if (ex) await supabase.from('relevamientos').update(row).eq('id', ex.id);
    else await supabase.from('relevamientos').insert(row);
  }
  return { copiado: ultima, fecha, filas: rows.length };
}
