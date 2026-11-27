import { useCallback, useEffect, useMemo, useState } from 'react';
import { solicitudApi } from '../api.js';
import EmployeeInfoComponent from '../../components/employee-info-component.jsx';
import '../employee-component.css';

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
    tipo_contrato: 'indefinido',
    duracion_anios: '0',
    duracion_meses: '1',
    jornada: 'Completa',
    forma_pago: 'Quincenal'
};

function fechaCampo(valor) {
    return valor ? new Date(valor).toISOString().slice(0, 10) : '';
}

const capitalizar = (texto) => {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

function nombreRolVisible(nombre) {
    const rol = String(nombre ?? '').trim().toLocaleLowerCase('es-SV');
    return rol ? `${rol.charAt(0).toLocaleUpperCase('es-SV')}${rol.slice(1)}` : '';
}

function calcularFechaFinContrato(fechaIngreso, anios, meses) {
    if (!fechaIngreso) return '';
    const [anio, mes, dia] = fechaIngreso.split('-').map(Number);
    const fechaObjetivo = new Date(Date.UTC(anio, mes - 1 + Number(anios) * 12 + Number(meses), 1));
    const ultimoDia = new Date(Date.UTC(
        fechaObjetivo.getUTCFullYear(),
        fechaObjetivo.getUTCMonth() + 1,
        0
    )).getUTCDate();
    const diaFin = Math.min(dia, ultimoDia);
    return [
        fechaObjetivo.getUTCFullYear(),
        String(fechaObjetivo.getUTCMonth() + 1).padStart(2, '0'),
        String(diaFin).padStart(2, '0')
    ].join('-');
}

function obtenerDuracionContrato(fechaIngreso, fechaFin) {
    const inicio = fechaCampo(fechaIngreso);
    const fin = fechaCampo(fechaFin);
    if (!inicio || !fin) return { duracion_anios: '0', duracion_meses: '1' };
    const [anioInicio, mesInicio] = inicio.split('-').map(Number);
    const [anioFin, mesFin] = fin.split('-').map(Number);
    const totalMeses = Math.max(1, (anioFin - anioInicio) * 12 + mesFin - mesInicio);
    return {
        duracion_anios: String(Math.floor(totalMeses / 12)),
        duracion_meses: String(totalMeses % 12)
    };
}

function datosEmpleado(formulario) {
    const { duracion_anios, duracion_meses, ...datos } = formulario;
    return {
        ...datos,
        fecha_fin_contrato: formulario.tipo_contrato === 'definido'
            ? calcularFechaFinContrato(formulario.fecha_ingreso, duracion_anios, duracion_meses)
            : null
    };
}

function EmpleadosPage({ permisos = [], usuario }) {
    const puedeVer = permisos.includes('ver_empleados');
    const puedeRegistrar = permisos.includes('registrar_empleados');
    const puedeListar = puedeVer || puedeRegistrar;
    const [empleados, setEmpleados] = useState([]);
    const [revisionEmpleados, setRevisionEmpleados] = useState(0);
    const [roles, setRoles] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [formulario, setFormulario] = useState(formularioVacio);
    const [empleadoEnEdicion, setEmpleadoEnEdicion] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [errorCargaEmpleados, setErrorCargaEmpleados] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [credenciales, setCredenciales] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState('Todos');
    const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState(null);
    const [resultadoDetalle, setResultadoDetalle] = useState({
        idEmpleado: null,
        revision: -1,
        empleado: null,
        error: ''
    });
    const formularioInicial = {
        ...formularioVacio,
        sucursalid: usuario?.sucursalid ? String(usuario.sucursalid) : ''
    };

    const actualizarListaEmpleados = useCallback((lista) => {
        setEmpleados(lista);
        setRevisionEmpleados((actual) => actual + 1);
        setEmpleadoSeleccionadoId((actual) =>
            lista.some((empleado) => empleado.id_empleado === actual)
                ? actual
                : lista[0]?.id_empleado ?? null
        );
    }, []);

    const cargarEmpleados = useCallback(async () => {
        if (!puedeListar) return;
        setCargando(true);
        setErrorCargaEmpleados('');
        try {
            const respuesta = await solicitudApi('/empleados');
            actualizarListaEmpleados(respuesta.empleados);
        } catch (fallo) {
            setErrorCargaEmpleados(fallo.message);
        } finally {
            setCargando(false);
        }
    }, [actualizarListaEmpleados, puedeListar]);

    useEffect(() => {
        let activo = true;
        Promise.allSettled([
            puedeListar ? solicitudApi('/empleados') : Promise.resolve({ empleados: [] }),
            puedeRegistrar ? solicitudApi('/empleados/roles') : Promise.resolve([]),
            puedeRegistrar ? solicitudApi('/empleados/sucursales') : Promise.resolve([])
        ]).then(([resultadoEmpleados, resultadoRoles, resultadoSucursales]) => {
            if (!activo) return;

            if (resultadoEmpleados.status === 'fulfilled') {
                actualizarListaEmpleados(resultadoEmpleados.value.empleados);
                setErrorCargaEmpleados('');
            } else {
                setErrorCargaEmpleados(resultadoEmpleados.reason.message);
            }

            const listaRoles = resultadoRoles.status === 'fulfilled' ? resultadoRoles.value : [];
            const listaSucursales = resultadoSucursales.status === 'fulfilled' ? resultadoSucursales.value : [];
            setRoles(listaRoles);
            setSucursales(listaSucursales);
            setError([
                resultadoRoles.status === 'rejected' ? resultadoRoles.reason.message : '',
                resultadoSucursales.status === 'rejected' ? resultadoSucursales.reason.message : ''
            ].filter(Boolean).join(' '));
            setFormulario((actual) => ({
                ...actual,
                sucursalid: usuario?.sucursalid ? String(usuario.sucursalid) : actual.sucursalid,
                nombre_rol: listaRoles.find((rol) => rol.nombre_rol === 'mesero')?.nombre_rol || listaRoles[0]?.nombre_rol || ''
            }));
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [actualizarListaEmpleados, puedeListar, puedeRegistrar, usuario?.sucursalid]);

    const sucursalesFiltrables = useMemo(
        () => ['Todos', ...new Set(empleados.map((empleado) => empleado.sucursales?.nombre).filter(Boolean))],
        [empleados]
    );
    const empleadosFiltrados = useMemo(() => {
        const consulta = busqueda.trim().toLocaleLowerCase('es-SV');
        return empleados.filter((empleado) => {
            const sucursal = empleado.sucursales?.nombre || '';
            const coincideSucursal = sucursalSeleccionada === 'Todos' || sucursal === sucursalSeleccionada;
            const coincideBusqueda = !consulta ||
                `${empleado.nombre_completo} ${empleado.cargo} ${empleado.roles?.nombre_rol || ''} ${sucursal}`
                    .toLocaleLowerCase('es-SV')
                    .includes(consulta);
            return coincideSucursal && coincideBusqueda;
        });
    }, [empleados, busqueda, sucursalSeleccionada]);
    const empleadoSeleccionado = empleadosFiltrados.find(
        (empleado) => empleado.id_empleado === empleadoSeleccionadoId
    ) || empleadosFiltrados[0] || null;
    const idEmpleadoSeleccionado = empleadoSeleccionado?.id_empleado ?? null;
    const detalleActual = resultadoDetalle.idEmpleado === idEmpleadoSeleccionado &&
        resultadoDetalle.revision === revisionEmpleados
        ? resultadoDetalle
        : null;
    const detalleSeleccionado = detalleActual?.empleado ?? null;
    const cargandoDetalle = Boolean(puedeRegistrar && idEmpleadoSeleccionado && !detalleActual);
    const errorDetalle = detalleActual?.error ?? '';
    const salarioBaseTotal = useMemo(
        () => empleados.reduce((total, empleado) => total + Number(empleado.salario_base || 0), 0),
        [empleados]
    );
    const cantidadSucursales = new Set(
        empleados.map((empleado) => empleado.sucursales?.nombre).filter(Boolean)
    ).size;

    useEffect(() => {
        if (!idEmpleadoSeleccionado || !puedeRegistrar) return undefined;

        let activo = true;
        solicitudApi(`/empleados/${idEmpleadoSeleccionado}`)
            .then((respuesta) => {
                if (activo) {
                    setResultadoDetalle({
                        idEmpleado: idEmpleadoSeleccionado,
                        revision: revisionEmpleados,
                        empleado: respuesta.empleado,
                        error: ''
                    });
                }
            })
            .catch((fallo) => {
                if (activo) {
                    setResultadoDetalle({
                        idEmpleado: idEmpleadoSeleccionado,
                        revision: revisionEmpleados,
                        empleado: null,
                        error: fallo.message
                    });
                }
            });
        return () => { activo = false; };
    }, [idEmpleadoSeleccionado, puedeRegistrar, revisionEmpleados]);

    function cambiarCampo(event) {
        const { name, value } = event.target;
        setFormulario((actual) => ({ ...actual, [name]: value }));
    }

    function abrirRegistro() {
        setEmpleadoEnEdicion(null);
        setFormulario({
            ...formularioInicial,
            nombre_rol: roles.find((rol) => rol.nombre_rol === 'mesero')?.nombre_rol || roles[0]?.nombre_rol || ''
        });
        setError('');
        setMostrarFormulario(true);
    }

    function cerrarFormulario() {
        setEmpleadoEnEdicion(null);
        setFormulario({
            ...formularioInicial,
            nombre_rol: roles.find((rol) => rol.nombre_rol === 'mesero')?.nombre_rol || roles[0]?.nombre_rol || ''
        });
        setError('');
        setMostrarFormulario(false);
    }

    async function registrar(event) {
        event.preventDefault();
        if (formulario.tipo_contrato === 'definido' &&
            Number(formulario.duracion_anios) * 12 + Number(formulario.duracion_meses) < 1) {
            setError('Indica una duración de al menos un mes para el contrato definido.');
            return;
        }
        setProcesando(true);
        setError('');
        setMensaje('');
        setCredenciales(null);
        try {
            const respuesta = await solicitudApi('/empleados', {
                method: 'POST',
                body: {
                    ...datosEmpleado(formulario),
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
            setMostrarFormulario(false);
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
            const tipoContrato = ficha.tipo_contrato?.toLowerCase() === 'definido'
                ? 'definido'
                : 'indefinido';
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
                tipo_contrato: tipoContrato,
                ...obtenerDuracionContrato(ficha.fecha_ingreso, ficha.fecha_fin_contrato),
                jornada: ficha.jornada || '',
                forma_pago: ficha.forma_pago || ''
            });
            setEmpleadoEnEdicion(empleado);
            setEmpleadoSeleccionadoId(empleado.id_empleado);
            setMostrarFormulario(true);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function guardarEdicion(event) {
        event.preventDefault();
        if (!empleadoEnEdicion) return;
        if (formulario.tipo_contrato === 'definido' &&
            Number(formulario.duracion_anios) * 12 + Number(formulario.duracion_meses) < 1) {
            setError('Indica una duración de al menos un mes para el contrato definido.');
            return;
        }
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/empleados/${empleadoEnEdicion.id_empleado}`, {
                method: 'PATCH',
                body: {
                    ...datosEmpleado(formulario),
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
            setMostrarFormulario(false);
            await cargarEmpleados();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function desactivar(empleado) {
        if (!window.confirm(`¿Dar de baja a ${empleado.nombre_completo}? Su historial se conservará.`)) return;
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/empleados/${empleado.id_empleado}/desactivar`, { method: 'PATCH' });
            setMensaje(respuesta.mensaje);
            await cargarEmpleados();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <main className="employee-summary employee-page">
            <header className="employee-head">
                <div>
                    <h1 className="employee-page-title">Empleados</h1>
                    <p className="employee-page-description">
                        Equipo Orígenes · Expedientes, puestos y condiciones de contratación
                    </p>
                </div>
                <div className="employee-head-actions">
                    {puedeListar && (
                        <button className="secondary-button" type="button" onClick={cargarEmpleados} disabled={cargando}>
                            {cargando ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    )}
                    {puedeRegistrar && !mostrarFormulario && (
                        <button className="employee-add-button" type="button" onClick={abrirRegistro}>
                            <span aria-hidden="true">+</span>
                            Nuevo empleado
                        </button>
                    )}
                </div>
            </header>

            {error && <div className="notice is-error" role="alert">{error}</div>}
            {errorCargaEmpleados && <div className="notice is-error" role="alert">{errorCargaEmpleados}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {credenciales && (
                <div className="credential-box" role="status">
                    <strong>Entrega estos datos al empleado una sola vez. La contraseña debe cambiarse al ingresar.</strong>
                    <div>Usuario: <code>{credenciales.correo}</code></div>
                    <div>Contraseña inicial: <code>{credenciales.password}</code></div>
                    <button className="secondary-button" type="button" onClick={() => setCredenciales(null)}>
                        Ocultar credenciales
                    </button>
                </div>
            )}

            {puedeRegistrar && mostrarFormulario ? (
                <form
                    className="surface-card employee-registration"
                    onSubmit={empleadoEnEdicion ? guardarEdicion : registrar}
                >
                    <div className="employee-registration-heading">
                        <div>
                            <h2>{empleadoEnEdicion ? 'Editar expediente' : 'Registrar empleado'}</h2>
                            <p>{empleadoEnEdicion
                                ? empleadoEnEdicion.nombre_completo
                                : 'El sistema crea su cuenta y genera un código y una contraseña inicial.'}</p>
                        </div>
                        <button className="secondary-button" type="button" onClick={cerrarFormulario}>
                            Cancelar
                        </button>
                    </div>
                    <div className="form-grid">
                        <label className="form-field">Nombres<input name="nombres" maxLength="100" required value={formulario.nombres} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido paterno<input name="apellido_paterno" maxLength="50" required value={formulario.apellido_paterno} onChange={cambiarCampo} /></label>
                        <label className="form-field">Apellido materno<input name="apellido_materno" maxLength="50" value={formulario.apellido_materno} onChange={cambiarCampo} /></label>
                        <label className="form-field">DUI<input name="dui" maxLength="10" required placeholder="00000000-0" value={formulario.dui} onChange={cambiarCampo} /></label>
                        <label className="form-field">Fecha de nacimiento<input name="fecha_nacimiento" type="date" required value={formulario.fecha_nacimiento} onChange={cambiarCampo} /></label>
                        <label className="form-field">Rol<select name="nombre_rol" required value={formulario.nombre_rol} onChange={cambiarCampo}>
                            {roles.map((rol) => <option key={rol.id_rol} value={rol.nombre_rol}>{nombreRolVisible(rol.nombre_rol)}</option>)}
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
                        <label className="form-field">Tipo de contrato<select name="tipo_contrato" value={formulario.tipo_contrato} onChange={cambiarCampo}>
                            <option value="indefinido">Indefinido</option>
                            <option value="definido">Definido</option>
                        </select></label>
                        {formulario.tipo_contrato === 'definido' && <>
                            <label className="form-field">Duración (años)<input name="duracion_anios" type="number" min="0" max="50" step="1" required value={formulario.duracion_anios} onChange={cambiarCampo} /></label>
                            <label className="form-field">Duración (meses)<input name="duracion_meses" type="number" min="0" max="11" step="1" required value={formulario.duracion_meses} onChange={cambiarCampo} /></label>
                            <p className="form-help employee-contract-help">Finaliza el {calcularFechaFinContrato(formulario.fecha_ingreso, formulario.duracion_anios, formulario.duracion_meses) || 'selecciona primero la fecha de ingreso'}.</p>
                        </>}
                        <label className="form-field">Jornada<input name="jornada" maxLength="50" value={formulario.jornada} onChange={cambiarCampo} /></label>
                        <label className="form-field">Forma de pago<input name="forma_pago" maxLength="50" value={formulario.forma_pago} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número ISSS<input name="isss_numero" maxLength="15" value={formulario.isss_numero} onChange={cambiarCampo} /></label>
                        <label className="form-field">Número AFP<input name="afp_numero" maxLength="20" value={formulario.afp_numero} onChange={cambiarCampo} /></label>
                    </div>
                    <div className="page-actions employee-registration-actions">
                        <button
                            className="primary-button"
                            type="submit"
                            disabled={procesando || roles.length === 0}
                        >
                            {procesando
                                ? empleadoEnEdicion ? 'Guardando…' : 'Registrando…'
                                : empleadoEnEdicion ? 'Guardar cambios' : 'Registrar empleado'}
                        </button>
                    </div>
                </form>
            ) : !mostrarFormulario && (
                <>
                    <article className="employee-summary-card">
                        <h2 className="employee-summary-label">Personal activo</h2>
                        <p className="employee-summary-value">{cargando ? '—' : empleados.length} personas</p>
                        <p className="employee-summary-detail">Empleados activos del listado</p>
                    </article>
                    <article className="employee-summary-card">
                        <h2 className="employee-summary-label">Sucursales con personal</h2>
                        <p className="employee-summary-value">{cargando ? '—' : cantidadSucursales}</p>
                        <p className="employee-summary-detail">Sucursales accesibles</p>
                    </article>
                    <article className="employee-summary-card">
                        <h2 className="employee-summary-label">Salario base mensual</h2>
                        <p className="employee-summary-value">
                            {cargando ? '—' : salarioBaseTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                        <p className="employee-summary-detail">Suma de los empleados activos</p>
                    </article>

                    <div className="employee-content">
                        <div className="employee-main-column">
                            <section className="branch-filters" aria-label="Filtros de empleados">
                                {sucursalesFiltrables.map((sucursal) => (
                                    <button
                                        key={sucursal}
                                        type="button"
                                        className={sucursalSeleccionada === sucursal ? 'selected' : ''}
                                        onClick={() => setSucursalSeleccionada(sucursal)}
                                    >
                                        {capitalizar(sucursal)} · {sucursal === 'Todos'
                                            ? empleados.length
                                            : empleados.filter((empleado) => empleado.sucursales?.nombre === sucursal).length}
                                    </button>
                                ))}
                                <input
                                    placeholder="Buscar empleado"
                                    type="search"
                                    className="employee-input"
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    aria-label="Buscar empleado"
                                />
                            </section>

                            <section className="employee-list" aria-labelledby="employee-list-title">
                                <p id="employee-list-title" className="employee-list-title">Listado de empleados</p>
                                <p className="employee-list-description">Selecciona una persona para consultar o editar su ficha.</p>
                                <div className="employee-table-wrapper">
                                    <table className="employee-table">
                                        <thead>
                                            <tr>
                                                <th scope="col">Empleado</th>
                                                <th scope="col">Puesto</th>
                                                <th scope="col">Sucursal</th>
                                                <th scope="col">Estado</th>
                                                <th scope="col">Base mensual</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {empleadosFiltrados.map((empleado) => (
                                                <tr
                                                    key={empleado.id_empleado}
                                                    className={idEmpleadoSeleccionado === empleado.id_empleado ? 'is-selected' : ''}
                                                    onClick={() => setEmpleadoSeleccionadoId(empleado.id_empleado)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                            event.preventDefault();
                                                            setEmpleadoSeleccionadoId(empleado.id_empleado);
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    aria-selected={idEmpleadoSeleccionado === empleado.id_empleado}
                                                >
                                                    <td>
                                                        {empleado.nombre_completo}
                                                        <small>{empleado.codigo_empleado}</small>
                                                    </td>
                                                    <td>{nombreRolVisible(empleado.roles?.nombre_rol)}</td>
                                                    <td>{empleado.sucursales?.nombre || '—'}</td>
                                                    <td><span className="employee-status">Activo</span></td>
                                                    <td>{Number(empleado.salario_base).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                                </tr>
                                            ))}
                                            {!cargando && !errorCargaEmpleados && empleadosFiltrados.length === 0 && (
                                                <tr>
                                                    <td colSpan="5">
                                                        {empleados.length === 0
                                                            ? 'No hay empleados activos.'
                                                            : 'No se encontraron empleados.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                        <section className="employee-info-panel" aria-label="Detalle del empleado seleccionado">
                            {empleadoSeleccionado ? (
                                <EmployeeInfoComponent
                                    employee={empleadoSeleccionado}
                                    details={detalleSeleccionado}
                                    loadingDetails={cargandoDetalle}
                                    errorDetails={errorDetalle}
                                    canManage={puedeRegistrar}
                                    onEdit={() => abrirEdicion(empleadoSeleccionado)}
                                    onDeactivate={() => desactivar(empleadoSeleccionado)}
                                    processing={procesando}
                                />
                            ) : (
                                <div className="employee-info-empty">
                                    {cargando
                                        ? 'Cargando personal…'
                                        : 'Selecciona un empleado para ver su expediente.'}
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )}
        </main>
    );
}

export default EmpleadosPage;
