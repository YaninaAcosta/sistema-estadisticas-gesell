/**
 * Importa alojamientos desde un archivo TSV/CSV o JSON.
 * - Normaliza localidad: VG→Villa Gesell, MDLP→Mar de las Pampas, MA→Mar Azul, LG→Las Gaviotas, CM→Colonia Marina.
 * - Normaliza categoría al listado canónico.
 * - No repite alojamientos: por (localidad, prestador) solo inserta si no existe.
 *
 * Uso: node scripts/import-alojamientos-gesell.js [ruta]
 * Por defecto: data/alojamientos-gesell.tsv (o data/alojamientos-importar.json si existe)
 *
 * JSON: array de { localidad, categoria, prestador, direccion?, telefono_fijo?, whatsapp?, plazas_totales?, web?, funcionamiento?, observaciones? }
 * TSV: cabecera Localidad, Categoría, Prestadores, Web, Funcionamiento, Observaciones, Dirección, Teléfono fijo, WhatsApp, Plazas totales
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultPath = existsSync(join(__dirname, '..', 'data', 'alojamientos-importar.json'))
  ? join(__dirname, '..', 'data', 'alojamientos-importar.json')
  : join(__dirname, '..', 'data', 'alojamientos-gesell.tsv');
const pathArg = process.argv[2] || defaultPath;

const LOCALIDAD_MAP = {
  VG: 'Villa Gesell',
  LG: 'Las Gaviotas',
  MDLP: 'Mar de las Pampas',
  MA: 'Mar Azul',
  CM: 'Colonia Marina',
};

const CATEGORIAS_CANONICAS = [
  'Sin categorizar',
  'Hotel',
  'Hotel 1*',
  'Hotel 2*',
  'Hotel 3*',
  'Apart Hotel',
  'Hostería 2*',
  'Departamentos con servicios',
];

const CATEGORIA_MAP = {
  'sin categorizar': 'Sin categorizar',
  'hotel': 'Hotel',
  'hotel 1*': 'Hotel 1*',
  'hotel 2*': 'Hotel 2*',
  'hotel 3*': 'Hotel 3*',
  'hotel 3* superior': 'Hotel 3*',
  'hotel 4*': 'Hotel 3*',
  'apart hotel': 'Apart Hotel',
  'apart hotel 3* superior': 'Apart Hotel',
  'apart hotel 4*': 'Apart Hotel',
  'hostería': 'Hostería 2*',
  'hostería 1*': 'Hostería 2*',
  'hostería 2*': 'Hostería 2*',
  'hosterias 2*': 'Hostería 2*',
  'hostería 3*': 'Hostería 2*',
  'hostería 4*': 'Hostería 2*',
  'hosteria 2*': 'Hostería 2*',
  'hosteria 3*': 'Hostería 2*',
  'departamentos con servicios': 'Departamentos con servicios',
  'deptos con servicios': 'Departamentos con servicios',
  'cabaña': 'Sin categorizar',
  'cabañas': 'Sin categorizar',
  'cabaña 1*': 'Sin categorizar',
  'cabaña 2*': 'Sin categorizar',
  'cabañas 1*': 'Sin categorizar',
  'camping': 'Sin categorizar',
  'hospedaje': 'Sin categorizar',
  'hospedaje 1*': 'Sin categorizar',
  'hostel': 'Sin categorizar',
  'gremial': 'Sin categorizar',
};

function normalizeLocalidad(val) {
  const v = (val || '').trim().toUpperCase();
  return LOCALIDAD_MAP[v] || (v && val.trim()) || 'Villa Gesell';
}

function normalizeCategoria(val) {
  if (!val || typeof val !== 'string') return 'Sin categorizar';
  const v = val.trim().toLowerCase();
  return CATEGORIA_MAP[v] || CATEGORIAS_CANONICAS.find((c) => c.toLowerCase() === v) || 'Sin categorizar';
}

const MAX_INTEGER = 2147483647; // límite tipo integer en PostgreSQL

function parseNum(s) {
  if (s == null || s === '') return null;
  const n = parseInt(String(s).replace(/\D/g, ''), 10);
  if (Number.isNaN(n)) return null;
  // Si supera el máximo (ej. teléfono en columna plazas), no insertar
  return n > MAX_INTEGER ? null : n;
}

const raw = readFileSync(pathArg, 'utf-8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
if (!lines.length) {
  console.error('Archivo vacío.');
  process.exit(1);
}

const sep = lines[0].includes('\t') ? '\t' : ',';
const header = lines[0].toLowerCase();
if (!header.includes('localidad') || (!header.includes('prestador') && !header.includes('prestadores'))) {
  console.error('El archivo debe tener cabecera con: Localidad, Categoría, Prestadores (o Prestador), y opcionalmente Web, Funcionamiento, Observaciones, Dirección, Teléfono fijo, WhatsApp, Plazas totales.');
  process.exit(1);
}

const col = (arr, i) => (arr[i] !== undefined ? arr[i] : '');

/** Parsea una línea CSV respetando campos entre comillas dobles (comas dentro no parten). */
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

const rows = lines.slice(1).map((line) => {
  const cols = sep === ',' ? parseCSVLine(line) : line.split(sep);
  return {
    localidad: normalizeLocalidad(col(cols, 0)),
    categoria: normalizeCategoria(col(cols, 1)),
    prestador: col(cols, 2).trim() || '',
    web: col(cols, 3).trim() || null,
    funcionamiento: col(cols, 4).trim() || null,
    observaciones: col(cols, 5).trim() || null,
    direccion: col(cols, 6).trim() || null,
    telefono_fijo: col(cols, 7).trim() || null,
    whatsapp: (col(cols, 8).trim().replace(/\s/g, '') || null),
    plazas_totales: parseNum(col(cols, 9)),
  };
}).filter((r) => r.prestador);

if (!rows.length) {
  console.error('No hay filas válidas.');
  process.exit(1);
}

// Quitar duplicados por (localidad, prestador): quedarse con la primera aparición
const seen = new Set();
const unicos = rows.filter((r) => {
  const key = `${r.localidad}|${r.prestador}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`Filas en archivo: ${rows.length}, sin duplicados (localidad+prestador): ${unicos.length}`);

// Traer alojamientos existentes para no repetir
const { data: existentes, error: errList } = await supabase.from('alojamientos').select('localidad, prestador');
if (errList) {
  console.error('Error al listar alojamientos:', errList.message);
  process.exit(1);
}
const setExist = new Set((existentes || []).map((a) => `${a.localidad}|${a.prestador}`));

const aInsertar = unicos.filter((r) => !setExist.has(`${r.localidad}|${r.prestador}`));
console.log(`Ya existían: ${unicos.length - aInsertar.length}, a insertar: ${aInsertar.length}`);

if (!aInsertar.length) {
  console.log('Nada nuevo que insertar.');
  process.exit(0);
}

const BATCH = 50;
let insertados = 0;
for (let i = 0; i < aInsertar.length; i += BATCH) {
  const chunk = aInsertar.slice(i, i + BATCH).map((r) => ({
    localidad: r.localidad,
    categoria: r.categoria,
    prestador: r.prestador,
    web: r.web,
    funcionamiento: r.funcionamiento,
    observaciones: r.observaciones,
    direccion: r.direccion,
    telefono_fijo: r.telefono_fijo,
    whatsapp: r.whatsapp,
    plazas_totales: r.plazas_totales,
    oficina: null,
  }));
  const { error } = await supabase.from('alojamientos').insert(chunk);
  if (error) {
    console.error('Error al insertar:', error.message);
    process.exit(1);
  }
  insertados += chunk.length;
}

console.log(`Importados ${insertados} alojamientos desde ${pathArg}.`);
console.log('Localidades: VG→Villa Gesell, MDLP→Mar de las Pampas, MA→Mar Azul, LG→Las Gaviotas, CM→Colonia Marina.');
console.log('Categorías normalizadas al listado canónico.');
process.exit(0);
