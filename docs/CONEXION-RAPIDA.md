# Consejos para que la app funcione más rápido

La app no usa un backend propio: se conecta **directo a Supabase** (Auth + base de datos) desde el navegador. La velocidad depende sobre todo de la red y de la región de Supabase.

## 1. Región del proyecto en Supabase

- Entrá a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Settings** → **General**.
- Revisá **Region**. Si tus usuarios están en Argentina/Latinoamérica, lo ideal es una región cercana (por ejemplo **South America (São Paulo)** si está disponible para tu plan).
- Si el proyecto está en otra región (ej. Europa), las peticiones serán más lentas.

## 2. Login optimista (ya implementado)

- Al hacer **Entrar**, la app te deja pasar en cuanto Supabase confirma usuario y contraseña.
- El perfil y los permisos se cargan en segundo plano; puede que veas "Cargando…" en el nombre un momento hasta que termine.
- Así se evita esperar la llamada extra al perfil antes de mostrar la app.

## 3. Mantener la sesión

- La sesión se guarda en el navegador (localStorage). No hace falta volver a ingresar en cada visita.
- Si cerrás el navegador y volvés a la misma URL, deberías seguir logueado.

## 4. Si sigue yendo lento

- Probar con **otra red** (otro WiFi o datos del celular) para descartar red lenta o cortes.
- Revisar en Supabase → **Settings** → **API** que estés usando la **Project URL** y la **anon public** key correctas en GitHub Secrets (y en `.env` en local).
- En el navegador: F12 → pestaña **Network**; al hacer login o cargar una pantalla, ver cuánto tardan las peticiones a `supabase.co` y si alguna falla (4xx/5xx).

## Resumen

| Qué hacer | Dónde |
|-----------|--------|
| Revisar región del proyecto | Supabase → Settings → General → Region |
| Dejar que la app cargue perfil en segundo plano | Ya está: entrás rápido, luego se actualiza el nombre/permisos |
| No cerrar sesión si no hace falta | La sesión persiste en el navegador |
