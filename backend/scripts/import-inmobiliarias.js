/**
 * Importa inmobiliarias desde TSV/CSV o JSON.
 * Normaliza localidad: VG→Villa Gesell, MDLP→Mar de las Pampas, MA→Mar Azul, LG→Las Gaviotas, CM→Colonia Marina.
 * No repite: por (localidad, prestador) solo inserta si no existe.
 *
 * Uso:
 *   node scripts/import-inmobiliarias.js [ruta]
 * Por defecto: data/inmobiliarias-importar.json (o .tsv)
 *
 * JSON: array de { localidad, prestador, direccion?, telefono_fijo?, whatsapp? }
 * TSV: Localidad  Prestadores  Web  Dirección  e-mail  Teléfono fijo  WhatsApp
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathArg = process.argv[2] || join(__dirname, '..', 'data', 'inmobiliarias-importar.json');

const LOCALIDAD_MAP = {
  VG: 'Villa Gesell',
  LG: 'Las Gaviotas',
  MDLP: 'Mar de las Pampas',
  MA: 'Mar Azul',
  CM: 'Colonia Marina',
};

function normalizeLocalidad(val) {
  const v = (val || '').trim().toUpperCase();
  return LOCALIDAD_MAP[v] || (val && val.trim()) || 'Villa Gesell';
}

function cleanPhone(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  if (/no posee|no tienen/i.test(t)) return null;
  return t || null;
}

function cleanWhatsApp(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim().replace(/\s/g, '');
  if (/no posee|no tienen/i.test(t)) return null;
  if (/^\d+$/.test(t) && t.length >= 10) return t.startsWith('54') ? t : `54${t}`;
  return t || null;
}

let rows = [];

if (pathArg.endsWith('.json')) {
  const raw = readFileSync(pathArg, 'utf-8');
  const data = JSON.parse(raw);
  rows = (Array.isArray(data) ? data : []).map((r) => ({
    localidad: normalizeLocalidad(r.localidad || r.Localidad),
    prestador: (r.prestador || r.Prestadores || r.Prestador || '').trim() || '',
    direccion: (r.direccion || r.Dirección || r.Direccion || '').trim() || null,
    telefono_fijo: cleanPhone(r.telefono_fijo || r['Teléfono fijo'] || r.telefono || ''),
    whatsapp: cleanWhatsApp(r.whatsapp || r.WhatsApp || r.mobile || ''),
  }));
} else {
  const raw = readFileSync(pathArg, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const col = (arr, i) => (arr[i] !== undefined ? arr[i] : '');
  function parseCSVLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  }
  rows = lines.slice(1).map((line) => {
    const cols = sep === ',' ? parseCSVLine(line) : line.split(sep);
    return {
      localidad: normalizeLocalidad(col(cols, 0)),
      prestador: col(cols, 1).trim() || '',
      direccion: col(cols, 3).trim() || null,
      telefono_fijo: cleanPhone(col(cols, 5)),
      whatsapp: cleanWhatsApp(col(cols, 6)),
    };
  });
}

rows = rows.filter((r) => r.prestador);

const seen = new Set();
const unicos = rows.filter((r) => {
  const key = `${r.localidad}|${r.prestador}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const { data: existentes, error: errList } = await supabase.from('inmobiliarias').select('localidad, prestador');
if (errList) {
  console.error('Error al listar inmobiliarias:', errList.message);
  process.exit(1);
}
const setExist = new Set((existentes || []).map((a) => `${a.localidad}|${a.prestador}`));
const aInsertar = unicos.filter((r) => !setExist.has(`${r.localidad}|${r.prestador}`));

console.log(`Inmobiliarias en archivo: ${rows.length}, sin duplicados: ${unicos.length}, ya existían: ${unicos.length - aInsertar.length}, a insertar: ${aInsertar.length}`);

if (!aInsertar.length) {
  console.log('Nada nuevo que insertar.');
  process.exit(0);
}

const BATCH = 50;
let insertados = 0;
for (let i = 0; i < aInsertar.length; i += BATCH) {
  const chunk = aInsertar.slice(i, i + BATCH).map((r) => ({
    localidad: r.localidad,
    prestador: r.prestador,
    direccion: r.direccion,
    telefono_fijo: r.telefono_fijo,
    whatsapp: r.whatsapp,
    oficina: null,
  }));
  const { error } = await supabase.from('inmobiliarias').insert(chunk);
  if (error) {
    console.error('Error al insertar:', error.message);
    process.exit(1);
  }
  insertados += chunk.length;
}

console.log(`Importadas ${insertados} inmobiliarias. Localidades: VG→Villa Gesell, MDLP→Mar de las Pampas, MA→Mar Azul, LG→Las Gaviotas, CM→Colonia Marina.`);
process.exit(0);
