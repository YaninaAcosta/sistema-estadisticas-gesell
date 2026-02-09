/**
 * Crea el usuario "admin" con contraseña "gesell123" (solo nombre + contraseña, sin email real).
 * En la app se ingresa con Usuario: admin, Contraseña: gesell123.
 * Requiere: .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * Ejecutar: node scripts/crear-usuario-admin.js (desde la carpeta backend)
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

const EMAIL_AUTH = 'admin@local.gesell'; // interno: el "usuario" admin se mapea a este email
const PASSWORD = 'gesell123';

async function main() {
  // Crear o actualizar usuario en Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL_AUTH,
    password: PASSWORD,
    email_confirm: true,
  });

  let uid;
  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      console.log('Usuario auth ya existe, buscando id...');
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const u = users?.find((x) => x.email === EMAIL_AUTH);
      if (!u) {
        console.error('No se encontró el usuario. Error:', authError.message);
        process.exit(1);
      }
      uid = u.id;
      await supabase.auth.admin.updateUserById(uid, { password: PASSWORD });
      console.log('Contraseña actualizada a gesell123.');
    } else {
      console.error('Error Auth:', authError.message);
      process.exit(1);
    }
  } else {
    uid = authUser.user?.id;
    console.log('Usuario auth creado.');
  }

  if (!uid) {
    console.error('No se pudo obtener el id del usuario.');
    process.exit(1);
  }

  // Perfil en public.profiles (service_role puede insertar)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: uid,
      email: EMAIL_AUTH,
      nombre: 'Admin',
      rol: 'admin',
      oficina: null,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.error('Error al crear/actualizar perfil:', profileError.message);
    process.exit(1);
  }
  console.log('Perfil creado/actualizado en profiles.');
  console.log('');
  console.log('Listo. En la app ingresá con:');
  console.log('  Usuario: admin');
  console.log('  Contraseña: gesell123');
}

main();
