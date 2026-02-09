import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Inicio() {
  const { canViewInmobiliarias, canViewBalnearios } = useAuth();

  return (
    <div className="card">
      <p className="dashboard-hero">Partido de Villa Gesell</p>
      <h2>Relevamiento de ocupación</h2>
      <p className="dashboard-subtitle">
        Cargá y consultá datos de ocupación por fecha y alojamiento.
      </p>
      <div className="dashboard-grid">
        <Link to="/alojamientos" className="dashboard-tile tile-alojamientos">
          <span className="tile-icon-wrap">🏨</span>
          <div className="tile-content">
            <h3 className="tile-title">Alojamientos</h3>
            <p className="tile-desc">Relevamiento por fecha (cargar datos) y listado de establecimientos (prestadores, contacto, plazas).</p>
          </div>
          <span className="tile-arrow" aria-hidden>→</span>
        </Link>
        {canViewInmobiliarias && (
          <Link to="/inmobiliarias" className="dashboard-tile tile-inmobiliarias">
            <span className="tile-icon-wrap">🏠</span>
            <div className="tile-content">
              <h3 className="tile-title">Inmobiliarias</h3>
              <p className="tile-desc">Relevamiento por fecha (% dptos 2/3 amb, casas/dúplex) y listado de inmobiliarias.</p>
            </div>
            <span className="tile-arrow" aria-hidden>→</span>
          </Link>
        )}
        {canViewBalnearios && (
          <Link to="/balnearios" className="dashboard-tile tile-balnearios">
            <span className="tile-icon-wrap">🏖</span>
            <div className="tile-content">
              <h3 className="tile-title">Balnearios</h3>
              <p className="tile-desc">Relevamiento por fecha (% ocupación) y listado de balnearios.</p>
            </div>
            <span className="tile-arrow" aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
