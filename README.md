# Sistema de relevamiento de estadísticas de turismo — Villa Gesell

Sistema para cargar y consultar datos de ocupación por fecha (alojamientos, inmobiliarias, balnearios). Roles (solo lectura, agente, admin), Supabase como base de datos y despliegue del frontend en GitHub Pages.

**Repo:** [github.com/YaninaAcosta/sistema-estadisticas-gesell](https://github.com/YaninaAcosta/sistema-estadisticas-gesell)

---

## GitHub Pages (ver la app en vivo y compartirla con el equipo)

La **interfaz** (React) se publica en GitHub Pages. La **API** (backend Node + Supabase) tiene que estar desplegada en algún servicio (Render, Railway, etc.) para que la app en github.io funcione.

### 1. Desplegar el backend (API) en Render (gratis)

1. Entrá a [render.com](https://render.com) y registrate con GitHub.
2. **New → Web Service**.
3. Conectá el repo **sistema-estadisticas-gesell** y elegí:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Environment**: agregá las variables (no las subas a GitHub):
     - `SUPABASE_URL` = tu URL de Supabase
     - `SUPABASE_SERVICE_ROLE_KEY` = tu service role key de Supabase
     - `JWT_SECRET` = una frase larga y aleatoria (ej. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
     - `PORT` = `3001`
4. Dejá que Render construya y arranque. Te va a dar una URL tipo:  
   **https://sistema-estadisticas-gesell-xxxx.onrender.com**

Esa URL es la **base de tu API**. No le agregues `/api` al final; el frontend ya usa `/api` en cada ruta.

### 2. Activar GitHub Pages y configurar el secreto

1. En tu repo **sistema-estadisticas-gesell** en GitHub:
   - **Settings → Pages**
   - En **Source** elegí: **GitHub Actions** (no "Deploy from a branch").
2. **Settings → Secrets and variables → Actions**
   - **New repository secret**
   - Nombre: **VITE_API_URL**
   - Valor: la URL del backend **sin** barra final, ej.  
     `https://sistema-estadisticas-gesell-xxxx.onrender.com`

Cada vez que hagas **push a `main`**, el workflow construye el frontend y lo publica en Pages. La app quedará en:

**https://yaninaacosta.github.io/sistema-estadisticas-gesell/**

Compartí ese link con tu equipo. Para que funcione, el backend en Render debe estar arriba y con las variables de Supabase bien configuradas.

### 3. CORS

El backend ya acepta peticiones desde `http://localhost:5173` y desde cualquier `https://*.github.io`. Si usás otro dominio para el frontend, agregá en Render la variable **CORS_ORIGIN** con la URL separada por comas si son varias.

---

## Probar en local

### Backend

```bash
cd backend
cp .env.example .env   # creá .env con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm install
npm run dev
```

Backend en **http://localhost:3001**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend en **http://localhost:5173** (el proxy apunta al backend en 3001).

### Usuarios de prueba

Si corriste el seed: **admin@gesell.gob.ar** / **gesell123** (y los otros que estén en el seed).

---

## Estructura

- **frontend**: React + Vite, login, vistas por rol, tablas de relevamiento.
- **backend**: Express, JWT, API REST; usa **Supabase** (Postgres).
- **supabase/schema.sql**: esquema de tablas para Supabase.

## Permisos por rol

- **Viewer**: solo ver.
- **Agente**: ver y editar relevamientos (no alojamientos ni usuarios).
- **Admin**: editar todo (alojamientos, relevamientos, usuarios, permisos).
