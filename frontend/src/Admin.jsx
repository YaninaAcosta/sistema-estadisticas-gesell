import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OFICINAS_OPTIONS = ['Centro', 'Mar de las Pampas', 'Norte', 'Terminal'];
const ROLES = ['viewer', 'agente', 'admin'];

function parseOficina(of) {
  if (of == null || of === '') return null;
  if (Array.isArray(of)) return of;
  if (typeof of === 'string' && of.startsWith('[')) {
    try { return JSON.parse(of); } catch { return [of]; }
  }
  return [of];
}

const PERMISSIONS = [
  { key: 'view_relevamiento', label: 'Ver relevamiento' },
  { key: 'edit_relevamiento', label: 'Editar relevamiento' },
  { key: 'view_alojamientos', label: 'Ver alojamientos' },
  { key: 'edit_alojamientos', label: 'Editar alojamientos' },
  { key: 'launch_relevamiento', label: 'Lanzar relevamiento' },
  { key: 'manage_users', label: 'Gestionar usuarios y permisos' },
  { key: 'view_inmobiliarias', label: 'Ver inmobiliarias' },
  { key: 'edit_inmobiliarias', label: 'Editar inmobiliarias' },
  { key: 'launch_inmobiliarias', label: 'Lanzar relevamiento inmobiliarias' },
  { key: 'view_balnearios', label: 'Ver balnearios' },
  { key: 'edit_balnearios', label: 'Editar balnearios' },
  { key: 'launch_balnearios', label: 'Lanzar relevamiento balnearios' },
];

export default function Admin() {
  const { supabase, canLaunchRelevamiento, canLaunchInmobiliarias, canLaunchBalnearios, canManageUsers } = useAuth();
  const [tab, setTab] = useState('lanzar');
  const [lanzarFecha, setLanzarFecha] = useState('');
  const [consultarOcupacion, setConsultarOcupacion] = useState(true);
  const [consultarReservas, setConsultarReservas] = useState(false);
  const [lanzarSuccess, setLanzarSuccess] = useState('');
  const [lanzarError, setLanzarError] = useState('');
  const [lanzamientosList, setLanzamientosList] = useState([]);

  const [lanzarInmobFecha, setLanzarInmobFecha] = useState('');
  const [lanzarInmobSuccess, setLanzarInmobSuccess] = useState('');
  const [lanzarInmobError, setLanzarInmobError] = useState('');
  const [lanzarBalnFecha, setLanzarBalnFecha] = useState('');
  const [lanzarBalnSuccess, setLanzarBalnSuccess] = useState('');
  const [lanzarBalnError, setLanzarBalnError] = useState('');
  const [lanzamientosInmob, setLanzamientosInmob] = useState([]);
  const [lanzamientosBaln, setLanzamientosBaln] = useState([]);

  const [rolSeleccionado, setRolSeleccionado] = useState('agente');
  const [permisosPorRol, setPermisosPorRol] = useState({});
  const [permisosGuardando, setPermisosGuardando] = useState(false);
  const [permisosSuccess, setPermisosSuccess] = useState('');

  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ oficinas: [], rol: '' });

  useEffect(() => {
    if (!canManageUsers || !rolSeleccionado) return;
    (async () => {
      const { data, error } = await supabase.from('role_permissions').select('permission').eq('rol', rolSeleccionado);
      const list = error ? [] : (data || []).map((r) => r.permission);
      setPermisosPorRol((p) => ({ ...p, [rolSeleccionado]: list }));
    })();
  }, [canManageUsers, rolSeleccionado, supabase]);

  useEffect(() => {
    if (!canManageUsers) return;
    supabase.from('profiles').select('*').order('nombre')
      .then(({ data, error }) => {
        if (error) setUsersError('Error al cargar usuarios');
        else setUsers(data || []);
      });
  }, [canManageUsers, supabase]);

  const loadLanzamientos = async () => {
    if (!canLaunchRelevamiento) return;
    const { data, error } = await supabase.from('relevamiento_config').select('*').order('fecha', { ascending: false });
    setLanzamientosList(error ? [] : (data || []));
  };
  const loadLanzamientosInmob = async () => {
    if (!canLaunchInmobiliarias) return;
    const { data, error } = await supabase.from('inmobiliarias_config').select('*').order('fecha', { ascending: false });
    setLanzamientosInmob(error ? [] : (data || []));
  };
  const loadLanzamientosBaln = async () => {
    if (!canLaunchBalnearios) return;
    const { data, error } = await supabase.from('balnearios_config').select('*').order('fecha', { ascending: false });
    setLanzamientosBaln(error ? [] : (data || []));
  };
  useEffect(() => {
    if (tab !== 'lanzar') return;
    if (canLaunchRelevamiento) loadLanzamientos();
    if (canLaunchInmobiliarias) loadLanzamientosInmob();
    if (canLaunchBalnearios) loadLanzamientosBaln();
  }, [tab, canLaunchRelevamiento, canLaunchInmobiliarias, canLaunchBalnearios]);

  const lanzarRelevamiento = async (e) => {
    e.preventDefault();
    setLanzarError('');
    setLanzarSuccess('');
    if (!lanzarFecha) {
      setLanzarError('Elegí una fecha');
      return;
    }
    const { error } = await supabase.from('relevamiento_config').upsert({
      fecha: lanzarFecha,
      consultar_ocupacion: consultarOcupacion ? 1 : 0,
      consultar_reservas: consultarReservas ? 1 : 0,
    }, { onConflict: 'fecha' });
    if (error) {
      setLanzarError(error.message || 'Error al lanzar');
      return;
    }
    setLanzarSuccess(`Relevamiento lanzado para el ${lanzarFecha}. Ocupación: ${consultarOcupacion ? 'Sí' : 'No'}. Reservas (%): ${consultarReservas ? 'Sí' : 'No'}.`);
    loadLanzamientos();
  };

  const togglePermiso = (permKey) => {
    const actual = permisosPorRol[rolSeleccionado] || [];
    const nuevo = actual.includes(permKey) ? actual.filter((p) => p !== permKey) : [...actual, permKey];
    setPermisosPorRol((p) => ({ ...p, [rolSeleccionado]: nuevo }));
  };

  const guardarPermisos = async () => {
    setPermisosGuardando(true);
    setPermisosSuccess('');
    const permissions = permisosPorRol[rolSeleccionado] || [];
    await supabase.from('role_permissions').delete().eq('rol', rolSeleccionado);
    if (permissions.length) {
      const rows = permissions.map((permission) => ({ rol: rolSeleccionado, permission }));
      await supabase.from('role_permissions').insert(rows);
    }
    setPermisosPorRol((p) => ({ ...p, [rolSeleccionado]: permissions }));
    setPermisosSuccess('Guardado.');
    setTimeout(() => setPermisosSuccess(''), 2500);
    setPermisosGuardando(false);
  };

  const openEditUser = (u) => {
    setEditingUser(u.id);
    const oficinas = parseOficina(u.oficina) || [];
    setUserForm({ oficinas, rol: u.rol || '' });
  };

  const toggleOficina = (oficina) => {
    const actual = userForm.oficinas || [];
    const nuevo = actual.includes(oficina) ? actual.filter((x) => x !== oficina) : [...actual, oficina];
    setUserForm((f) => ({ ...f, oficinas: nuevo }));
  };

  const saveUser = async () => {
    if (!editingUser) return;
    const oficinaVal = userForm.rol === 'agente'
      ? (userForm.oficinas?.length ? JSON.stringify(userForm.oficinas) : null)
      : (userForm.oficinas?.[0] ?? null);
    const { data: updated, error } = await supabase.from('profiles').update({ oficina: oficinaVal, rol: userForm.rol }).eq('id', editingUser).select().single();
    if (!error && updated) {
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      setEditingUser(null);
    }
  };

  const lanzarInmobiliarias = async (e) => {
    e.preventDefault();
    setLanzarInmobError('');
    setLanzarInmobSuccess('');
    if (!lanzarInmobFecha) { setLanzarInmobError('Elegí una fecha'); return; }
    const { error } = await supabase.from('inmobiliarias_config').upsert({ fecha: lanzarInmobFecha }, { onConflict: 'fecha' });
    if (error) { setLanzarInmobError(error.message || 'Error al lanzar'); return; }
    setLanzarInmobSuccess(`Relevamiento Inmobiliarias lanzado para el ${lanzarInmobFecha}.`);
    loadLanzamientosInmob();
  };
  const lanzarBalnearios = async (e) => {
    e.preventDefault();
    setLanzarBalnError('');
    setLanzarBalnSuccess('');
    if (!lanzarBalnFecha) { setLanzarBalnError('Elegí una fecha'); return; }
    const { error } = await supabase.from('balnearios_config').upsert({ fecha: lanzarBalnFecha }, { onConflict: 'fecha' });
    if (error) { setLanzarBalnError(error.message || 'Error al lanzar'); return; }
    setLanzarBalnSuccess(`Relevamiento Balnearios lanzado para el ${lanzarBalnFecha}.`);
    loadLanzamientosBaln();
  };

  const showLanzar = canLaunchRelevamiento || canLaunchInmobiliarias || canLaunchBalnearios;
  const showPermisos = canManageUsers;
  const showUsuarios = canManageUsers;

  if (!showLanzar && !showPermisos && !showUsuarios) {
    return (
      <div className="card">
        <p className="empty">No tenés permisos para acceder a Roles y permisos.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Roles y permisos</h2>
      <div className="admin-tabs">
        {showLanzar && <button type="button" className={tab === 'lanzar' ? 'active' : ''} onClick={() => setTab('lanzar')}>Lanzar relevamiento</button>}
        {showPermisos && <button type="button" className={tab === 'permisos' ? 'active' : ''} onClick={() => setTab('permisos')}>Permisos por rol</button>}
        {showUsuarios && <button type="button" className={tab === 'usuarios' ? 'active' : ''} onClick={() => setTab('usuarios')}>Usuarios</button>}
      </div>

      {tab === 'lanzar' && canLaunchRelevamiento && (
        <form onSubmit={lanzarRelevamiento} className="form-edit-panel form-lanzar" style={{ maxWidth: '420px', marginTop: '1rem' }}>
          <h3>Lanzar relevamiento Alojamientos</h3>
          <p className="admin-intro">Elegí el día y qué datos se van a consultar en ese relevamiento.</p>
          <div className="form-row">
            <label>Fecha</label>
            <input type="date" value={lanzarFecha} onChange={(e) => setLanzarFecha(e.target.value)} required />
          </div>
          <fieldset className="form-lanzar-options">
            <legend className="form-lanzar-legend">Datos a consultar</legend>
            <label className="form-lanzar-option">
              <input type="checkbox" checked={consultarOcupacion} onChange={(e) => setConsultarOcupacion(e.target.checked)} />
              <span>Ocupación</span>
            </label>
            <label className="form-lanzar-option">
              <input type="checkbox" checked={consultarReservas} onChange={(e) => setConsultarReservas(e.target.checked)} />
              <span>Reservas (%)</span>
            </label>
          </fieldset>
          {lanzarError && <div className="alert error">{lanzarError}</div>}
          {lanzarSuccess && <div className="alert success">{lanzarSuccess}</div>}
          <div className="form-actions form-actions-primary">
            <button type="submit">Lanzar relevamiento</button>
          </div>
        </form>
      )}

      {tab === 'lanzar' && showLanzar && canLaunchRelevamiento && (
        <div className="form-edit-panel admin-lanzamientos-list" style={{ marginTop: '1.5rem' }}>
          <h3>Lanzamientos programados (Alojamientos)</h3>
          <p className="admin-intro">Relevamientos por fecha que ya fueron configurados.</p>
          {lanzamientosList.length === 0 ? (
            <p className="empty">No hay lanzamientos programados.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ocupación</th>
                    <th>Reservas (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {lanzamientosList.map((c) => (
                    <tr key={c.fecha}>
                      <td>{c.fecha}</td>
                      <td>{c.consultar_ocupacion ? 'Sí' : 'No'}</td>
                      <td>{c.consultar_reservas ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'lanzar' && canLaunchInmobiliarias && (
        <>
          <form onSubmit={lanzarInmobiliarias} className="form-edit-panel form-lanzar" style={{ maxWidth: '420px', marginTop: '1.5rem' }}>
            <h3>Lanzar relevamiento Inmobiliarias</h3>
            <p className="admin-intro">Habilitá una fecha para cargar % dptos 2/3 amb. y % casas/dúplex.</p>
            <div className="form-row">
              <label>Fecha</label>
              <input type="date" value={lanzarInmobFecha} onChange={(e) => setLanzarInmobFecha(e.target.value)} required />
            </div>
            {lanzarInmobError && <div className="alert error">{lanzarInmobError}</div>}
            {lanzarInmobSuccess && <div className="alert success">{lanzarInmobSuccess}</div>}
            <div className="form-actions form-actions-primary">
              <button type="submit">Lanzar relevamiento Inmobiliarias</button>
            </div>
          </form>
          <div className="form-edit-panel admin-lanzamientos-list" style={{ marginTop: '1rem' }}>
            <h3>Lanzamientos programados (Inmobiliarias)</h3>
            <p className="admin-intro">Fechas habilitadas para cargar datos de inmobiliarias.</p>
            {lanzamientosInmob.length === 0 ? (
              <p className="empty">No hay lanzamientos programados.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {lanzamientosInmob.map((c) => (
                      <tr key={c.fecha}><td>{c.fecha}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'lanzar' && canLaunchBalnearios && (
        <>
          <form onSubmit={lanzarBalnearios} className="form-edit-panel form-lanzar" style={{ maxWidth: '420px', marginTop: '1.5rem' }}>
            <h3>Lanzar relevamiento Balnearios</h3>
            <p className="admin-intro">Habilitá una fecha para cargar % de ocupación/reservas de balnearios.</p>
            <div className="form-row">
              <label>Fecha</label>
              <input type="date" value={lanzarBalnFecha} onChange={(e) => setLanzarBalnFecha(e.target.value)} required />
            </div>
            {lanzarBalnError && <div className="alert error">{lanzarBalnError}</div>}
            {lanzarBalnSuccess && <div className="alert success">{lanzarBalnSuccess}</div>}
            <div className="form-actions form-actions-primary">
              <button type="submit">Lanzar relevamiento Balnearios</button>
            </div>
          </form>
          <div className="form-edit-panel admin-lanzamientos-list" style={{ marginTop: '1rem' }}>
            <h3>Lanzamientos programados (Balnearios)</h3>
            <p className="admin-intro">Fechas habilitadas para cargar datos de balnearios.</p>
            {lanzamientosBaln.length === 0 ? (
              <p className="empty">No hay lanzamientos programados.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {lanzamientosBaln.map((c) => (
                      <tr key={c.fecha}><td>{c.fecha}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'permisos' && showPermisos && (
        <div className="form-edit-panel admin-permisos-panel" style={{ marginTop: '1rem' }}>
          <h3>Permisos por rol</h3>
          <p className="admin-intro">Marcá qué permisos tiene cada rol. Solo el admin puede modificar esto.</p>
          <div className="form-row">
            <label>Rol</label>
            <select value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="admin-permisos-list">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="admin-permisos-item">
                <input
                  type="checkbox"
                  checked={(permisosPorRol[rolSeleccionado] || []).includes(p.key)}
                  onChange={() => togglePermiso(p.key)}
                />
                <span className="admin-permisos-label">{p.label}</span>
              </label>
            ))}
          </div>
          {permisosSuccess && <div className="alert success">{permisosSuccess}</div>}
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={guardarPermisos} disabled={permisosGuardando}>
              {permisosGuardando ? '…' : 'Guardar permisos de este rol'}
            </button>
          </div>
        </div>
      )}

      {tab === 'usuarios' && showUsuarios && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Usuarios</h3>
          <p className="admin-intro">Asigná oficina y rol a cada usuario.</p>
          {usersError && <div className="alert error">{usersError}</div>}
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Oficina(s)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    {editingUser === u.id ? (
                      <>
                        <td>
                          <select value={userForm.rol} onChange={(e) => setUserForm((f) => ({ ...f, rol: e.target.value }))}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="cell-oficinas">
                          {userForm.rol === 'agente' ? (
                            <div className="admin-oficinas-multi">
                              {OFICINAS_OPTIONS.map((o) => (
                                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={(userForm.oficinas || []).includes(o)}
                                    onChange={() => toggleOficina(o)}
                                  />
                                  {o}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <select value={userForm.oficinas?.[0] || ''} onChange={(e) => setUserForm((f) => ({ ...f, oficinas: e.target.value ? [e.target.value] : [] }))}>
                              <option value="">—</option>
                              {OFICINAS_OPTIONS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <button type="button" onClick={saveUser}>Guardar</button>
                          <button type="button" className="secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.rol}</td>
                        <td>{(() => { const o = parseOficina(u.oficina); return Array.isArray(o) ? (o.length ? o.join(', ') : '—') : (o || '—'); })()}</td>
                        <td><button type="button" className="secondary" onClick={() => openEditUser(u)}>Editar</button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
