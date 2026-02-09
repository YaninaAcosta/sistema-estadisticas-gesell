import 'dotenv/config';
import { supabase } from './supabase.js';
import { hashPassword } from './auth.js';
import { PERMISSIONS, setPermissionsForRole } from './auth.js';

const users = [
  { email: 'admin@gesell.gob.ar', nombre: 'Admin', rol: 'admin', oficina: null },
  { email: 'agente@gesell.gob.ar', nombre: 'Yésica U', rol: 'agente', oficina: 'Mar de las Pampas' },
  { email: 'viewer@gesell.gob.ar', nombre: 'Solo Lectura', rol: 'viewer', oficina: null },
];
const passwordHash = hashPassword('gesell123');

async function seed() {
  const { data: relIds } = await supabase.from('relevamientos').select('id');
  if (relIds?.length) await supabase.from('relevamientos').delete().in('id', relIds.map((r) => r.id));
  const { data: configFechas } = await supabase.from('relevamiento_config').select('fecha');
  if (configFechas?.length) await supabase.from('relevamiento_config').delete().in('fecha', configFechas.map((r) => r.fecha));
  await supabase.from('role_permissions').delete().in('rol', ['admin', 'agente', 'viewer']);
  const { data: alojIdsOld } = await supabase.from('alojamientos').select('id');
  if (alojIdsOld?.length) {
    await supabase.from('relevamientos').delete().in('alojamiento_id', alojIdsOld.map((r) => r.id));
    await supabase.from('alojamientos').delete().in('id', alojIdsOld.map((r) => r.id));
  }
  await supabase.from('users').delete().in('email', users.map((u) => u.email));

  for (const u of users) {
    const { data: inserted, error } = await supabase.from('users').insert({
      email: u.email,
      password_hash: passwordHash,
      nombre: u.nombre,
      rol: u.rol,
      oficina: u.oficina ?? null,
    }).select('id').single();
    if (error) throw error;
  }

  await setPermissionsForRole('admin', PERMISSIONS.map((p) => p.key));
  await setPermissionsForRole('agente', ['view_relevamiento', 'edit_relevamiento', 'view_alojamientos', 'edit_alojamientos']);
  await setPermissionsForRole('viewer', ['view_relevamiento', 'view_alojamientos']);

  const alojamientos = [
    { localidad: 'Villa Gesell', categoria: 'Hotel 3*', prestador: 'Abetaia', web: 'Si', funcionamiento: 'Abierto T.A / Cierra del 05/03 al 20/12.', observaciones: null, direccion: 'Av. 5 N° 467 e/ Paseos 104 y 105', telefono_fijo: '(02255) 46-2454', whatsapp: '5491160288924', pagina_web: 'https://ejemplo.com/abetaia', plazas_totales: 98, oficina: 'Mar de las Pampas' },
    { localidad: 'Villa Gesell', categoria: 'Hotel 2*', prestador: 'Acquamarina', web: 'Si', funcionamiento: 'Cerrado h. 17/08', observaciones: null, direccion: 'Av. 3 N° 520', telefono_fijo: '(02255) 46-1234', whatsapp: '5491155667788', pagina_web: null, plazas_totales: 44, oficina: 'Mar de las Pampas' },
    { localidad: 'Villa Gesell', categoria: 'Hotel 3*', prestador: 'Agua de Coco', web: 'Si', funcionamiento: 'Abierto T.A. / Abre el 26/12.', observaciones: null, direccion: 'Calle 104 N° 234', telefono_fijo: '(02255) 47-0001', whatsapp: null, pagina_web: null, plazas_totales: 60, oficina: 'Norte' },
    { localidad: 'Villa Gesell', categoria: 'Sin categorizar', prestador: 'Águila Blanca', web: 'Si', funcionamiento: 'Abierto T.A Abre 1° de Diciembre', observaciones: null, direccion: 'Av. 2 N° 100', telefono_fijo: null, whatsapp: '5491199887766', pagina_web: null, plazas_totales: 50, oficina: null },
    { localidad: 'Villa Gesell', categoria: 'Hotel 2*', prestador: 'Agustina A.O.M.A', web: 'Si', funcionamiento: 'Abierto todo el año.', observaciones: 'No pedir reservas, No pedir tarifas', direccion: 'Paseo 105 N° 300', telefono_fijo: '(02255) 45-5555', whatsapp: '5491122334455', pagina_web: null, plazas_totales: 48, oficina: 'Terminal' },
  ];

  const alojIds = [];
  for (const a of alojamientos) {
    const { data, error } = await supabase.from('alojamientos').insert({
      localidad: a.localidad,
      categoria: a.categoria,
      prestador: a.prestador,
      web: a.web ?? null,
      funcionamiento: a.funcionamiento ?? null,
      observaciones: a.observaciones ?? null,
      direccion: a.direccion,
      telefono_fijo: a.telefono_fijo ?? null,
      whatsapp: a.whatsapp ?? null,
      pagina_web: a.pagina_web ?? null,
      plazas_totales: a.plazas_totales,
      oficina: a.oficina ?? null,
    }).select('id').single();
    if (error) throw error;
    alojIds.push(data.id);
  }

  const fechaEjemplo = '2025-01-03';
  await supabase.from('relevamiento_config').upsert({ fecha: fechaEjemplo, consultar_ocupacion: 1, consultar_reservas: 1 }, { onConflict: 'fecha' });

  const relevamientos = [
    { plazas_relevadas: 98, plazas_ocupadas_anterior: 26, plazas_ocupadas: 20, reservas: 3, llamados: 'Envié WhatsApp', oficina: 'Mar de las Pampas', agente: 'Yésica U' },
    { plazas_relevadas: 44, plazas_ocupadas_anterior: 40, plazas_ocupadas: 45, reservas: 4, llamados: 'Envié WhatsApp', oficina: 'Mar de las Pampas', agente: 'Yésica U' },
    { plazas_relevadas: 60, plazas_ocupadas_anterior: 50, plazas_ocupadas: 48, reservas: 2, llamados: 'Llamado', oficina: 'Norte', agente: 'Yésica U' },
    { plazas_relevadas: 50, plazas_ocupadas_anterior: null, plazas_ocupadas: 50, disponibilidad_texto: 'llamar más tarde', oficina: null, agente: 'Yésica U' },
    { plazas_relevadas: 48, plazas_ocupadas_anterior: 30, plazas_ocupadas: 42, observaciones: 'Sin novedad', oficina: 'Terminal', agente: 'Yésica U' },
  ];

  for (let i = 0; i < relevamientos.length; i++) {
    const r = relevamientos[i];
    await supabase.from('relevamientos').insert({
      fecha: fechaEjemplo,
      alojamiento_id: alojIds[i],
      plazas_relevadas: r.plazas_relevadas,
      plazas_ocupadas_anterior: r.plazas_ocupadas_anterior ?? null,
      plazas_ocupadas: r.plazas_ocupadas,
      reservas: r.reservas ?? null,
      disponibilidad_texto: r.disponibilidad_texto ?? null,
      llamados: r.llamados ?? null,
      observaciones: r.observaciones ?? null,
      oficina: r.oficina ?? null,
      agente: r.agente ?? null,
    });
  }

  console.log('Seed listo. Usuarios: admin@gesell.gob.ar, agente@gesell.gob.ar, viewer@gesell.gob.ar — password: gesell123');
  console.log('Relevamiento de ejemplo: fecha', fechaEjemplo);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
