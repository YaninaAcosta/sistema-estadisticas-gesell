# Sistema de relevamiento de estadísticas de turismo — Villa Gesell

Sistema para cargar y consultar datos de ocupación por fecha (alojamientos, inmobiliarias, balnearios). Roles (solo lectura, agente, admin). **Solo Supabase + GitHub**: el frontend en GitHub Pages se conecta directo a Supabase (Auth y base de datos con RLS). No se usa backend en producción ni Render.

**Repo:** [github.com/YaninaAcosta/sistema-estadisticas-gesell](https://github.com/YaninaAcosta/sistema-estadisticas-gesell)

---

## Cómo funciona (solo Supabase + GitHub)

```
GitHub Pages (frontend)  →  Supabase (Auth + Postgres con RLS)
```

- **Autenticación**: Supabase Auth (email/contraseña).
- **Datos**: el frontend lee y escribe en las tablas de Supabase; el acceso se controla con **Row Level Security (RLS)** según el rol de cada usuario.
- **Despliegue**: cada push a `main` construye el frontend y lo publica en GitHub Pages. En el build se inyectan la URL y la clave anónima de Supabase desde los secretos del repo.

---

## 1. Supabase (base de datos y auth)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutá en este orden:
   - Todo el contenido de **`supabase/schema.sql`**.
   - Todo el contenido de **`supabase/migrations/001_auth_and_rls.sql`** (tabla `profiles`, RLS, trigger para nuevos usuarios).
3. Creá el **primer usuario admin**:
   - En Supabase: **Authentication → Users → Add user** (email + contraseña).
   - Copiá el **UUID** del usuario recién creado.
   - En **SQL Editor** ejecutá algo como (reemplazá el UUID y el email):

   ```sql
   INSERT INTO profiles (id, email, nombre, rol, oficina)
   VALUES ('el-uuid-del-usuario', 'admin@ejemplo.com', 'Admin', 'admin', NULL)
   ON CONFLICT (id) DO UPDATE SET rol = 'admin', nombre = 'Admin';
   ```

   A partir de ahí podés entrar con ese email/contraseña y, desde la app, asignar roles y permisos a otros usuarios en **Roles y permisos → Usuarios**.

Guía paso a paso: **[docs/SUPABASE-CONEXION.md](docs/SUPABASE-CONEXION.md)**.

---

## 2. GitHub Pages y secretos

1. En el repo: **Settings → Pages** → **Source**: **GitHub Actions**.
2. **Settings → Secrets and variables → Actions** → **New repository secret** (dos secretos):
   - **VITE_SUPABASE_URL**: Project URL de Supabase (Project Settings → API).
   - **VITE_SUPABASE_ANON_KEY**: clave **anon / public** (no la service_role). Es segura para el frontend porque RLS restringe qué puede ver/editar cada usuario.

Cada push a `main` ejecuta el workflow que construye el frontend con esas variables y publica en Pages. La app queda en:

**https://yaninaacosta.github.io/sistema-estadisticas-gesell/**

(Reemplazá por tu usuario/repo si es otro.)

---

## 3. Probar en local

Solo hace falta el frontend (Supabase se usa desde el navegador).

```bash
cd frontend
cp .env.example .env   # creá .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Frontend en **http://localhost:5173**. Iniciá sesión con el usuario que creaste en Supabase (y al que le asignaste rol admin en `profiles`).

*(Opcional)* Si querés correr también el backend en local para otra API o scripts, en `backend` usá tu `.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; para la app web no es necesario.

---

## Estructura

- **frontend**: React + Vite; Auth y datos vía **Supabase** (cliente `@supabase/supabase-js`). Sin backend en producción.
- **supabase/schema.sql**: tablas base (alojamientos, relevamientos, inmobiliarias, balnearios, configs, etc.).
- **supabase/migrations/001_auth_and_rls.sql**: tabla `profiles`, RLS y trigger para nuevos usuarios.
- **backend**: opcional para desarrollo o tareas que requieran service role; la app en producción no lo usa.

## Permisos por rol

- **Viewer**: solo ver.
- **Agente**: ver y editar relevamientos (no alojamientos ni usuarios).
- **Admin**: editar todo (alojamientos, relevamientos, usuarios, permisos, lanzar fechas).
