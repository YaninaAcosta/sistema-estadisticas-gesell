/**
 * Pone la contraseña "gesell123" a todos los usuarios de Supabase Auth.
 * Requiere: .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * Ejecutar: node scripts/set-passwords-gesell123.js (desde la carpeta backend)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = 'gesell123';

async function main() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error al listar usuarios:', listError.message);
    process.exit(1);
  }
  if (!users?.length) {
    console.log('No hay usuarios en Auth.');
    return;
  }
  console.log(`Actualizando contraseña a "${PASSWORD}" para ${users.length} usuario(s)...`);
  for (const u of users) {
    const { error } = await supabase.auth.admin.updateUserById(u.id, { password: PASSWORD });
    if (error) {
      console.error(`  ${u.email}: ${error.message}`);
    } else {
      console.log(`  OK: ${u.email}`);
    }
  }
  console.log('Listo.');
}

main();
