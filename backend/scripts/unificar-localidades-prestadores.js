/**
 * Unifica datos de alojamientos:
 * - Las únicas localidades válidas son: Villa Gesell, Mar Azul, Mar de las Pampas, Las Gaviotas, Colonia Marina.
 * - Prestador = nombre del alojamiento. Corrige los que tenían nombre en el campo localidad.
 * Uso: node scripts/unificar-localidades-prestadores.js
 */
import 'dotenv/config';
import { supabase } from '../src/supabase.js';

const LOCALIDADES_VALIDAS = ['Villa Gesell', 'Mar Azul', 'Mar de las Pampas', 'Las Gaviotas', 'Colonia Marina'];

// Los 6 que antes se corrigieron mal (localidad tenía el nombre del prestador): asignar prestador correcto y localidad válida
const CORRECCIONES_POR_ID = [
  { id: 484, prestador: '21 de septiembre', localidad: 'Villa Gesell' },
  { id: 93, prestador: 'La Aguada', localidad: 'Villa Gesell' },
  { id: 413, prestador: 'Coliseo', localidad: 'Villa Gesell' },
  { id: 29, prestador: 'Casablanca', localidad: 'Villa Gesell' },
  { id: 319, prestador: 'Calle 43 e/ Mar del Plata y Mar Azul', localidad: 'Mar Azul' }, // dirección como prestador si no hay nombre; localidad por calle
  { id: 37, prestador: 'Colonial', localidad: 'Villa Gesell' },
];

// Iris: fila con localidad "2024/25" o similar
const PRESTADOR_IRIS_LOCALIDAD = { prestador: 'Iris', localidad: 'Villa Gesell' };

async function main() {
  // 1) Corregir los 6 por id
  for (const c of CORRECCIONES_POR_ID) {
    const { error } = await supabase.from('alojamientos').update({ prestador: c.prestador, localidad: c.localidad }).eq('id', c.id);
    if (error) console.error(`Error id ${c.id}:`, error.message);
    else console.log(`OK id ${c.id} → prestador "${c.prestador}", localidad "${c.localidad}"`);
  }

  // 2) Buscar y corregir "Iris" (localidad tipo 2024/25" o con año)
  const { data: irisRows } = await supabase
    .from('alojamientos')
    .select('id, prestador, localidad')
    .ilike('localidad', '%2024%');
  for (const row of irisRows || []) {
    if (!LOCALIDADES_VALIDAS.includes(row.localidad)) {
      const { error } = await supabase
        .from('alojamientos')
        .update({ prestador: PRESTADOR_IRIS_LOCALIDAD.prestador, localidad: PRESTADOR_IRIS_LOCALIDAD.localidad })
        .eq('id', row.id);
      if (error) console.error(`Error Iris id ${row.id}:`, error.message);
      else console.log(`OK id ${row.id} (Iris) → prestador "Iris", localidad "Villa Gesell"`);
    }
  }

  // 3) Cualquier otra fila con localidad inválida → localidad Villa Gesell (solo cambiamos localidad, no prestador)
  const { data: todos } = await supabase.from('alojamientos').select('id, prestador, localidad');
  const invalidos = (todos || []).filter((a) => !LOCALIDADES_VALIDAS.includes(a.localidad));
  for (const a of invalidos) {
    const { error } = await supabase.from('alojamientos').update({ localidad: 'Villa Gesell' }).eq('id', a.id);
    if (error) console.error(`Error id ${a.id}:`, error.message);
    else console.log(`OK id ${a.id} | localidad "${a.localidad}" → "Villa Gesell" (prestador: ${a.prestador})`);
  }

  console.log('Listo.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
