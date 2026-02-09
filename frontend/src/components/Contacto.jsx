import React from 'react';

/**
 * Muestra dirección, teléfono, WhatsApp y página web de un alojamiento.
 * Usado en Relevamiento y Alojamientos en la columna "Dirección / Contacto".
 */
export default function Contacto({ a }) {
  const tel = a.telefono_fijo?.replace(/\D/g, '');
  const wa = a.whatsapp?.replace(/\D/g, '');
  return (
    <div className="contacto-cell">
      {a.direccion && <span className="contacto-direccion">{a.direccion}</span>}
      <div className="contacto-links">
        {tel && (
          <a href={`tel:${tel}`} className="contacto-link" title="Llamar">
            📞 {a.telefono_fijo}
          </a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="contacto-link contacto-wa" title="WhatsApp">
            WhatsApp
          </a>
        )}
        {a.pagina_web && (
          <a href={a.pagina_web.startsWith('http') ? a.pagina_web : `https://${a.pagina_web}`} target="_blank" rel="noopener noreferrer" className="contacto-link" title="Página web">
            Página web
          </a>
        )}
        {!tel && !wa && !a.pagina_web && a.direccion && '—'}
        {!tel && !wa && !a.pagina_web && !a.direccion && '—'}
      </div>
    </div>
  );
}
