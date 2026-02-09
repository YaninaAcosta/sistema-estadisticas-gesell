# Cómo solucionar la lentitud (conexión con Supabase)

La demora viene de la **latencia** entre el navegador y el servidor de Supabase. La forma de solucionarlo es usar un proyecto de Supabase en una **región cercana** a tus usuarios.

## Opción A: Tu proyecto ya está en una región lejana (ej. Europa, USA)

En Supabase **no se puede cambiar la región** de un proyecto existente. Tenés que crear uno nuevo en la región correcta y apuntar la app ahí.

### Pasos

1. **Crear un proyecto nuevo en Supabase**
   - [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
   - Elegí **Region**: **South America (São Paulo)** (o la más cercana a Argentina que aparezca).
   - Completá nombre y contraseña de la DB. Esperá a que termine de crearse.

2. **Dejar la base igual que el proyecto viejo**
   - En el proyecto **nuevo**: **SQL Editor**.
   - Ejecutá en este orden los contenidos de:
     - `supabase/schema.sql`
     - `supabase/migrations/001_auth_and_rls.sql`
     - `supabase/migrations/002_fix_profiles_rls.sql`
     - `supabase/migrations/003_get_my_profile_rpc.sql`

3. **Crear el usuario admin en el proyecto nuevo**
   - **Authentication** → **Users** → **Add user** (o **Invite**). Creá un usuario con email `admin@local.gesell` y la contraseña que uses (ej. `gesell123`).
   - Copiá el **User UID** de ese usuario.
   - **SQL Editor** → ejecutá un `INSERT` en `profiles` con ese UID, por ejemplo:
     ```sql
     INSERT INTO profiles (id, email, nombre, rol, oficina)
     VALUES ('EL-UID-QUE-COPIASTE', 'admin@local.gesell', 'Admin', 'admin', NULL);
     ```

4. **Conectar la app al proyecto nuevo**
   - En el proyecto **nuevo**: **Settings** → **API**.
   - Copiá **Project URL** y **anon public** key.
   - En GitHub: repo → **Settings** → **Secrets and variables** → **Actions**.
   - Actualizá los secrets:
     - `VITE_SUPABASE_URL` = Project URL del proyecto nuevo.
     - `VITE_SUPABASE_ANON_KEY` = anon public key del proyecto nuevo.
   - Guardá. El próximo deploy (o un push a `main`) usará estos valores y la app hablará con el proyecto en South America.

5. **(Opcional) Datos**
   - Si tenés datos en el proyecto viejo que necesités en el nuevo, exportalos desde el viejo (Table Editor o SQL) e importalos en el nuevo.

---

## Opción B: Proyecto pausado (plan gratis)

En plan gratuito, los proyectos se **pausan** tras inactividad. La primera petición después de eso tarda mucho (reanudar el proyecto).

**Qué hacer:**  
Supabase Dashboard → elegí el proyecto → si ves que está pausado, **Restore project**. A partir de ahí las peticiones vuelven a ser normales hasta que se pause de nuevo.

Si necesitás que no se pause: **Upgrade** a un plan de pago (el proyecto deja de pausarse).

---

## Opción C: Revisar que la app apunte al proyecto correcto

Si la URL o la clave están mal en GitHub, la app puede estar hablando con otro proyecto o fallar y dar la sensación de “lentitud”.

- Repo → **Settings** → **Secrets and variables** → **Actions**.
- `VITE_SUPABASE_URL` debe ser exactamente la **Project URL** de Supabase (Settings → API) del proyecto que querés usar.
- `VITE_SUPABASE_ANON_KEY` debe ser la **anon public** de ese mismo proyecto.
- Sin espacios ni caracteres de más. Después de cambiarlos, hacer un nuevo deploy (push a `main`).

---

## Resumen

| Causa probable | Solución |
|----------------|----------|
| Proyecto en región lejana | Nuevo proyecto en South America (São Paulo), migrar schema + datos, actualizar GitHub Secrets. |
| Proyecto pausado (plan gratis) | Restore en el Dashboard; o pasar a plan de pago para que no se pause. |
| URL o key incorrectas | Corregir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en GitHub Secrets y volver a desplegar. |
