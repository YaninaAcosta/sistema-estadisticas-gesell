import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './AuthContext';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
          <h1>Error en la aplicación</h1>
          <p>{this.state.error?.message || 'Error desconocido'}</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Revisá la consola del navegador (F12) para más detalles. Si acabás de desplegar, verificá que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén en GitHub → Settings → Secrets.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter basename="/">
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
