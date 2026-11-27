import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function AdministracionPage({ permisos = [] }) {
    const puedeRoles = permisos.includes('gestionar_roles_permisos');
    const puedeSucursales = permisos.includes('gestionar_sucursales');
    const [roles, setRoles] = useState([]);
    const [permisosDisponibles, setPermisosDisponibles] = useState([]);
    const [niveles, setNiveles] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [rolSeleccionado, setRolSeleccionado] = useState('');
    const [permisosRol, setPermisosRol] = useState([]);
    const [nuevoRol, setNuevoRol] = useState({ nombre_rol: '', descripcion: '', id_nivel: '' });
    const [nuevaSucursal, setNuevaSucursal] = useState({ nombre: '', direccion: '', telefono: '' });
    const [sucursalEditada, setSucursalEditada] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const solicitudes = [];
            if (puedeRoles) {
                solicitudes.push(Promise.all([
                    solicitudApi('/administracion/roles'),
                    solicitudApi('/administracion/permisos'),
                    solicitudApi('/administracion/niveles')
                ]));
            }
            if (puedeSucursales) solicitudes.push(solicitudApi('/administracion/sucursales'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeRoles) {
                const [listaRoles, listaPermisos, listaNiveles] = respuestas[indice++];
                setRoles(listaRoles);
                setPermisosDisponibles(listaPermisos.permisos);
                setNiveles(listaNiveles.niveles);
                const rolActual = listaRoles.find((rol) => String(rol.id_rol) === rolSeleccionado) ||
                    listaRoles[0];
                setRolSeleccionado(String(rolActual?.id_rol || ''));
                setPermisosRol(rolActual?.permisos || []);
            }
            if (puedeSucursales) setSucursales(respuestas[indice].sucursales);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let activo = true;
        const solicitudes = [];
        if (puedeRoles) {
            solicitudes.push(Promise.all([
                solicitudApi('/administracion/roles'),
                solicitudApi('/administracion/permisos'),
                solicitudApi('/administracion/niveles')
            ]));
        }
        if (puedeSucursales) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeRoles) {
                const [listaRoles, listaPermisos, listaNiveles] = respuestas[indice++];
                setRoles(listaRoles);
                setPermisosDisponibles(listaPermisos.permisos);
                setNiveles(listaNiveles.niveles);
                setRolSeleccionado(String(listaRoles[0]?.id_rol || ''));
                setPermisosRol(listaRoles[0]?.permisos || []);
            }
            if (puedeSucursales) setSucursales(respuestas[indice].sucursales);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeRoles, puedeSucursales]);

    const rolActual = roles.find((rol) => String(rol.id_rol) === rolSeleccionado);

    async function crearRol(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/administracion/roles', {
                method: 'POST',
                body: { ...nuevoRol, id_nivel: Number(nuevoRol.id_nivel) }
            });
            setMensaje(respuesta.mensaje);
            setNuevoRol({ nombre_rol: '', descripcion: '', id_nivel: '' });
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function guardarPermisos(event) {
        event.preventDefault();
        if (!rolActual || rolActual.nivel === 'administrador') return;
        setProcesando(true);
        setError('');
        try {
            const respuesta = await solicitudApi(`/administracion/roles/${rolActual.id_rol}/permisos`, {
                method: 'PUT',
                body: { permisos: permisosRol }
            });
            setMensaje(respuesta.mensaje);
            window.dispatchEvent(new Event('origen:sesion-expirada'));
        } catch (fallo) {
            setError(fallo.message);
            setProcesando(false);
        }
    }

    async function crearSucursal(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/administracion/sucursales', {
                method: 'POST',
                body: nuevaSucursal
            });
            setMensaje(respuesta.mensaje);
            setNuevaSucursal({ nombre: '', direccion: '', telefono: '' });
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function actualizarSucursal(event) {
        event.preventDefault();
        if (!sucursalEditada) return;
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/administracion/sucursales/${sucursalEditada.sucursalid}`, {
                method: 'PATCH',
                body: {
                    nombre: sucursalEditada.nombre,
                    direccion: sucursalEditada.direccion,
                    telefono: sucursalEditada.telefono || null,
                    activo: sucursalEditada.activo
                }
            });
            setMensaje(respuesta.mensaje);
            setSucursalEditada(null);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Administración</h1>
                    <p>Configura acceso y sucursales. Cambiar permisos invalida las sesiones activas.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {cargando ? <p className="loading-state">Cargando configuración…</p> : (
                <>
                    {puedeRoles && (
                        <>
                            <form className="surface-card" onSubmit={crearRol}>
                                <h2>Crear rol</h2>
                                <div className="form-grid">
                                    <label className="form-field">Nombre<input maxLength="50" required value={nuevoRol.nombre_rol} onChange={(event) => setNuevoRol({ ...nuevoRol, nombre_rol: event.target.value })} /></label>
                                    <label className="form-field">Nivel de acceso<select required value={nuevoRol.id_nivel} onChange={(event) => setNuevoRol({ ...nuevoRol, id_nivel: event.target.value })}>
                                        <option value="">Selecciona un nivel</option>
                                        {niveles.map((nivel) => <option key={nivel.id_nivel} value={nivel.id_nivel}>{nivel.codigo}</option>)}
                                    </select></label>
                                    <label className="form-field form-field is-wide">Descripción<textarea value={nuevoRol.descripcion} onChange={(event) => setNuevoRol({ ...nuevoRol, descripcion: event.target.value })} /></label>
                                </div>
                                <button className="primary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>Crear rol</button>
                            </form>

                            <form className="surface-card" onSubmit={guardarPermisos}>
                                <h2>Permisos del rol</h2>
                                <label className="form-field">
                                    Rol
                                    <select value={rolSeleccionado} onChange={(event) => {
                                        const id = event.target.value;
                                        setRolSeleccionado(id);
                                        setPermisosRol(roles.find((rol) => String(rol.id_rol) === id)?.permisos || []);
                                    }}>
                                        {roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol} · {rol.nivel}</option>)}
                                    </select>
                                </label>
                                {rolActual?.nivel === 'administrador' ? (
                                    <p className="notice is-info" style={{ marginTop: 14 }}>Los permisos del nivel administrador están protegidos y no se pueden modificar.</p>
                                ) : (
                                    <>
                                        <div className="form-grid" style={{ marginTop: 16 }}>
                                            {permisosDisponibles.map((permiso) => (
                                                <label className="form-field" key={permiso.id_permiso}>
                                                    <span><input
                                                        type="checkbox"
                                                        checked={permisosRol.includes(permiso.codigo)}
                                                        onChange={(event) => setPermisosRol((actuales) =>
                                                            event.target.checked
                                                                ? [...actuales, permiso.codigo]
                                                                : actuales.filter((codigo) => codigo !== permiso.codigo)
                                                        )}
                                                    /> {permiso.codigo}</span>
                                                    {permiso.descripcion && <small>{permiso.descripcion}</small>}
                                                </label>
                                            ))}
                                        </div>
                                        <button className="primary-button" type="submit" disabled={procesando || !rolActual} style={{ marginTop: 16 }}>Guardar permisos</button>
                                    </>
                                )}
                            </form>
                        </>
                    )}

                    {puedeSucursales && (
                        <>
                            <form className="surface-card" onSubmit={crearSucursal}>
                                <h2>Registrar sucursal</h2>
                                <div className="form-grid">
                                    <label className="form-field">Nombre<input maxLength="100" required value={nuevaSucursal.nombre} onChange={(event) => setNuevaSucursal({ ...nuevaSucursal, nombre: event.target.value })} /></label>
                                    <label className="form-field">Teléfono<input maxLength="20" value={nuevaSucursal.telefono} onChange={(event) => setNuevaSucursal({ ...nuevaSucursal, telefono: event.target.value })} /></label>
                                    <label className="form-field is-wide">Dirección<input maxLength="255" required value={nuevaSucursal.direccion} onChange={(event) => setNuevaSucursal({ ...nuevaSucursal, direccion: event.target.value })} /></label>
                                </div>
                                <button className="primary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>Crear sucursal</button>
                            </form>
                            <section className="surface-card">
                                <h2>Sucursales</h2>
                                {sucursales.length === 0 ? <p className="empty-state">No hay sucursales registradas.</p> : (
                                    <div className="data-table-wrap">
                                        <table className="data-table">
                                            <thead><tr><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
                                            <tbody>
                                                {sucursales.map((sucursal) => (
                                                    <tr key={sucursal.sucursalid}>
                                                        <td>{sucursal.nombre}</td>
                                                        <td>{sucursal.direccion}</td>
                                                        <td>{sucursal.telefono || '—'}</td>
                                                        <td>{sucursal.activo ? 'Activa' : 'Inactiva'}</td>
                                                        <td><button className="secondary-button" type="button" onClick={() => setSucursalEditada({ ...sucursal })}>Editar</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                            {sucursalEditada && (
                                <form className="surface-card" onSubmit={actualizarSucursal}>
                                    <h2>Editar sucursal</h2>
                                    <div className="form-grid">
                                        <label className="form-field">Nombre<input maxLength="100" required value={sucursalEditada.nombre} onChange={(event) => setSucursalEditada({ ...sucursalEditada, nombre: event.target.value })} /></label>
                                        <label className="form-field">Teléfono<input maxLength="20" value={sucursalEditada.telefono || ''} onChange={(event) => setSucursalEditada({ ...sucursalEditada, telefono: event.target.value })} /></label>
                                        <label className="form-field is-wide">Dirección<input maxLength="255" required value={sucursalEditada.direccion} onChange={(event) => setSucursalEditada({ ...sucursalEditada, direccion: event.target.value })} /></label>
                                        <label className="form-field"><span><input type="checkbox" checked={sucursalEditada.activo} onChange={(event) => setSucursalEditada({ ...sucursalEditada, activo: event.target.checked })} /> Sucursal activa</span></label>
                                    </div>
                                    <div className="page-actions" style={{ marginTop: 16 }}>
                                        <button className="primary-button" type="submit" disabled={procesando}>Guardar sucursal</button>
                                        <button className="secondary-button" type="button" onClick={() => setSucursalEditada(null)}>Cancelar</button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    );
}

export default AdministracionPage;
