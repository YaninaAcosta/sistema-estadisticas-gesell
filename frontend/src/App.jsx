import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './Login';
import Alojamientos from './Alojamientos';
import Inmobiliarias from './Inmobiliarias';
import Balnearios from './Balnearios';
import Inicio from './Inicio';
import Admin from './Admin';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="alojamientos" element={<Alojamientos />} />
        <Route path="relevamiento" element={<Navigate to="/alojamientos" replace />} />
        <Route path="inmobiliarias" element={<Inmobiliarias />} />
        <Route path="balnearios" element={<Balnearios />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
