import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Contacto from './components/Contacto';
import Modal from './components/Modal';
import { CATEGORIAS_OPTIONS, normalizeCategoriaDisplay } from './utils/categoria';

const LOCALIDADES_OPTIONS = ['Villa Gesell', 'Mar de las Pampas', 'Mar Azul', 'Las Gaviotas', 'Colonia Marina'];
const OFICINAS_OPTIONS = ['Centro', 'Mar de las Pampas', 'Norte', 'Terminal'];

export default function Alojamientos() {
  const { api, canEditRelevamientos, canEditAlojamientos, user, isAdmin } = useAuth();
  const [tab, setTab] = useState('relevamiento');

  // —— Relevamiento tab state ——
  const [fechas, setFechas] = useState([]);
  const [fecha, setFecha] = useState('');
  const [data, setData] = useState({ list: [], config: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [copyingId, setCopyingId] = useState(null);
  const [filterLocalidad, setFilterLocalidad] = useState('');
  const [filterOficina, setFilterOficina] = useState('');
  const [filterAgente, setFilterAgente] = useState('');
  const [soloAsignado, setSoloAsignado] = useState(false);
  const [showModalCargarDatos, setShowModalCargarDatos] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // —— Listado tab state ——
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchNombre, setSearchNombre] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const loadFechas = () => {
    api('/relevamientos/fechas')
      .then((r) => r.json())
      .then((list) => {
        setFechas(Array.isArray(list) ? list : []);
        const arr = Array.isArray(list) ? list : [];
        // Siempre mostrar el último relevamiento lanzado (primera fecha = la más reciente)
        if (arr.length && (!fecha || !arr.includes(fecha))) setFecha(arr[0]);
      })
      .catch(() => setError('Error al cargar fechas'));
  };
  useEffect(() => { if (tab === 'relevamiento') loadFechas(); }, [tab]);

  useEffect(() => {
    if (!fecha || tab !== 'relevamiento') { setLoading(false); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    api(`/relevamientos?fecha=${fecha}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Error al cargar relevamiento'))
      .finally(() => setLoading(false));
  }, [fecha, tab]);

  const loadList = () => {
    setListLoading(true);
    api('/alojamientos').then((r) => r.json()).then(setList).catch(() => setError('Error al cargar alojamientos')).finally(() => setListLoading(false));
  };
  useEffect(() => { if (tab === 'listado') loadList(); }, [tab]);

  const updateRow = (alojamientoId, field, value) => {
    setData((d) => ({
      ...d,
      list: d.list.map((item) =>
        item.alojamiento.id === alojamientoId ? { ...item, relevamiento: { ...(item.relevamiento || {}), [field]: value } } : item
      ),
    }));
  };

  const saveRow = async (item, overrides = {}) => {
    const a = item.alojamiento;
    const r = { ...(item.relevamiento || {}), ...overrides };
    const plazasTotales = a.plazas_totales ?? null;
    const plazasOcupadas = r.plazas_ocupadas != null ? Number(r.plazas_ocupadas) : null;
    if (plazasTotales != null && plazasOcupadas != null && plazasOcupadas > plazasTotales) {
      setError('Las plazas ocupadas no pueden superar las plazas totales');
      return;
    }
    setSaving(a.id);
    setError('');
    const body = {
      fecha,
      alojamiento_id: a.id,
      plazas_ocupadas_anterior: r.plazas_ocupadas_anterior ?? null,
      plazas_ocupadas: r.plazas_ocupadas ?? null,
      reservas: data.config?.consultar_reservas ? (r.reservas ?? null) : undefined,
      disponibilidad_texto: r.disponibilidad_texto ?? null,
      llamados: r.llamados ?? null,
      observaciones: r.observaciones ?? null,
      oficina: r.oficina ?? a.oficina ?? null,
    };
    const res = await api('/relevamientos', { method: 'POST', body: JSON.stringify(body) });
    setSaving(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Error al guardar');
    } else {
      setSuccess('Guardado');
      setTimeout(() => setSuccess(''), 2500);
    }
    loadFechas();
    api(`/relevamientos?fecha=${fecha}`).then((res) => res.json()).then(setData);
  };

  const localidadesFromData = [...new Set(data.list.map((i) => i.alojamiento?.localidad).filter(Boolean))];
  const localidades = [...new Set([...LOCALIDADES_OPTIONS, ...localidadesFromData])].sort();
  const oficinasFromRelev = data.list.map((i) => i.relevamiento?.oficina).filter(Boolean);
  const oficinasFromAloj = data.list.map((i) => i.alojamiento?.oficina).filter(Boolean);
  const oficinas = [...new Set([...OFICINAS_OPTIONS, ...oficinasFromRelev, ...oficinasFromAloj])].sort();
  const agentes = [...new Set(data.list.map((i) => i.relevamiento?.agente).filter(Boolean))].sort();

  const filteredList = data.list.filter((item) => {
    if (soloAsignado && user?.oficina) {
      const rowOficina = item.alojamiento?.oficina || '';
      const misOficinas = Array.isArray(user.oficina) ? user.oficina : [user.oficina];
      if (!misOficinas.includes(rowOficina)) return false;
    }
    if (filterLocalidad && (item.alojamiento?.localidad || '') !== filterLocalidad) return false;
    const rowOficina = item.relevamiento?.oficina ?? item.alojamiento?.oficina ?? '';
    if (filterOficina && rowOficina !== filterOficina) return false;
    if (filterAgente && (item.relevamiento?.agente || '') !== filterAgente) return false;
    return true;
  });

  const config = data.config || {};
  const showOcupacion = config.consultar_ocupacion !== false;
  const showReservas = !!config.consultar_reservas;

  // Listado: búsqueda por nombre y opciones actualizadas para el modal
  const searchTerm = (searchNombre || '').trim().toLowerCase();
  const listFilteredForTable = searchTerm ? list.filter((a) => (a.prestador || '').toLowerCase().includes(searchTerm)) : list;
  const categoriasForForm = [...new Set([...CATEGORIAS_OPTIONS, ...list.map((a) => a.categoria).filter(Boolean)])].filter(Boolean);
  const oficinasForForm = [...new Set([...OFICINAS_OPTIONS, ...list.map((a) => a.oficina).filter(Boolean)])].sort();

  const copiarUltimoFila = async (alojamientoId) => {
    if (!fecha) return;
    setCopyingId(alojamientoId);
    setError('');
    const res = await api('/relevamientos/copiar-ultimo', { method: 'POST', body: JSON.stringify({ fecha, alojamiento_id: alojamientoId }) });
    setCopyingId(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al copiar'); return; }
    setSuccess('Dato del último relevamiento copiado.');
    setTimeout(() => setSuccess(''), 2500);
    api(`/relevamientos?fecha=${fecha}`).then((r) => r.json()).then(setData);
    loadFechas();
  };

  const exportCSV = () => {
    if (!fecha || !filteredList.length) return;
    const esc = (v) => { const s = String(v ?? ''); if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`; return s; };
    const headers = ['Localidad', 'Categoría', 'Prestador', 'Funcionamiento', 'Observaciones', 'Dirección', 'Teléfono', 'WhatsApp', 'Página web', 'Plazas totales', 'Plazas ocupadas', 'Reservas (%)', 'Ocupación %', 'Disponibilidad', 'Llamados', 'Observaciones relev.', 'Oficina', 'Agente'];
    const rows = filteredList.map((item) => {
      const a = item.alojamiento || {};
      const r = item.relevamiento || {};
      const plazasTotales = a.plazas_totales ?? '';
      const plazasOcupadas = r.plazas_ocupadas ?? '';
      const ocupacionPct = plazasTotales && plazasOcupadas != null ? Math.round((plazasOcupadas / plazasTotales) * 100) : '';
      return [a.localidad ?? '', normalizeCategoriaDisplay(a.categoria), a.prestador, a.funcionamiento, a.observaciones, a.direccion, a.telefono_fijo, a.whatsapp, a.pagina_web, plazasTotales, plazasOcupadas, r.reservas ?? '', ocupacionPct, r.disponibilidad_texto, r.llamados, r.observaciones, r.oficina ?? a.oficina, r.agente].map(esc);
    });
    const csv = [headers.map(esc).join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relevamiento-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSuccess('CSV exportado.');
    setTimeout(() => setSuccess(''), 2000);
  };

  const filtrosActivos = filterLocalidad || filterOficina || filterAgente || soloAsignado;
  const contextLine = fecha && data.list.length > 0
    ? `Relevamiento del ${fecha} · ${filteredList.length} de ${data.list.length} alojamientos${filtrosActivos ? ' · Filtros aplicados' : ''}`
    : null;

  // —— Listado CRUD ——
  const openEdit = (a) => {
    setEditing(a.id);
    const catStr = (a.categoria || '').trim();
    const firstCat = catStr ? catStr.split(',')[0].trim() : '';
    setForm({
      localidad: LOCALIDADES_OPTIONS.includes(a.localidad) ? a.localidad : (a.localidad || 'Villa Gesell'),
      categoria: firstCat,
      prestador: a.prestador || '',
      funcionamiento: a.funcionamiento || '',
      observaciones: a.observaciones || '',
      direccion: a.direccion || '',
      telefono_fijo: a.telefono_fijo || '',
      whatsapp: a.whatsapp || '',
      pagina_web: a.pagina_web || '',
      plazas_totales: a.plazas_totales ?? '',
      oficina: a.oficina || '',
    });
  };
  const openNew = () => {
    setEditing('new');
    setForm({ localidad: 'Villa Gesell', categoria: 'Sin categorizar', prestador: '', funcionamiento: '', observaciones: '', direccion: '', telefono_fijo: '', whatsapp: '', pagina_web: '', plazas_totales: '', oficina: '' });
  };
  const cancelEdit = () => { setEditing(null); setError(''); };
  const doSave = async () => {
    const body = {
      ...form,
      categoria: (form.categoria && String(form.categoria).trim()) ? String(form.categoria).trim() : null,
      funcionamiento: form.funcionamiento || null,
      observaciones: form.observaciones || null,
      pagina_web: form.pagina_web || null,
      plazas_totales: form.plazas_totales === '' ? null : Number(form.plazas_totales),
      oficina: form.oficina || null,
    };
    if (editing === 'new') {
      const res = await api('/alojamientos', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al crear'); return; }
    } else {
      const res = await api(`/alojamientos/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Error al guardar'); return; }
    }
    cancelEdit();
    loadList();
  };
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este alojamiento?')) return;
    const res = await api(`/alojamientos/${id}`, { method: 'DELETE' });
    if (res.ok) loadList();
  };
  const toggleOculto = async (a) => {
    const res = await api(`/alojamientos/${a.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        localidad: a.localidad,
        categoria: a.categoria,
        prestador: a.prestador,
        web: a.web || null,
        funcionamiento: a.funcionamiento || null,
        observaciones: a.observaciones || null,
        direccion: a.direccion || null,
        telefono_fijo: a.telefono_fijo || null,
        whatsapp: a.whatsapp || null,
        pagina_web: a.pagina_web || null,
        plazas_totales: a.plazas_totales ?? null,
        oficina: a.oficina || null,
        oculto: !a.oculto,
      }),
    });
    if (res.ok) loadList();
  };

  return (
    <div className="card">
      <div className="page-header-with-tabs">
        <h2>Alojamientos</h2>
        <div className="tabs-and-action">
          <div className="tab-group">
            <button type="button" className={tab === 'relevamiento' ? 'active' : 'secondary'} onClick={() => setTab('relevamiento')}>Relevamiento</button>
            <button type="button" className={tab === 'listado' ? 'active' : 'secondary'} onClick={() => setTab('listado')}>Listado</button>
          </div>
          {canEditAlojamientos && (
            <button
              type="button"
              className="btn-action-secondary"
              onClick={openNew}
              style={tab !== 'listado' ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
            >
              Nuevo alojamiento
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {tab === 'relevamiento' && (
        <div className="page-relevamiento" style={{ marginTop: '1rem', boxShadow: 'none', border: 'none', borderRadius: 0, background: 'transparent' }}>
          <div className="workarea" style={{ padding: 0 }}>
            <div className="workarea-header">
              {!canEditRelevamientos && <p className="workarea-hint">Solo lectura. Quienes tengan permiso de edición podrán cargar datos.</p>}
            </div>
            <div className="filter-bar" role="group" aria-label="Filtros del relevamiento">
              <div className="filter-bar__header">
                <span className="filter-bar__title">Filtros</span>
              </div>
              <div className="filter-bar__body">
                <div className="filter-bar__item filter-bar__item--toggle">
                  <span className="filter-bar__label">Ver mis relevamientos</span>
                  <div className="filter-bar__control">
                    <label className="filter-bar__checkbox-label">
                      <input
                        type="checkbox"
                        checked={soloAsignado}
                        onChange={(e) => setSoloAsignado(e.target.checked)}
                        disabled={!user?.oficina}
                        aria-describedby="filter-ver-mis-hint"
                      />
                      <span>{user?.oficina ? 'Solo mi oficina' : 'Sin oficina asignada'}</span>
                    </label>
                    <span id="filter-ver-mis-hint" className="filter-bar__hint">
                      {user?.oficina ? 'Filtrar por la oficina asignada al agente' : 'Asigná una oficina en Admin para usar este filtro'}
                    </span>
                  </div>
                </div>
                <div className="filter-bar__item">
                  <label className="filter-bar__label" htmlFor="filter-fecha">Fecha</label>
                  <input
                    id="filter-fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="filter-bar__input"
                    aria-label="Fecha del relevamiento"
                  />
                </div>
                <div className="filter-bar__item">
                  <label className="filter-bar__label" htmlFor="filter-localidad">Localidad</label>
                  <select
                    id="filter-localidad"
                    value={filterLocalidad}
                    onChange={(e) => setFilterLocalidad(e.target.value)}
                    className="filter-bar__select"
                    aria-label="Filtrar por localidad"
                  >
                    <option value="">Todas</option>
                    {localidades.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="filter-bar__item">
                  <label className="filter-bar__label" htmlFor="filter-oficina">Oficina</label>
                  <select
                    id="filter-oficina"
                    value={filterOficina}
                    onChange={(e) => setFilterOficina(e.target.value)}
                    className="filter-bar__select"
                    aria-label="Filtrar por oficina"
                  >
                    <option value="">Todas</option>
                    {oficinas.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="filter-bar__item">
                  <label className="filter-bar__label" htmlFor="filter-agente">Agente</label>
                  <select
                    id="filter-agente"
                    value={filterAgente}
                    onChange={(e) => setFilterAgente(e.target.value)}
                    className="filter-bar__select"
                    aria-label="Filtrar por agente"
                  >
                    <option value="">Todos</option>
                    {agentes.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="workarea-actions">
              {canEditRelevamientos && (
                <button type="button" className="btn-link workarea-action-link" onClick={() => setShowModalCargarDatos(true)}>Cómo cargar los datos</button>
              )}
              {!loading && data.list.length > 0 && (
                <button type="button" className="btn-export-csv" onClick={exportCSV} title="Descargar listado del día en CSV">Exportar CSV</button>
              )}
              <Modal open={showModalCargarDatos} onClose={() => setShowModalCargarDatos(false)} title="Cómo cargar los datos" maxWidth="480px">
                <div className="agente-instructivo" style={{ marginTop: 0, padding: 0, background: 'none' }}>
                  <p><strong>Plazas ocupadas:</strong> número de plazas ocupadas ese día (no puede superar Plazas totales).</p>
                  <p><strong>Reservas (%):</strong> nivel de reservas en escala 0 a 100 (solo si el relevamiento lo incluye).</p>
                  <p><strong>Disponibilidad:</strong> notas libres (ej. “llamar más tarde”, “sin datos”).</p>
                  <p><strong>Llamados:</strong> cómo se contactó (WhatsApp, Llamado, Sin contacto).</p>
                  <p>Podés usar el botón de copiar para traer el último relevamiento del alojamiento a esta fecha.</p>
                </div>
              </Modal>
            </div>
            {contextLine && <p className="workarea-context" role="status" aria-live="polite">{contextLine}</p>}

            {loading ? (
              <p className="empty">Cargando…</p>
            ) : !data.list.length ? (
              <p className="empty">No hay alojamientos cargados. Agregá alojamientos en el listado.</p>
            ) : (
              <div className="workarea-table-wrap">
                <table className="relevamiento-table" role="grid" aria-readonly={!canEditRelevamientos}>
                  <thead>
                    <tr>
                      <th>Localidad</th>
                      <th>Categoría</th>
                      <th>Prestadores</th>
                      <th>Funcionamiento</th>
                      <th>Observaciones</th>
                      <th>Dirección / Contacto</th>
                      <th className="th-num">Plazas totales</th>
                      {showOcupacion && <th className="th-num">Plazas ocupadas</th>}
                      {showReservas && <th className="th-num">Reservas (%)</th>}
                      {showOcupacion && <th className="th-pct">Ocupación %</th>}
                      <th>Disponibilidad</th>
                      <th>Llamados</th>
                      <th>Observaciones</th>
                      <th>Oficina</th>
                      <th>Agente</th>
                      {canEditRelevamientos && <th className="th-actions"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((item, idx) => {
                      const a = item.alojamiento;
                      const r = item.relevamiento || {};
                      const readOnly = !canEditRelevamientos;
                      const plazasTotales = a.plazas_totales ?? null;
                      const plazasOcupadas = r.plazas_ocupadas;
                      const ocupacionPct = plazasTotales != null && plazasTotales > 0 && plazasOcupadas != null ? Math.round((plazasOcupadas / plazasTotales) * 100) : item.ocupacion_pct;
                      return (
                        <tr key={a.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td className="cell-localidad">{a.localidad ?? '—'}</td>
                          <td className="cell-categoria">{normalizeCategoriaDisplay(a.categoria)}</td>
                          <td className="cell-prestador"><strong>{a.prestador}</strong></td>
                          <td className="cell-funcionamiento">{a.funcionamiento ?? '—'}</td>
                          <td className="cell-obs-aloj">{a.observaciones ?? '—'}</td>
                          <td className="cell-contacto"><Contacto a={a} /></td>
                          <td className="cell-num">{a.plazas_totales ?? '—'}</td>
                          {showOcupacion && (
                            <td className="cell-num">
                              {readOnly ? (r.plazas_ocupadas ?? '—') : (
                                <input
                                  type="number"
                                  className="input-num"
                                  min="0"
                                  max={plazasTotales ?? undefined}
                                  value={r.plazas_ocupadas ?? ''}
                                  onChange={(e) => updateRow(a.id, 'plazas_ocupadas', e.target.value ? Number(e.target.value) : null)}
                                  onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); saveRow(item, { plazas_ocupadas: v }); }}
                                  title={plazasTotales != null ? `Máx. ${plazasTotales}` : ''}
                                />
                              )}
                            </td>
                          )}
                          {showReservas && (
                            <td className="cell-num">
                              {readOnly ? (r.reservas != null ? `${r.reservas}%` : '—') : (
                                <input
                                  type="number"
                                  className="input-num"
                                  min="0"
                                  max="100"
                                  value={r.reservas ?? ''}
                                  onChange={(e) => updateRow(a.id, 'reservas', e.target.value === '' ? null : Number(e.target.value))}
                                  onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); saveRow(item, { reservas: v }); }}
                                  placeholder="%"
                                  title="0 a 100"
                                />
                              )}
                            </td>
                          )}
                          {showOcupacion && <td className="cell-pct">{ocupacionPct != null ? `${ocupacionPct}%` : '—'}</td>}
                          <td>
                            {readOnly ? (r.disponibilidad_texto ?? '—') : (
                              <input
                                className="input-text"
                                value={r.disponibilidad_texto ?? ''}
                                onChange={(e) => updateRow(a.id, 'disponibilidad_texto', e.target.value)}
                                onBlur={(e) => saveRow(item, { disponibilidad_texto: e.target.value.trim() || null })}
                                placeholder="Notas"
                              />
                            )}
                          </td>
                          <td>
                            {readOnly ? (r.llamados ?? '—') : (
                              <select
                                value={r.llamados ?? ''}
                                onChange={(e) => updateRow(a.id, 'llamados', e.target.value)}
                                onBlur={(e) => saveRow(item, { llamados: e.target.value || null })}
                              >
                                <option value="">—</option>
                                <option value="Envié WhatsApp">Envié WhatsApp</option>
                                <option value="Llamado">Llamado</option>
                                <option value="Sin contacto">Sin contacto</option>
                              </select>
                            )}
                          </td>
                          <td>
                            {readOnly ? (r.observaciones ?? '—') : (
                              <input
                                className="input-text"
                                value={r.observaciones ?? ''}
                                onChange={(e) => updateRow(a.id, 'observaciones', e.target.value)}
                                onBlur={(e) => saveRow(item, { observaciones: e.target.value.trim() || null })}
                              />
                            )}
                          </td>
                          <td>
                            {readOnly ? (r.oficina ?? a.oficina ?? '—') : (
                              <select
                                value={r.oficina ?? a.oficina ?? ''}
                                onChange={(e) => updateRow(a.id, 'oficina', e.target.value)}
                                onBlur={(e) => saveRow(item, { oficina: e.target.value || null })}
                              >
                                <option value="">—</option>
                                {OFICINAS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="cell-agente">{r.agente ?? user?.nombre ?? '—'}</td>
                          {canEditRelevamientos && (
                            <td className="cell-actions">
                              <button type="button" className="btn-copy-row" disabled={copyingId === a.id} onClick={() => copiarUltimoFila(a.id)} title="Copiar último relevamiento de este alojamiento">{copyingId === a.id ? '…' : 'Copiar último'}</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'listado' && (
        <>
          {!canEditAlojamientos && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Solo lectura. Solo un administrador puede editar datos de alojamientos y teléfonos.</p>
          )}
          {listLoading ? (
            <p className="empty">Cargando alojamientos…</p>
          ) : (
            <div className="table-wrap table-wrap--listado-alojamientos" style={{ marginTop: '1rem' }}>
              <div className="filter-bar__body" style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <label className="filter-bar__item" style={{ marginBottom: 0 }}>
                  <span className="filter-bar__label" style={{ marginRight: '0.5rem' }}>Buscar por nombre</span>
                  <input
                    type="search"
                    className="filter-bar__input"
                    placeholder="Nombre del alojamiento…"
                    value={searchNombre}
                    onChange={(e) => setSearchNombre(e.target.value)}
                    style={{ minWidth: '200px' }}
                    aria-label="Buscar por nombre del alojamiento"
                  />
                </label>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {searchTerm ? `Mostrando ${listFilteredForTable.length} de ${list.length} alojamiento${list.length !== 1 ? 's' : ''}` : `Mostrando ${list.length} alojamiento${list.length !== 1 ? 's' : ''}`}
              </p>
              <table className="table-listado-alojamientos">
                <colgroup>
                  <col className="col-localidad" />
                  <col className="col-categoria" />
                  <col className="col-prestador" />
                  <col className="col-funcionamiento" />
                  <col className="col-observaciones" />
                  <col className="col-contacto" />
                  <col className="col-plazas" />
                  <col className="col-oficina" />
                  {(isAdmin || canEditAlojamientos) && <col className="col-actions" />}
                </colgroup>
                <thead>
                  <tr>
                    <th>Localidad</th>
                    <th>Categoría</th>
                    <th>Prestador</th>
                    <th>Funcionamiento</th>
                    <th>Observaciones</th>
                    <th>Dirección / Contacto</th>
                    <th>Plazas totales</th>
                    <th>Oficina</th>
                    {(isAdmin || canEditAlojamientos) && <th className="th-actions">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {listFilteredForTable.map((a) => (
                    <tr key={a.id} className={a.oculto ? 'row-oculto' : ''}>
                      <td className="td-localidad">{a.localidad}</td>
                      <td className="td-categoria">{normalizeCategoriaDisplay(a.categoria)}</td>
                      <td className="td-prestador">{a.prestador}</td>
                      <td className="td-funcionamiento">{a.funcionamiento || '—'}</td>
                      <td className="td-observaciones">{a.observaciones || '—'}</td>
                      <td className="cell-contacto td-contacto"><Contacto a={a} /></td>
                      <td className="td-plazas">{a.plazas_totales}</td>
                      <td className="td-oficina">{a.oficina || '—'}</td>
                      {(isAdmin || canEditAlojamientos) && (
                        <td className="table-actions table-actions-inline cell-actions">
                          {isAdmin && (
                            <button type="button" className="btn-sm btn-ocultar" onClick={() => toggleOculto(a)} title={a.oculto ? 'Mostrar en listados' : 'Ocultar de listados'}>{a.oculto ? 'Mostrar' : 'Ocultar'}</button>
                          )}
                          {canEditAlojamientos && (
                            <>
                              <button type="button" className="btn-sm secondary" onClick={() => openEdit(a)}>Editar</button>
                              <button type="button" className="btn-sm danger" onClick={() => remove(a.id)}>Eliminar</button>
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
          <Modal open={!!editing} onClose={cancelEdit} title={editing === 'new' ? 'Nuevo alojamiento' : 'Editar alojamiento'} maxWidth="560px">
            <div className="form-edit-panel" style={{ marginTop: 0, border: 'none', padding: 0 }}>
              <div className="form-grid">
                <div className="form-row">
                  <label>Prestador</label>
                  <input value={form.prestador} onChange={(e) => setForm({ ...form, prestador: e.target.value })} placeholder="Nombre del establecimiento" />
                </div>
                <div className="form-row">
                  <label>Localidad</label>
                  <select value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })}>
                    {LOCALIDADES_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    {form.localidad && !LOCALIDADES_OPTIONS.includes(form.localidad) && <option value={form.localidad}>{form.localidad}</option>}
                  </select>
                </div>
                <div className="form-row">
                  <label>Categoría</label>
                  <select value={form.categoria || ''} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    {categoriasForForm.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    {form.categoria && !categoriasForForm.includes(form.categoria) && (
                      <option value={form.categoria}>{form.categoria}</option>
                    )}
                  </select>
                </div>
                <div className="form-row">
                  <label>Funcionamiento</label>
                  <input value={form.funcionamiento} onChange={(e) => setForm({ ...form, funcionamiento: e.target.value })} placeholder="Ej: Abierto T.A. / Cierra del 05/03 al 20/12" />
                </div>
                <div className="form-row">
                  <label>Observaciones (alojamiento)</label>
                  <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} placeholder="Notas generales del establecimiento" />
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
                  <label>Página web</label>
                  <input value={form.pagina_web} onChange={(e) => setForm({ ...form, pagina_web: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-row">
                  <label>Plazas totales</label>
                  <input type="number" min="0" value={form.plazas_totales} onChange={(e) => setForm({ ...form, plazas_totales: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Oficina asignada</label>
                  <select value={form.oficina || ''} onChange={(e) => setForm({ ...form, oficina: e.target.value })}>
                    <option value="">—</option>
                    {oficinasForForm.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={doSave}>Guardar</button>
                <button type="button" className="secondary" onClick={cancelEdit}>Cancelar</button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
