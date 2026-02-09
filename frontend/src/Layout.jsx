import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Modal from './components/Modal';

export default function Layout() {
  const { user, logout, canManageUsers, canLaunchRelevamiento, canViewInmobiliarias, canViewBalnearios } = useAuth();
  const showAdmin = canManageUsers || canLaunchRelevamiento;
  const [ayudaOpen, setAyudaOpen] = useState(false);

  return (
    <div className="app-layout">
      <nav className="nav">
        <a href="/" className="nav-logo">
          <img src="/logo-gesell.png" alt="Villa Gesell" />
        </a>
        <div className="nav-links">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/alojamientos">Alojamientos</NavLink>
          {canViewInmobiliarias && <NavLink to="/inmobiliarias">Inmobiliarias</NavLink>}
          {canViewBalnearios && <NavLink to="/balnearios">Balnearios</NavLink>}
          {showAdmin && <NavLink to="/admin">Roles y permisos</NavLink>}
        </div>
        <div className="nav-user-block">
          <button type="button" className="nav-ayuda-btn" onClick={() => setAyudaOpen(true)}>
            Ayuda
          </button>
          <span className="nav-user">
            {user?.nombre}
            <span className={`badge ${user?.rol}`}>{user?.rol}</span>
          </span>
          <button type="button" className="secondary" onClick={logout}>Salir</button>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
      <Modal open={ayudaOpen} onClose={() => setAyudaOpen(false)} title="Instructivo" maxWidth="720px">
        <div className="instructivo-admin">
          <p className="admin-intro">Guía rápida para usar la plataforma de relevamiento.</p>
          <section className="instructivo-section">
            <h4>1. Alojamientos: relevamiento y listado</h4>
            <p>En <strong>Alojamientos</strong> hay dos pestañas: <strong>Relevamiento</strong> (cargar datos por fecha: plazas ocupadas, reservas, disponibilidad, llamados) y <strong>Listado</strong> (gestionar establecimientos). En Listado solo los usuarios con permiso pueden crear, editar o eliminar; los administradores pueden <strong>ocultar</strong> un alojamiento.</p>
          </section>
          <section className="instructivo-section">
            <h4>2. Lanzar un relevamiento</h4>
            <p>En <strong>Roles y permisos → Lanzar relevamiento</strong> elegí la fecha y qué datos se van a consultar ese día: ocupación (plazas ocupadas) y/o reservas (%). Al lanzar, esa fecha queda disponible en Alojamientos → Relevamiento para que los agentes carguen datos.</p>
          </section>
          <section className="instructivo-section">
            <h4>3. Cargar datos del relevamiento</h4>
            <p>En <strong>Alojamientos → Relevamiento</strong> seleccioná la fecha y completá por cada alojamiento. Podés filtrar por localidad, oficina y agente. El botón <strong>Exportar CSV</strong> descarga el listado del día.</p>
          </section>
          <section className="instructivo-section">
            <h4>4. Usuarios y permisos</h4>
            <p>En <strong>Permisos por rol</strong> definís qué puede hacer cada rol. En <strong>Usuarios</strong> asignás rol y oficina(s) a cada persona.</p>
          </section>
        </div>
      </Modal>
    </div>
  );
}
