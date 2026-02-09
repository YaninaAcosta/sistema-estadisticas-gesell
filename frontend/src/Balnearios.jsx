import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Contacto from './components/Contacto';
import Modal from './components/Modal';

const LOCALIDADES_OPTIONS = ['Villa Gesell', 'Mar de las Pampas', 'Mar Azul', 'Las Gaviotas', 'Colonia Marina'];
const OFICINAS_OPTIONS = ['Centro', 'Mar de las Pampas', 'Norte', 'Terminal'];
const LLAMADOS_OPTIONS = ['Envié WhatsApp', 'Llamado', 'No llama', 'Sin contacto', 'Tel fijo'];

export default function Balnearios() {
  const { api, canEditBalnearios, isAdmin } = useAuth();
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
  const [draftPct, setDraftPct] = useState({});
  const pctKey = (id) => `baln-${id}`;
  const getPctValue = (id, serverVal) => {
    const key = pctKey(id);
    if (draftPct[key] !== undefined) return draftPct[key];
    return serverVal != null && serverVal !== '' ? String(serverVal) : '';
  };
  const setPctDraft = (id, value) => setDraftPct((prev) => ({ ...prev, [pctKey(id)]: value }));
  const clearPctDraft = (id) => setDraftPct((prev) => { const n = { ...prev }; delete n[pctKey(id)]; return n; });
  const parsePct = (s) => { const v = s.trim(); if (v === '') return null; const n = parseInt(v, 10); if (Number.isNaN(n)) return undefined; return n; };
  const savePctOnBlur = (balnearioId, serverVal) => {
    const key = pctKey(balnearioId);
    const raw = draftPct[key] !== undefined ? draftPct[key] : (serverVal != null ? String(serverVal) : '');
    const num = parsePct(raw);
    if (num === undefined) { clearPctDraft(balnearioId); return; }
    if (num !== null && (num < 1 || num > 100)) { clearPctDraft(balnearioId); return; }
    clearPctDraft(balnearioId);
    updateRow(balnearioId, 'ocupacion_pct', num);
  };

  const loadFechas = () => {
    api('/relevamiento-balnearios/fechas')
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
    api(`/relevamiento-balnearios?fecha=${fecha}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [fecha]);

  const loadList = () => {
    setListLoading(true);
    api('/balnearios').then((r) => r.json()).then(setList).catch(() => setError('Error al cargar')).finally(() => setListLoading(false));
  };
  useEffect(() => {
    if (tab === 'listado') loadList();
  }, [tab]);

  const updateRow = async (balnearioId, field, value) => {
    const item = data.list.find((x) => x.balneario.id === balnearioId);
    if (!item) return;
    setSaving(balnearioId);
    const r = item.relevamiento || {};
    const payload = {
      fecha: data.fecha,
      balneario_id: balnearioId,
      ocupacion_pct: field === 'ocupacion_pct' ? value : (r.ocupacion_pct ?? null),
      llamados: field === 'llamados' ? value : (r.llamados ?? null),
      observaciones: field === 'observaciones' ? value : (r.observaciones ?? null),
      oficina: field === 'oficina' ? value : (r.oficina ?? item.balneario?.oficina ?? null),
    };
    const res = await api('/relevamiento-balnearios', { method: 'POST', body: JSON.stringify(payload) });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => ({
        ...prev,
        list: prev.list.map((x) =>
          x.balneario.id === balnearioId ? { ...x, relevamiento: updated } : x
        ),
      }));
    }
  };

  const filteredList = data.list.filter((item) => {
    const of = item.relevamiento?.oficina ?? item.balneario?.oficina ?? '';
    if (filterOficina && of !== filterOficina) return false;
    return true;
  });

  const oficinasFromList = [...new Set([...OFICINAS_OPTIONS, ...list.map((i) => i.oficina).filter(Boolean)])].sort();

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
      const res = await api('/balnearios', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al crear'); return; }
    } else {
      const res = await api(`/balnearios/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al guardar'); return; }
    }
    cancel();
    loadList();
  };
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este balneario?')) return;
    const res = await api(`/balnearios/${id}`, { method: 'DELETE' });
    if (res.ok) loadList();
  };
  const toggleOculto = async (i) => {
    const res = await api(`/balnearios/${i.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...i, oculto: !i.oculto }),
    });
    if (res.ok) loadList();
  };

  return (
    <div className="card">
      <div className="page-header-with-tabs">
        <h2>Balnearios</h2>
        <div className="tabs-and-action">
          <div className="tab-group">
            <button type="button" className={tab === 'relevamiento' ? 'active' : 'secondary'} onClick={() => setTab('relevamiento')}>Relevamiento</button>
            <button type="button" className={tab === 'listado' ? 'active' : 'secondary'} onClick={() => setTab('listado')}>Listado</button>
          </div>
          {canEditBalnearios && (
            <button type="button" className="btn-action-secondary" onClick={openNew} style={tab !== 'listado' ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
              Nuevo balneario
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
                Relevamiento del {fecha} · {filteredList.length} de {data.list.length} balnearios{filterOficina ? ' · Filtro aplicado' : ''}
              </p>
            )}
          </div>
          {loading ? (
            <p className="empty">Cargando…</p>
          ) : !fecha ? (
            <p className="empty">Elegí una fecha. Si no hay fechas, lanzá un relevamiento desde Roles y permisos.</p>
          ) : !data.list.length ? (
            <p className="empty">No hay balnearios cargados. Agregá en el listado.</p>
          ) : (
            <div className="workarea-table-wrap">
              <table className="relevamiento-table">
                <thead>
                  <tr>
                    <th>Localidad</th>
                    <th>Prestador</th>
                    <th>Dirección / Contacto</th>
                    <th className="th-num">% Ocupación reservas</th>
                    <th>Llamados</th>
                    <th>Observaciones</th>
                    <th>Oficina</th>
                    <th>Agente</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => {
                    const b = item.balneario;
                    const r = item.relevamiento || {};
                    const readOnly = !canEditBalnearios;
                    return (
                      <tr key={b.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td>{b.localidad ?? '—'}</td>
                        <td><strong>{b.prestador}</strong></td>
                        <td className="cell-contacto"><Contacto a={{ ...b, pagina_web: null }} /></td>
                        <td className="cell-num">
                          {readOnly ? (r.ocupacion_pct != null ? `${r.ocupacion_pct}%` : '—') : (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="input-num"
                              placeholder="1-100"
                              value={getPctValue(b.id, r.ocupacion_pct)}
                              onChange={(e) => setPctDraft(b.id, e.target.value)}
                              onBlur={() => savePctOnBlur(b.id, r.ocupacion_pct)}
                            />
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.llamados ?? '—') : (
                            <select value={r.llamados ?? ''} onChange={(e) => updateRow(b.id, 'llamados', e.target.value)}>
                              <option value="">—</option>
                              {LLAMADOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.observaciones ?? '—') : (
                            <input className="input-text" value={r.observaciones ?? ''} onChange={(e) => updateRow(b.id, 'observaciones', e.target.value)} placeholder="Notas" />
                          )}
                        </td>
                        <td>
                          {readOnly ? (r.oficina ?? b.oficina ?? '—') : (
                            <select value={r.oficina ?? b.oficina ?? ''} onChange={(e) => updateRow(b.id, 'oficina', e.target.value)}>
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
                    {(isAdmin || canEditBalnearios) && <th className="th-actions">Acciones</th>}
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
                      {(isAdmin || canEditBalnearios) && (
                        <td className="table-actions table-actions-inline cell-actions">
                          {isAdmin && (
                            <button type="button" className="btn-sm btn-ocultar" onClick={() => toggleOculto(i)}>{i.oculto ? 'Mostrar' : 'Ocultar'}</button>
                          )}
                          {canEditBalnearios && (
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
          <Modal open={!!editing} onClose={cancel} title={editing === 'new' ? 'Nuevo balneario' : 'Editar balneario'} maxWidth="480px">
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
