import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function UsuariosPage({ usuarioActual, permisos = [] }) {
    const puedeCambiarRoles = permisos.includes('gestionar_roles_permisos');
    const puedeFiltrarSucursales = !usuarioActual?.sucursalid && permisos.includes('gestionar_sucursales');
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
    const [rolesSeleccionados, setRolesSeleccionados] = useState({});
    const [cargando, setCargando] = useState(true);
    const [procesandoId, setProcesandoId] = useState(null);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const query = sucursalSeleccionada
                ? `?sucursalid=${encodeURIComponent(sucursalSeleccionada)}`
                : '';
            const solicitudes = [solicitudApi(`/usuarios${query}`)];
            if (puedeCambiarRoles) solicitudes.push(solicitudApi('/administracion/roles'));
            const respuestas = await Promise.all(solicitudes);
            const respuestaUsuarios = respuestas[0];
            const listaRoles = respuestas[1] || [];
            setUsuarios(respuestaUsuarios.usuarios);
            setRoles(listaRoles);
            setRolesSeleccionados(Object.fromEntries(
                respuestaUsuarios.usuarios.map((usuario) => [usuario.id_usuario, usuario.id_rol])
            ));
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let activo = true;
        const solicitudes = [];
        if (puedeCambiarRoles) solicitudes.push(solicitudApi('/administracion/roles'));
        if (puedeFiltrarSucursales) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes)
            .then((respuestas) => {
                if (!activo) return;
                let indice = 0;
                if (puedeCambiarRoles) setRoles(respuestas[indice++]);
                if (puedeFiltrarSucursales) {
                    const activas = respuestas[indice].sucursales.filter((sucursal) => sucursal.activo);
                    setSucursales(activas);
                    setSucursalSeleccionada((actual) => actual ||
                        (activas[0] ? String(activas[0].sucursalid) : 'sin_asignar'));
                }
            })
            .catch((fallo) => {
                if (activo) {
                    setError(fallo.message);
                    setCargando(false);
                }
            });
        return () => { activo = false; };
    }, [puedeCambiarRoles, puedeFiltrarSucursales]);

    useEffect(() => {
        let activo = true;
        if (puedeFiltrarSucursales && !sucursalSeleccionada) return () => { activo = false; };
        const query = sucursalSeleccionada
            ? `?sucursalid=${encodeURIComponent(sucursalSeleccionada)}`
            : '';
        solicitudApi(`/usuarios${query}`)
            .then((respuesta) => {
                if (!activo) return;
                setUsuarios(respuesta.usuarios);
                setRolesSeleccionados(Object.fromEntries(
                    respuesta.usuarios.map((usuario) => [usuario.id_usuario, usuario.id_rol])
                ));
            })
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => { activo = false; };
    }, [puedeFiltrarSucursales, sucursalSeleccionada]);

    async function cambiarRol(usuario) {
        const id_rol = Number(rolesSeleccionados[usuario.id_usuario]);
        if (!id_rol || id_rol === usuario.id_rol) return;
        setProcesandoId(usuario.id_usuario);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/usuarios/${usuario.id_usuario}/rol`, {
                method: 'PATCH',
                body: { id_rol }
            });
            setMensaje(respuesta.mensaje);
            if (usuario.id_usuario === usuarioActual?.id_usuario) {
                window.dispatchEvent(new Event('origen:sesion-expirada'));
                return;
            }
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesandoId(null);
        }
    }

    async function desactivar(usuario) {
        if (!window.confirm(`¿Desactivar la cuenta de ${usuario.nombre_completo}?`)) return;
        setProcesandoId(usuario.id_usuario);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/usuarios/${usuario.id_usuario}/desactivar`, { method: 'PATCH' });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesandoId(null);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Usuarios</h1>
                    <p>Administra roles y estado de cuentas. Los cambios de rol exigen un nuevo inicio de sesión.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {puedeFiltrarSucursales && (
                <label className="form-field" style={{ maxWidth: 360, marginBottom: 16 }}>
                    Usuarios de la sucursal
                    <select value={sucursalSeleccionada} onChange={(event) => {
                        setSucursalSeleccionada(event.target.value);
                        setUsuarios([]);
                        setCargando(true);
                    }}>
                        {sucursales.map((sucursal) => (
                            <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>
                        ))}
                        <option value="sin_asignar">Usuarios globales / sin sucursal</option>
                    </select>
                </label>
            )}
            <section className="surface-card">
                <h2>Cuentas del sistema</h2>
                {cargando ? <p className="loading-state">Cargando usuarios…</p> :
                    usuarios.length === 0 ? <p className="empty-state">No hay usuarios registrados.</p> : (
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th>Contraseña inicial</th><th>Acciones</th></tr></thead>
                                <tbody>
                                    {usuarios.map((usuario) => {
                                        const esPropio = usuario.id_usuario === usuarioActual?.id_usuario;
                                        const rolesPermitidos = roles.filter((rol) =>
                                            usuario.id_cliente ? rol.nivel === 'cliente' : rol.nivel !== 'cliente'
                                        );
                                        return (
                                            <tr key={usuario.id_usuario}>
                                                <td>{usuario.nombre_completo}{esPropio ? ' (tú)' : ''}</td>
                                                <td>{usuario.correo}</td>
                                                <td>
                                                    {puedeCambiarRoles ? <select
                                                        aria-label={`Rol de ${usuario.nombre_completo}`}
                                                        value={rolesSeleccionados[usuario.id_usuario] ?? usuario.id_rol}
                                                        onChange={(event) => setRolesSeleccionados({
                                                            ...rolesSeleccionados,
                                                            [usuario.id_usuario]: event.target.value
                                                        })}
                                                        disabled={esPropio || !usuario.activo || procesandoId === usuario.id_usuario}
                                                    >
                                                        {rolesPermitidos.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol}</option>)}
                                                    </select> : usuario.roles.nombre_rol}
                                                </td>
                                                <td>{usuario.sucursales?.nombre || (usuario.sucursalid ? `Sucursal ${usuario.sucursalid}` : 'Global / sin sucursal')}</td>
                                                <td><span className={`status-pill ${usuario.activo ? '' : 'is-danger'}`}>{usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
                                                <td>{usuario.debe_cambiar_password ? 'Pendiente' : 'Actualizada'}</td>
                                                <td>
                                                    <div className="page-actions">
                                                        {puedeCambiarRoles && !esPropio && usuario.activo && <button className="secondary-button" type="button" onClick={() => cambiarRol(usuario)} disabled={procesandoId === usuario.id_usuario}>Guardar rol</button>}
                                                        {!esPropio && usuario.activo && <button className="danger-button" type="button" onClick={() => desactivar(usuario)} disabled={procesandoId === usuario.id_usuario}>Desactivar</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
            </section>
        </>
    );
}

export default UsuariosPage;
