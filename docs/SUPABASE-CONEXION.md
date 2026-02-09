# Conectar Supabase (solo Supabase + GitHub, sin Render)

La app usa **solo Supabase y GitHub**. El frontend en GitHub Pages se conecta **directo** a Supabase (Auth + base de datos). No hace falta desplegar un backend en Render ni en otro servicio.

```
GitHub Pages (frontend)  →  Supabase (Auth + Postgres con RLS)
```

---

## 1. Crear el proyecto en Supabase

1. Entrá a **[supabase.com](https://supabase.com)** e iniciá sesión (o creá cuenta con GitHub).
2. **New project**:
   - **Name**: por ejemplo `relevamiento-gesell`
   - **Database Password**: anotala en un lugar seguro.
   - **Region**: la más cercana (ej. South America).
3. Esperá a que el proyecto esté listo.

---

## 2. Crear las tablas y RLS (ejecutar SQL en orden)

En **SQL Editor** del proyecto:

1. **Primero**: copiá todo **`supabase/schema.sql`** del repo → New query → Run.  
   Se crean las tablas: `users`, `alojamientos`, `relevamientos`, `inmobiliarias`, `balnearios`, configs, etc.

2. **Después**: copiá todo **`supabase/migrations/001_auth_and_rls.sql`** → New query → Run.  
   Se crean la tabla **`profiles`** (vinculada a Auth), las políticas **RLS** y el trigger para que cada nuevo usuario en Auth tenga una fila en `profiles` con rol `viewer`.

---

## 3. Primer usuario admin

Los usuarios se crean en **Supabase Auth**. El rol y la oficina se guardan en la tabla **`profiles`**.

1. En Supabase: **Authentication → Users → Add user**.
   - Email y contraseña (ej. `admin@gesell.gob.ar` / una contraseña segura).
2. En la lista de usuarios, abrí el que creaste y copiá el **User UID** (es un UUID).
3. En **SQL Editor** ejecutá (reemplazá `EL-UUID` y el email si cambiaste):

   ```sql
   INSERT INTO profiles (id, email, nombre, rol, oficina)
   VALUES ('EL-UUID', 'admin@gesell.gob.ar', 'Admin', 'admin', NULL)
   ON CONFLICT (id) DO UPDATE SET rol = 'admin', nombre = 'Admin';
   ```

Con eso podés entrar a la app con ese email/contraseña y tendrás permisos de admin (gestionar usuarios, roles, lanzar relevamientos, etc.). Los demás usuarios los podés crear desde la app (si implementás alta desde admin) o en Auth y luego asignarles rol/oficina en **Roles y permisos → Usuarios** (editando su perfil).

---

## 4. URL y claves para el frontend (GitHub Secrets)

Para que el build del frontend en GitHub Actions pueda conectarse a tu proyecto:

1. En Supabase: **Project Settings → API**.
2. Ahí vas a ver:
   - **Project URL** → ese valor va en el secreto **VITE_SUPABASE_URL**.
   - **Project API keys**:
     - **anon (public)**: esa va en **VITE_SUPABASE_ANON_KEY**.  
       Es segura en el frontend porque RLS limita qué filas puede ver/editar cada usuario según su rol.
     - **service_role**: no la uses en el frontend ni la subas a GitHub. Solo para scripts o backend propio si algún día lo usás.

En el repo de GitHub:

- **Settings → Secrets and variables → Actions**
- **New repository secret**:
  - Nombre: **VITE_SUPABASE_URL** → Valor: la Project URL.
  - Nombre: **VITE_SUPABASE_ANON_KEY** → Valor: la clave anon/public.

Con eso, cada vez que se haga push a `main`, el workflow construye el frontend con esas variables y la app en GitHub Pages queda conectada a tu Supabase.

---

## 5. Probar en local

En la carpeta **frontend**:

```bash
cp .env.example .env
```

En `.env` poné (mismos valores que en GitHub Secrets):

- `VITE_SUPABASE_URL=https://tu-proyecto.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJ...` (la clave anon)

Luego:

```bash
npm install
npm run dev
```

Entrá a http://localhost:5173 e iniciá sesión con el usuario admin que configuraste.

---

## Resumen

- **No se usa Render** ni otro backend en producción.
- **Supabase** hace de base de datos y de autenticación.
- **GitHub Pages** sirve el frontend; el build usa **VITE_SUPABASE_URL** y **VITE_SUPABASE_ANON_KEY** desde los secretos del repo.
- El **primer admin** se crea en Auth y luego se actualiza `profiles` con rol `admin` desde el SQL Editor.
