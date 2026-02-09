/**
 * Carga datos de prueba de Inmobiliarias y Balnearios.
 * Uso: node scripts/seed-inmobiliarias-balnearios.js
 * Opción --replace: borra los existentes y reemplaza por este listado.
 * Sin --replace: solo inserta si no hay registros (evita duplicar).
 */
import { db } from '../src/db.js';

const REPLACE = process.argv.includes('--replace');

const inmobiliarias = [
  { localidad: 'Villa Gesell', prestador: 'Aguilar Propiedades', direccion: 'Av. Buenos Aires N° 756', telefono_fijo: '(02255) 46-0821', whatsapp: '5492255481403', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Alici Inmobiliaria & Constructora', direccion: 'Paseo Costanero N° 1144', telefono_fijo: '(02255) 47-1000', whatsapp: '5492255123456', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Dominguez Decoud', direccion: 'Av. 3 N° 800', telefono_fijo: '(02255) 46-2000', whatsapp: '5492255987654', oficina: 'Norte' },
  { localidad: 'Villa Gesell', prestador: 'Gianini', direccion: 'Av. 2 N° 450', telefono_fijo: '(02255) 45-3333', whatsapp: null, oficina: 'Terminal' },
  { localidad: 'Villa Gesell', prestador: 'J.M. Garcia Negocios Inmobiliarios', direccion: 'Calle 106 N° 320', telefono_fijo: '(02255) 46-5555', whatsapp: '5492255443322', oficina: 'Centro' },
  { localidad: 'Mar del Plata', prestador: 'Inmobiliaria Costa', direccion: 'Av. Colón 2500', telefono_fijo: '(0223) 456-7890', whatsapp: '5492235123456', oficina: 'Norte' },
];

const balnearios = [
  { localidad: 'Villa Gesell', prestador: 'Amy', direccion: 'Playa e/ Paseos 105 y 107', telefono_fijo: '(02255) 46-1000', whatsapp: '5492255111111', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Ciento25', direccion: 'Playa entre 125 y 126', telefono_fijo: '(02255) 47-2525', whatsapp: '5492255222222', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'El Náutico', direccion: 'Playa y Avenida Bs. As.', telefono_fijo: '(02255) 46-3000', whatsapp: null, oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Eólico', direccion: 'Playa e/ Paseos 110 y 111', telefono_fijo: '(02255) 45-4000', whatsapp: '5492255333333', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Fredda Club', direccion: 'Playa 120', telefono_fijo: '(02255) 46-5000', whatsapp: '5492255444444', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Luz de Luna', direccion: 'Playa e/ 115 y 116', telefono_fijo: '(02255) 47-6000', whatsapp: null, oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Dack Vogliadimare', direccion: 'Playa 130', telefono_fijo: '(02255) 46-7000', whatsapp: '5492255555555', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Paralelo 45', direccion: 'Playa 140', telefono_fijo: '(02255) 45-8000', whatsapp: '5492255666666', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Pilotes', direccion: 'Playa e/ Paseos 145 y 146', telefono_fijo: '(02255) 46-9000', whatsapp: null, oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Popeye', direccion: 'Playa 150', telefono_fijo: '(02255) 47-0002', whatsapp: '5492255777777', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Puerto Bonito', direccion: 'Playa 160', telefono_fijo: '(02255) 46-1111', whatsapp: '5492255888888', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Puerto Paraíso', direccion: 'Playa 170', telefono_fijo: '(02255) 45-2222', whatsapp: null, oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Sudestada', direccion: 'Playa 180', telefono_fijo: '(02255) 46-3333', whatsapp: '5492255999999', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Sun Set', direccion: 'Playa 190', telefono_fijo: '(02255) 47-4444', whatsapp: null, oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Koh Tao', direccion: 'Playa 200', telefono_fijo: '(02255) 46-5555', whatsapp: '5492255000001', oficina: 'Centro' },
  { localidad: 'Villa Gesell', prestador: 'Lupe Beach', direccion: 'Playa 210', telefono_fijo: '(02255) 45-6666', whatsapp: null, oficina: 'Centro' },
];

function run() {
  const insertInmob = db.prepare(`
    INSERT INTO inmobiliarias (localidad, prestador, direccion, telefono_fijo, whatsapp, oficina)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertBaln = db.prepare(`
    INSERT INTO balnearios (localidad, prestador, direccion, telefono_fijo, whatsapp, oficina)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (REPLACE) {
    db.exec('DELETE FROM relevamiento_inmobiliarias');
    db.exec('DELETE FROM inmobiliarias_config');
    db.exec('DELETE FROM inmobiliarias');
    db.exec('DELETE FROM relevamiento_balnearios');
    db.exec('DELETE FROM balnearios_config');
    db.exec('DELETE FROM balnearios');
    console.log('Listados anteriores de inmobiliarias y balnearios borrados.');
  } else {
    const countInmob = db.prepare('SELECT COUNT(*) as n FROM inmobiliarias').get();
    const countBaln = db.prepare('SELECT COUNT(*) as n FROM balnearios').get();
    if (countInmob.n > 0 || countBaln.n > 0) {
      console.log('Ya hay datos de inmobiliarias o balnearios. Usá --replace para reemplazar.');
      process.exit(0);
    }
  }

  for (const i of inmobiliarias) {
    insertInmob.run(i.localidad, i.prestador, i.direccion ?? null, i.telefono_fijo ?? null, i.whatsapp ?? null, i.oficina ?? null);
  }
  for (const b of balnearios) {
    insertBaln.run(b.localidad, b.prestador, b.direccion ?? null, b.telefono_fijo ?? null, b.whatsapp ?? null, b.oficina ?? null);
  }

  console.log('Seed listo: %d inmobiliarias, %d balnearios.', inmobiliarias.length, balnearios.length);
}

run();
