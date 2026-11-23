import { useCallback, useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

const formularioVacio = {
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    dui: '',
    fecha_nacimiento: '',
    nombre_rol: '',
    cargo: '',
    tipo_planilla: 'quincenal',
    salario_base: '',
    fecha_ingreso: '',
    sucursalid: '',
    isss_numero: '',
    afp_numero: '',
    tipo_contrato: 'Indefinido',
    jornada: 'Completa',
    forma_pago: 'Quincenal'
};

function fechaCampo(valor) {
    return valor ? new Date(valor).toISOString().slice(0, 10) : '';
}

function EmpleadosPage({ permisos = [], usuario }) {
    const puedeVer = permisos.includes('ver_empleados');
    const puedeRegistrar = permisos.includes('registrar_empleados');
    const puedeListar = puedeVer || puedeRegistrar;
    const puedeVerFicha = permisos.includes('ver_mi_ficha');
    const [empleados, setEmpleados] = useState([]);
    const [miFicha, setMiFicha] = useState(null);
    const [roles, setRoles] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [formulario, setFormulario] = useState(formularioVacio);
    const [empleadoEnEdicion, setEmpleadoEnEdicion] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [credenciales, setCredenciales] = useState(null);
    const formularioInicial = {
        ...formularioVacio,
        sucursalid: usuario?.sucursalid ? String(usuario.sucursalid) : ''
    };

    const cargarEmpleados = useCallback(async () => {
        if (!puedeListar) return;
        setCargando(true);
        try {
            const respuesta = await solicitudApi('/empleados');
            setEmpleados(respuesta.empleados);
            setError('');
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }, [puedeListar]);

    useEffect(() => {
        let activo = true;
        Promise.all([
            puedeListar ? solicitudApi('/empleados') : Promise.resolve({ empleados: [] }),
            puedeRegistrar ? solicitudApi('/empleados/roles') : Promise.resolve([]),
            puedeRegistrar ? solicitudApi('/empleados/sucursales') : Promise.resolve([]),
            puedeVerFicha ? solicitudApi('/empleados/yo') : Promise.resolve(null)
        ]).then(([respuesta, listaRoles, listaSucursales, ficha]) => {
            if (!activo) return;
            setEmpleados(respuesta.empleados);
            setRoles(listaRoles);
            setSucursales(listaSucursales);
            setMiFicha(ficha);
            setFormulario((actual) => ({
                ...actual,
                sucursalid: usuario?.sucursalid ? String(usuario.sucursalid) : actual.sucursalid,
                nombre_rol: listaRoles.find((rol) => rol.nombre_rol === 'mesero')?.nombre_rol || listaRoles[0]?.nombre_rol || ''
            }));
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeListar, puedeRegistrar, puedeVerFicha, usuario?.sucursalid]);

    function cambiarCampo(event) {
        const { name, value } = event.target;
        setFormulario((actual) => ({ ...actual, [name]: value }));
    }

    async function registrar(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        setCredenciales(null);
        try {
            const respuesta = await solicitudApi('/empleados', {
                method: 'POST',
                body: {
                    ...formulario,
                    apellido_materno: formulario.apellido_materno || null,
                    salario_base: Number(formulario.salario_base),
                    sucursalid: formulario.sucursalid ? Number(formulario.sucursalid) : null,
                    isss_numero: formulario.isss_numero || null,
                    afp_numero: formulario.afp_numero || null
                }
            });
            setMensaje(respuesta.mensaje);
            setCredenciales(respuesta.credenciales_iniciales);
            setFormulario({ ...formularioInicial, nombre_rol: formulario.nombre_rol });
            await cargarEmpleados();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function abrirEdicion(empleado) {
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/empleados/${empleado.id_empleado}`);
            const ficha = respuesta.empleado;
            setFormulario({
                nombres: ficha.nombres,
                apellido_paterno: ficha.apellido_paterno,
                apellido_materno: ficha.apellido_materno || '',
                dui: ficha.dui,
                fecha_nacimiento: fechaCampo(ficha.fecha_nacimiento),
                nombre_rol: ficha.roles.nombre_rol,
                cargo: ficha.cargo,
                tipo_planilla: ficha.tipo_planilla.toLowerCase(),
                salario_base: String(ficha.salario_base),
                fecha_ingreso: fechaCampo(ficha.fecha_ingreso),
                sucursalid: ficha.sucursalid ? String(ficha.sucursalid) : '',
                isss_numero: ficha.isss_numero || '',
                afp_numero: ficha.afp_numero || '',
                tipo_contrato: ficha.tipo_contrato || '',
                jornada: ficha.jornada || '',
                forma_pago: ficha.forma_pago || ''
            });
            setEmpleadoEnEdicion(empleado);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function guardarEdicion(event) {
        event.preventDefault();
        if (!empleadoEnEdicion) return;
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/empleados/${empleadoEnEdicion.id_empleado}`, {
                method: 'PATCH',
                body: {
                    ...formulario,
                    apellido_materno: formulario.apellido_materno || null,
                    salario_base: Number(formulario.salario_base),
                    sucursalid: formulario.sucursalid ? Number(formulario.sucursalid) : null,
                    isss_numero: formulario.isss_numero || null,
                    afp_numero: formulario.afp_numero || null,
                    tipo_contrato: formulario.tipo_contrato || null,
                    jornada: formulario.jornada || null,
                    forma_pago: formulario.forma_pago || null
                }
            });
            setMensaje(respuesta.mensaje);
            setEmpleadoEnEdicion(null);
            setFormulario(formularioInicial);
            await cargarEmpleados();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function desactivar(empleado) {
        if (!window.confirm(`¿Dar de baja a ${empleado.nombre_completo}? Su historial se conservará.`)) return;
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/empleados/${empleado.id_empleado}/desactivar`, { method: 'PATCH' });
            setMensaje(respuesta.mensaje);
            await cargarEmpleados();
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Empleados</h1>
                    <p>Personal activo y expedientes almacenados en la base de datos.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargarEmpleados} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {credenciales && (
                <div className="credential-box" role="status">
                    <strong>Entrega estos datos al empleado una sola vez. La contraseña debe cambiarse al ingresar.</strong>
                    <div>Usuario: <code>{credenciales.correo}</code></div>
                    <div>Contraseña inicial: <code>{credenciales.password}</code></div>
                    <button className="secondary-button" type="button" style={{ marginTop: 10 }} onClick={() => setCredenciales(null)}>
                        Ocultar credenciales
                    </button>
                </div>
            )}

            {miFicha && (
                <section className="surface-card">
                    <h2>Mi ficha laboral</h2>
                    <p>{miFicha.nombre_completo} · {miFicha.cargo} · {miFicha.sucursales?.nombre || 'Sin sucursal'}</p>
                </section>
            )}

            {puedeRegistrar && (
                <form className="surface-card employee-registration" onSubmit={registrar}>
                    <h2>Registrar empleado</h2>
                    <p className="form-help">El sistema crea su cuenta y genera un código y una contraseña inicial.</p>
                    <div className="form-grid">
                        <label className="form-field">Nombres<input name="nombres" maxLength="100" required value={formulario.nombres} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido paterno<input name="apellido_paterno" maxLength="50" required value={formulario.apellido_paterno} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido materno<input name="apellido_materno" maxLength="50" value={formulario.apellido_materno} onChange={cambiarCampo} /></label>
                        <label className="form-field">DUI<input name="dui" maxLength="10" required placeholder="00000000-0" value={formulario.dui} onChange={cambiarCampo} /></label>
                        <label className="form-field">Fecha de nacimiento<input name="fecha_nacimiento" type="date" required value={formulario.fecha_nacimiento} onChange={cambiarCampo} /></label>
                        <label className="form-field">Rol<select name="nombre_rol" required value={formulario.nombre_rol} onChange={cambiarCampo}>
                            {roles.map((rol) => <option key={rol.id_rol} value={rol.nombre_rol}>{rol.nombre_rol}</option>)}
                        </select></label>
                        <label className="form-field">Cargo<input name="cargo" maxLength="50" required value={formulario.cargo} onChange={cambiarCampo} /></label>
                        <label className="form-field">Sucursal<select name="sucursalid" required value={formulario.sucursalid} onChange={cambiarCampo}>
                            <option value="">Selecciona una sucursal</option>
                            {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                        </select></label>
                        <label className="form-field">Tipo de planilla<select name="tipo_planilla" value={formulario.tipo_planilla} onChange={cambiarCampo}>
                            <option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
                        </select></label>
                        <label className="form-field">Salario base mensual ($)<input name="salario_base" type="number" min="0" max="99999999.99" step="0.01" required value={formulario.salario_base} onChange={cambiarCampo} /></label>
                        <label className="form-field">Fecha de ingreso<input name="fecha_ingreso" type="date" required value={formulario.fecha_ingreso} onChange={cambiarCampo} /></label>
                        <label className="form-field">Tipo de contrato<input name="tipo_contrato" maxLength="50" value={formulario.tipo_contrato} onChange={cambiarCampo} /></label>
                        <label className="form-field">Jornada<input name="jornada" maxLength="50" value={formulario.jornada} onChange={cambiarCampo} /></label>
                        <label className="form-field">Forma de pago<input name="forma_pago" maxLength="50" value={formulario.forma_pago} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número ISSS<input name="isss_numero" maxLength="15" value={formulario.isss_numero} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número AFP<input name="afp_numero" maxLength="20" value={formulario.afp_numero} onChange={cambiarCampo} /></label>
                    </div>
                    <div className="page-actions" style={{ marginTop: 16 }}>
                        <button className="primary-button" type="submit" disabled={procesando || roles.length === 0}>
                            {procesando ? 'Registrando…' : 'Registrar empleado'}
                        </button>
                    </div>
                </form>
            )}

            {empleadoEnEdicion && (
                <form className="surface-card employee-registration" onSubmit={guardarEdicion}>
                    <div className="page-heading">
                        <div>
                            <h2>Editar expediente</h2>
                            <p>{empleadoEnEdicion.nombre_completo}</p>
                        </div>
                        <button className="secondary-button" type="button" onClick={() => {
                            setEmpleadoEnEdicion(null);
                            setFormulario(formularioVacio);
                        }}>Cancelar edición</button>
                    </div>
                    <div className="form-grid">
                        <label className="form-field">Nombres<input name="nombres" maxLength="100" required value={formulario.nombres} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido paterno<input name="apellido_paterno" maxLength="50" required value={formulario.apellido_paterno} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido materno<input name="apellido_materno" maxLength="50" value={formulario.apellido_materno} onChange={cambiarCampo} /></label>
                        <label className="form-field">DUI<input name="dui" maxLength="10" required value={formulario.dui} onChange={cambiarCampo} /></label>
                        <label className="form-field">Fecha de nacimiento<input name="fecha_nacimiento" type="date" required value={formulario.fecha_nacimiento} onChange={cambiarCampo} /></label>
                        <label className="form-field">Rol<select name="nombre_rol" required value={formulario.nombre_rol} onChange={cambiarCampo}>
                            {roles.map((rol) => <option key={rol.id_rol} value={rol.nombre_rol}>{rol.nombre_rol}</option>)}
                        </select></label>
                        <label className="form-field">Cargo<input name="cargo" maxLength="50" required value={formulario.cargo} onChange={cambiarCampo} /></label>
                        <label className="form-field">Sucursal<select name="sucursalid" required value={formulario.sucursalid} onChange={cambiarCampo}>
                            <option value="">Selecciona una sucursal</option>
                            {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                        </select></label>
                        <label className="form-field">Tipo de planilla<select name="tipo_planilla" value={formulario.tipo_planilla} onChange={cambiarCampo}>
                            <option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
                        </select></label>
                        <label className="form-field">Salario base mensual ($)<input name="salario_base" type="number" min="0" max="99999999.99" step="0.01" required value={formulario.salario_base} onChange={cambiarCampo} /></label>
                        <label className="form-field">Fecha de ingreso<input name="fecha_ingreso" type="date" required value={formulario.fecha_ingreso} onChange={cambiarCampo} /></label>
                        <label className="form-field">Tipo de contrato<input name="tipo_contrato" maxLength="50" value={formulario.tipo_contrato} onChange={cambiarCampo} /></label>
                        <label className="form-field">Jornada<input name="jornada" maxLength="50" value={formulario.jornada} onChange={cambiarCampo} /></label>
                        <label className="form-field">Forma de pago<input name="forma_pago" maxLength="50" value={formulario.forma_pago} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número ISSS<input name="isss_numero" maxLength="15" value={formulario.isss_numero} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número AFP<input name="afp_numero" maxLength="20" value={formulario.afp_numero} onChange={cambiarCampo} /></label>
                    </div>
                    <div className="page-actions" style={{ marginTop: 16 }}>
                        <button className="primary-button" type="submit" disabled={procesando}>
                            {procesando ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            )}

            {puedeListar && (
                <section className="surface-card" style={{ marginTop: 16 }}>
                    <h2>Personal activo</h2>
                    {cargando ? <p className="loading-state">Cargando empleados…</p> :
                        empleados.length === 0 ? <p className="empty-state">No hay empleados activos.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Empleado</th><th>Código</th><th>Cargo</th><th>Rol</th><th>Sucursal</th><th>Salario base</th>{puedeRegistrar && <th>Acciones</th>}</tr>
                                    </thead>
                                    <tbody>
                                        {empleados.map((empleado) => (
                                            <tr key={empleado.id_empleado}>
                                                <td>{empleado.nombre_completo}</td>
                                                <td>{empleado.codigo_empleado}</td>
                                                <td>{empleado.cargo}</td>
                                                <td>{empleado.roles.nombre_rol}</td>
                                                <td>{empleado.sucursales?.nombre || '—'}</td>
                                                <td>${Number(empleado.salario_base).toFixed(2)}</td>
                                                {puedeRegistrar && (
                                                    <td>
                                                        <div className="page-actions">
                                                            <button className="secondary-button" type="button" onClick={() => abrirEdicion(empleado)} disabled={procesando}>Editar</button>
                                                            <button className="danger-button" type="button" onClick={() => desactivar(empleado)}>Dar de baja</button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>
            )}
        </>
    );
}

export default EmpleadosPage;
