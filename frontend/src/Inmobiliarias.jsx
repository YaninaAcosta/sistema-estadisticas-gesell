import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Contacto from './components/Contacto';
import Modal from './components/Modal';

const LOCALIDADES_OPTIONS = ['Villa Gesell', 'Mar de las Pampas', 'Mar Azul', 'Las Gaviotas', 'Colonia Marina'];
const OFICINAS_OPTIONS = ['Centro', 'Mar de las Pampas', 'Norte', 'Terminal'];
const LLAMADOS_OPTIONS = ['Envié WhatsApp', 'Llamado', 'No llama', 'Sin contacto'];

export default function Inmobiliarias() {
  const { api, user, canEditInmobiliarias, isAdmin } = useAuth();
  const [tab, setTab] = useState('relevamiento');
  const [fechas, setFechas] = useState([]);
  const [fecha, setFecha] = useState('');
  const [data, setData] = useState({ list: [], fecha: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [filterOficina, setFilterOficina] = useState('');
  // Borrador local para % (evita guardar en cada tecla)
  const [draftPct, setDraftPct] = useState({});
  const pctKey = (id, field) => `${id}-${field}`;
  const getPctValue = (id, field, serverVal) => {
    const key = pctKey(id, field);
    if (draftPct[key] !== undefined) return draftPct[key];
    return serverVal != null && serverVal !== '' ? String(serverVal) : '';
  };
  const setPctDraft = (id, field, value) => setDraftPct((prev) => ({ ...prev, [pctKey(id, field)]: value }));
  const clearPctDraft = (id, field) => setDraftPct((prev => { const n = { ...prev }; delete n[pctKey(id, field)]; return n; }));
  const parsePct = (s) => { const v = s.trim(); if (v === '') return null; const n = parseInt(v, 10); if (Number.isNaN(n)) return undefined; return n; };
  const savePctOnBlur = (inmobiliariaId, field, serverVal) => {
    const key = pctKey(inmobiliariaId, field);
    const raw = draftPct[key] !== undefined ? draftPct[key] : (serverVal != null ? String(serverVal) : '');
    const num = parsePct(raw);
    if (num === undefined) { clearPctDraft(inmobiliariaId, field); return; }
    if (num !== null && (num < 1 || num > 100)) { clearPctDraft(inmobiliariaId, field); return; }
    clearPctDraft(inmobiliariaId, field);
    updateRow(inmobiliariaId, field, num);
  };

  const loadFechas = () => {
    api('/relevamiento-inmobiliarias/fechas')
      .then((r) => r.json())
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setFechas(arr);
        if (arr.length && (!fecha || !arr.includes(fecha))) setFecha(arr[0]);
      })
      .catch(() => setFechas([]));
  };
  useEffect(loadFechas, []);

  useEffect(() => {
    if (!fecha) {
      setData({ list: [], fecha: '' });
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/relevamiento-inmobiliarias?fecha=${fecha}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [fecha]);

  const loadList = () => {
    setListLoading(true);
    api('/inmobiliarias').then((r) => r.json()).then(setList).catch(() => setError('Error al cargar')).finally(() => setListLoading(false));
  };
  useEffect(() => {
    if (tab === 'listado') loadList();
  }, [tab]);

  const updateRow = async (inmobiliariaId, field, value) => {
    const item = data.list.find((x) => x.inmobiliaria.id === inmobiliariaId);
    if (!item) return;
    setSaving(inmobiliariaId);
    const r = item.relevamiento || {};
    const payload = {
      fecha: data.fecha,
      inmobiliaria_id: inmobiliariaId,
      ocupacion_dptos_pct: field === 'ocupacion_dptos_pct' ? value : (r.ocupacion_dptos_pct ?? null),
      ocupacion_casas_pct: field === 'ocupacion_casas_pct' ? value : (r.ocupacion_casas_pct ?? null),
      llamados: field === 'llamados' ? value : (r.llamados ?? null),
      observaciones: field === 'observaciones' ? value : (r.observaciones ?? null),
      oficina: field === 'oficina' ? value : (r.oficina ?? item.inmobiliaria?.oficina ?? null),
    };
    const res = await api('/relevamiento-inmobiliarias', { method: 'POST', body: JSON.stringify(payload) });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => ({
        ...prev,
        list: prev.list.map((x) =>
          x.inmobiliaria.id === inmobiliariaId ? { ...x, relevamiento: updated } : x
        ),
      }));
    }
  };

  const filteredList = data.list.filter((item) => {
    const of = item.relevamiento?.oficina ?? item.inmobiliaria?.oficina ?? '';
    if (filterOficina && of !== filterOficina) return false;
    return true;
  });

  const oficinasFromList = [...new Set([...OFICINAS_OPTIONS, ...list.map((i) => i.oficina).filter(Boolean)])].sort();

  // Listado CRUD
  const openEdit = (i) => {
    setEditing(i.id);
    setForm({
      localidad: i.localidad || 'Villa Gesell',
      prestador: i.prestador || '',
      direccion: i.direccion || '',
      telefono_fijo: i.telefono_fijo || '',
      whatsapp: i.whatsapp || '',
      oficina: i.oficina || '',
    });
  };
  const openNew = () => {
    setEditing('new');
    setForm({ localidad: 'Villa Gesell', prestador: '', direccion: '', telefono_fijo: '', whatsapp: '', oficina: '' });
  };
  const cancel = () => { setEditing(null); setError(''); };
  const doSave = async () => {
    const body = { ...form, direccion: form.direccion || null, telefono_fijo: form.telefono_fijo || null, whatsapp: form.whatsapp || null, oficina: form.oficina || null };
    if (editing === 'new') {
      const res = await api('/inmobiliarias', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al crear'); return; }
    } else {
      const res = await api(`/inmobiliarias/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al guardar'); return; }
    }
    cancel();
    loadList();
  };
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta inmobiliaria?')) return;
    const res = await api(`/inmobiliarias/${id}`, { method: 'DELETE' });
    if (res.ok) loadList();
  };
  const toggleOculto = async (i) => {
    const res = await api(`/inmobiliarias/${i.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...i, oculto: !i.oculto }),
    });
    if (res.ok) loadList();
  };

  return (
    <div className="card">
      <div className="page-header-with-tabs">
        <h2>Inmobiliarias</h2>
        <div className="tabs-and-action">
          <div className="tab-group">
            <button type="button" className={tab === 'relevamiento' ? 'active' : 'secondary'} onClick={() => setTab('relevamiento')}>Relevamiento</button>
            <button type="button" className={tab === 'listado' ? 'active' : 'secondary'} onClick={() => setTab('listado')}>Listado</button>
          </div>
          {canEditInmobiliarias && (
            <button type="button" className="btn-action-secondary" onClick={openNew} style={tab !== 'listado' ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
              Nueva inmobiliaria
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}

      {tab === 'relevamiento' && (
        <>
          <div className="workarea" style={{ marginTop: '1rem', padding: 0 }}>
            <div className="workarea-filters">
              <span className="workarea-filters-label">Filtros</span>
              <div className="workarea-filters-controls">
                <label className="filter-group">
                  <span className="filter-label">Fecha</span>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="filter-input" />
                </label>
                <label className="filter-group">
                  <span className="filter-label">Oficina</span>
                  <select value={filterOficina} onChange={(e) => setFilterOficina(e.target.value)} className="filter-select">
                    <option value="">Todas</option>
                    {oficinasFromList.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {fecha && data.list.length > 0 && (
              <p className="workarea-context" role="status">
                Relevamiento del {fecha} · {filteredList.length} de {data.list.length} inmobiliarias{filterOficina ? ' · Filtro aplicado' : ''}
              </p>
            )}
          </div>
          {loading ? (
            <p className="empty">Cargando…</p>
          ) : !fecha ? (
            <p className="empty">Elegí una fecha. Si no hay fechas, lanzá un relevamiento desde Roles y permisos.</p>
          ) : !data.list.length ? (
            <p className="empty">No hay inmobiliarias cargadas. Agregá en el listado.</p>
          ) : (
            <div className="workarea-table-wrap">
              <table className="relevamiento-table">
                <thead>
                  <tr>
                    <th>Localidad</th>
                    <th>Prestador</th>
                    <th>Dirección / Contacto</th>
                    <th className="th-num">% Dptos 2/3 amb.</th>
                    <th className="th-num">% Casas/Dúplex</th>
                    <th>Llamados</th>
                    <th>Observaciones</th>
                    <th>Oficina</th>
                    <th>Agente</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const i = item.inmobiliaria;
                    const r = item.relevamiento || {};
                    const readOnly = !canEditInmobiliarias;
                    return (
                      <tr key={i.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td>{i.localidad ?? '—'}</td>
                        <td><strong>{i.prestador}</strong></td>
                        <td className="cell-contacto"><Contacto a={{ ...i, pagina_web: null }} /></td>
                        <td className="cell-num">
                          {readOnly ? (r.ocupacion_dptos_pct != null ? `${r.ocupacion_dptos_pct}%` : '—') : (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="input-num"
                              placeholder="1-100"
                              value={getPctValue(i.id, 'ocupacion_dptos_pct', r.ocupacion_dptos_pct)}
                              onChange={(e) => setPctDraft(i.id, 'ocupacion_dptos_pct', e.target.value)}
                              onBlur={() => savePctOnBlur(i.id, 'ocupacion_dptos_pct', r.ocupacion_dptos_pct)}
                            />
                          )}
                        </td>
                        <td className="cell-num">
                          {readOnly ? (r.ocupacion_casas_pct != null ? `${r.ocupacion_casas_pct}%` : '—') : (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="input-num"
                              placeholder="1-100"
                              value={getPctValue(i.id, 'ocupacion_casas_pct', r.ocupacion_casas_pct)}
                              onChange={(e) => setPctDraft(i.id, 'ocupacion_casas_pct', e.target.value)}
                              onBlur={() => savePctOnBlur(i.id, 'ocupacion_casas_pct', r.ocupacion_casas_pct)}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.llamados ?? '—') : (
                            <select value={r.llamados ?? ''} onChange={(e) => updateRow(i.id, 'llamados', e.target.value)}>
                              <option value="">—</option>
                              {LLAMADOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.observaciones ?? '—') : (
                            <input className="input-text" value={r.observaciones ?? ''} onChange={(e) => updateRow(i.id, 'observaciones', e.target.value)} placeholder="Notas" />
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.oficina ?? i.oficina ?? '—') : (
                            <select value={r.oficina ?? i.oficina ?? ''} onChange={(e) => updateRow(i.id, 'oficina', e.target.value)}>
                              <option value="">—</option>
                              {OFICINAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </td>
                        <td>{r.agente ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'listado' && (
        <>
          {listLoading ? (
            <p className="empty">Cargando…</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Localidad</th>
                    <th>Prestador</th>
                    <th>Dirección</th>
                    <th>Tel. fijo</th>
                    <th>WhatsApp</th>
                    <th>Oficina</th>
                    {(isAdmin || canEditInmobiliarias) && <th className="th-actions">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={i.id} className={i.oculto ? 'row-oculto' : ''}>
                      <td>{i.localidad}</td>
                      <td>{i.prestador}</td>
                      <td>{i.direccion || '—'}</td>
                      <td>{i.telefono_fijo || '—'}</td>
                      <td>{i.whatsapp || '—'}</td>
                      <td>{i.oficina || '—'}</td>
                      {(isAdmin || canEditInmobiliarias) && (
                        <td className="table-actions table-actions-inline cell-actions">
                          {isAdmin && (
                            <button type="button" className="btn-sm btn-ocultar" onClick={() => toggleOculto(i)}>{i.oculto ? 'Mostrar' : 'Ocultar'}</button>
                          )}
                          {canEditInmobiliarias && (
                            <>
                              <button type="button" className="btn-sm secondary" onClick={() => openEdit(i)}>Editar</button>
                              <button type="button" className="btn-sm danger" onClick={() => remove(i.id)}>Eliminar</button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Modal open={!!editing} onClose={cancel} title={editing === 'new' ? 'Nueva inmobiliaria' : 'Editar inmobiliaria'} maxWidth="480px">
            <div className="form-edit-panel" style={{ marginTop: 0, border: 'none', padding: 0 }}>
              <div className="form-grid">
                <div className="form-row">
                  <label>Prestador</label>
                  <input value={form.prestador} onChange={(e) => setForm({ ...form, prestador: e.target.value })} placeholder="Nombre" />
                </div>
                <div className="form-row">
                  <label>Localidad</label>
                  <select value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })}>
                    {LOCALIDADES_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Dirección</label>
                  <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Teléfono fijo</label>
                  <input value={form.telefono_fijo} onChange={(e) => setForm({ ...form, telefono_fijo: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>WhatsApp</label>
                  <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Oficina</label>
                  <select value={form.oficina || ''} onChange={(e) => setForm({ ...form, oficina: e.target.value })}>
                    <option value="">—</option>
                    {OFICINAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={doSave}>Guardar</button>
                <button type="button" className="secondary" onClick={cancel}>Cancelar</button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
