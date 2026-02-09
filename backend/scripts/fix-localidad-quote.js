/**
 * Corrige alojamientos con localidad = '"' asignando las localidades indicadas (orden por prestador).
 * Uso: node scripts/fix-localidad-quote.js
 */
import 'dotenv/config';
import { supabase } from '../src/supabase.js';

const NUEVAS_LOCALIDADES = [
  '21 de septiembre',
  'La Aguada',
  'Coliseo',
  'Casablanca',
  '5492255601982',
  'Colonial',
];

const { data: rows, error } = await supabase
  .from('alojamientos')
  .select('id, prestador, localidad')
  .eq('localidad', '"')
  .order('prestador');

if (error) {
  console.error('Error al listar:', error.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.log('No hay alojamientos con localidad = "\""');
  process.exit(0);
}

if (rows.length !== NUEVAS_LOCALIDADES.length) {
  console.warn(`Se encontraron ${rows.length} filas con localidad "\"", pero se dieron ${NUEVAS_LOCALIDADES.length} reemplazos. Se actualizarán en orden.`);
}

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const nuevaLocalidad = NUEVAS_LOCALIDADES[i] ?? row.localidad;
  const { error: err } = await supabase
    .from('alojamientos')
    .update({ localidad: nuevaLocalidad })
    .eq('id', row.id);
  if (err) {
    console.error(`Error al actualizar id ${row.id} (${row.prestador}):`, err.message);
  } else {
    console.log(`OK id ${row.id} | "${row.prestador}" → localidad "${nuevaLocalidad}"`);
  }
}

console.log('Listo.');
process.exit(0);
