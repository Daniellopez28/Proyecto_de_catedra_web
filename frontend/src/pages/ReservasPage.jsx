import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function mostrarFechaHora(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

function ReservasPage({ permisos = [], usuario }) {
    const puedeVerReservas = permisos.includes('ver_reservas');
    const puedeConsultarDisponibilidad = permisos.includes('ver_reservas_disponibles');
    const puedeGestionar = permisos.includes('gestionar_reservas');
    const puedeVerMesas = permisos.includes('ver_mesas') || puedeGestionar;
    const puedeGestionarSucursales = permisos.includes('gestionar_sucursales');
    const puedeElegirSucursal = !usuario?.sucursalid &&
        (puedeGestionarSucursales || puedeConsultarDisponibilidad);
    const [reservas, setReservas] = useState([]);
    const [mesas, setMesas] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalid, setSucursalid] = useState(usuario?.sucursalid ? String(usuario.sucursalid) : '');
    const [fechaHora, setFechaHora] = useState('');
    const [personas, setPersonas] = useState('2');
    const [mesasDisponibles, setMesasDisponibles] = useState([]);
    const [nombreCliente, setNombreCliente] = useState('');
    const [apellidoCliente, setApellidoCliente] = useState('');
    const [telefonoCliente, setTelefonoCliente] = useState('');
    const [busquedaReservas, setBusquedaReservas] = useState('');
    const [mesaSeleccionada, setMesaSeleccionada] = useState('');
    const [notas, setNotas] = useState('');
    const [numeroMesa, setNumeroMesa] = useState('');
    const [capacidadMesa, setCapacidadMesa] = useState('2');
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const puedeConsultarMesas = puedeVerMesas &&
        (usuario?.sucursalid || (sucursalid && puedeGestionarSucursales));

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const solicitudes = [];
            if (puedeVerReservas) solicitudes.push(solicitudApi('/reservas'));
            if (puedeConsultarMesas) {
                const query = usuario?.sucursalid ? '' : `?sucursalid=${sucursalid}`;
                solicitudes.push(solicitudApi(`/mesas${query}`));
            }
            if (puedeElegirSucursal) solicitudes.push(solicitudApi('/mesas/sucursales'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeVerReservas) setReservas(respuestas[indice++].reservas);
            if (puedeConsultarMesas) setMesas(respuestas[indice++].mesas);
            if (puedeElegirSucursal) setSucursales(respuestas[indice].sucursales);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let activo = true;
        const solicitudes = [];
        if (puedeVerReservas) solicitudes.push(solicitudApi('/reservas'));
        if (puedeConsultarMesas) {
            const query = usuario?.sucursalid ? '' : `?sucursalid=${sucursalid}`;
            solicitudes.push(solicitudApi(`/mesas${query}`));
        }
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/mesas/sucursales'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeVerReservas) setReservas(respuestas[indice++].reservas);
            if (puedeConsultarMesas) setMesas(respuestas[indice++].mesas);
            if (puedeElegirSucursal) setSucursales(respuestas[indice].sucursales);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeVerReservas, puedeConsultarMesas, puedeElegirSucursal, usuario?.sucursalid, sucursalid]);

    async function consultarDisponibilidad(event) {
        event.preventDefault();
        setError('');
        setMensaje('');
        if (!fechaHora || !personas || (!usuario?.sucursalid && !sucursalid)) {
            setError('Selecciona sucursal, fecha y cantidad de personas.');
            return;
        }
        setMesasDisponibles([]);
        setMesaSeleccionada('');
        const query = new URLSearchParams({
            fecha_hora: new Date(fechaHora).toISOString(),
            personas,
            ...(usuario?.sucursalid ? {} : { sucursalid })
        });
        try {
            const respuesta = await solicitudApi(`/reservas/disponibles?${query}`);
            setMesasDisponibles(respuesta.mesas);
            if (respuesta.mesas.length === 0) setMensaje('No hay mesas disponibles para ese horario.');
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    async function crearReserva(event) {
        event.preventDefault();
        const mesa = mesasDisponibles.find((item) => item.mesaid === Number(mesaSeleccionada));
        if (!mesa || !nombreCliente.trim() || !apellidoCliente.trim() || !telefonoCliente.trim()) {
            setError('Completa los datos del cliente y selecciona una mesa disponible.');
            return;
        }
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/reservas', {
                method: 'POST',
                body: {
                    mesaid: mesa.mesaid,
                    fecha_hora_inicio: new Date(fechaHora).toISOString(),
                    cantidad_personas: Number(personas),
                    nombre: nombreCliente.trim(),
                    apellido: apellidoCliente.trim(),
                    telefono: telefonoCliente.trim(),
                    notas: notas || null
                }
            });
            setMensaje(respuesta.mensaje);
            setMesasDisponibles([]);
            setMesaSeleccionada('');
            setNombreCliente('');
            setApellidoCliente('');
            setTelefonoCliente('');
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function cambiarEstado(reserva, estado) {
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/reservas/${reserva.id_reserva}/estado`, {
                method: 'PATCH',
                body: { estado }
            });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    async function crearMesa(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/mesas', {
                method: 'POST',
                body: {
                    ...(sucursalid ? { sucursalid: Number(sucursalid) } : {}),
                    numero_mesa: numeroMesa,
                    capacidad: Number(capacidadMesa)
                }
            });
            setMensaje(respuesta.mensaje);
            setNumeroMesa('');
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function cambiarEstadoMesa(mesa, estado) {
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/mesas/${mesa.mesaid}/estado`, {
                method: 'PATCH',
                body: { estado }
            });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    const consultaReservas = busquedaReservas.trim().toLocaleLowerCase('es');
    const reservasFiltradas = reservas.filter((reserva) => !consultaReservas || [
        reserva.clientes?.nombre,
        reserva.clientes?.apellido,
        reserva.clientes?.telefono,
        reserva.mesas.numero_mesa,
        reserva.estado
    ].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(consultaReservas));

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Reservas y mesas</h1>
                    <p>Consulta, administra o revisa disponibilidad de acuerdo con los permisos de tu cuenta.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}

            {puedeElegirSucursal && (
                <label className="form-field" style={{ maxWidth: 360, marginBottom: 16 }}>
                    Sucursal
                    <select value={sucursalid} onChange={(event) => setSucursalid(event.target.value)}>
                        <option value="">Selecciona una sucursal</option>
                        {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                    </select>
                </label>
            )}

            {puedeConsultarDisponibilidad && (
                <form className="surface-card" onSubmit={consultarDisponibilidad}>
                    <h2>Consultar disponibilidad</h2>
                    <div className="inline-form">
                        <label className="form-field">Fecha y hora<input type="datetime-local" required value={fechaHora} onChange={(event) => {
                            setFechaHora(event.target.value);
                            setMesasDisponibles([]);
                            setMesaSeleccionada('');
                        }} /></label>
                        <label className="form-field">Personas<input type="number" min="1" step="1" required value={personas} onChange={(event) => {
                            setPersonas(event.target.value);
                            setMesasDisponibles([]);
                            setMesaSeleccionada('');
                        }} /></label>
                        <button className="primary-button" type="submit">Buscar mesas</button>
                    </div>
                    {mesasDisponibles.length > 0 && (
                        <div className="data-table-wrap" style={{ marginTop: 16 }}>
                            <table className="data-table">
                                <thead><tr><th>Mesa</th><th>Capacidad</th>{puedeGestionar && <th>Seleccionar</th>}</tr></thead>
                                <tbody>
                                    {mesasDisponibles.map((mesa) => (
                                        <tr key={mesa.mesaid}>
                                            <td>{mesa.numero_mesa}</td>
                                            <td>{mesa.capacidad}</td>
                                            {puedeGestionar && <td><input type="radio" name="mesaDisponible" checked={Number(mesaSeleccionada) === mesa.mesaid} onChange={() => setMesaSeleccionada(String(mesa.mesaid))} aria-label={`Seleccionar mesa ${mesa.numero_mesa}`} /></td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </form>
            )}

            {puedeGestionar && mesasDisponibles.length > 0 && (
                <form className="surface-card" onSubmit={crearReserva}>
                    <h2>Confirmar reserva</h2>
                    <p className="form-help">
                        Cliente: {[nombreCliente, apellidoCliente].filter(Boolean).join(' ') || 'Completa sus datos'} ·
                        Mesa: {mesasDisponibles.find((mesa) => mesa.mesaid === Number(mesaSeleccionada))?.numero_mesa || 'Selecciona una mesa'}
                    </p>
                    <div className="inline-form">
                        <label className="form-field">Nombre<input maxLength="150" required value={nombreCliente} onChange={(event) => setNombreCliente(event.target.value)} /></label>
                        <label className="form-field">Apellido<input maxLength="100" required value={apellidoCliente} onChange={(event) => setApellidoCliente(event.target.value)} /></label>
                        <label className="form-field">Teléfono<input type="tel" maxLength="20" required value={telefonoCliente} onChange={(event) => setTelefonoCliente(event.target.value)} /></label>
                    </div>
                    <label className="form-field">Notas<textarea maxLength="255" value={notas} onChange={(event) => setNotas(event.target.value)} /></label>
                    <button className="primary-button" type="submit" disabled={procesando || !mesaSeleccionada} style={{ marginTop: 16 }}>Crear reserva</button>
                </form>
            )}

            {puedeVerReservas && (
                <section className="surface-card">
                    <div className="page-heading">
                        <div><h2>Reservas de la sucursal</h2></div>
                        <input
                            type="search"
                            aria-label="Buscar reservas"
                            placeholder="Buscar por cliente, teléfono o mesa"
                            value={busquedaReservas}
                            onChange={(event) => setBusquedaReservas(event.target.value)}
                        />
                    </div>
                    {cargando ? <p className="loading-state">Cargando reservas…</p> :
                        reservasFiltradas.length === 0 ? <p className="empty-state">No hay reservas que coincidan con la búsqueda.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Teléfono</th><th>Mesa</th><th>Personas</th><th>Estado</th>{puedeGestionar && <th>Acciones</th>}</tr></thead>
                                    <tbody>
                                        {reservasFiltradas.map((reserva) => (
                                            <tr key={reserva.id_reserva}>
                                                <td>{mostrarFechaHora(reserva.fecha_hora_inicio)}</td>
                                                <td>{[reserva.clientes?.nombre, reserva.clientes?.apellido].filter(Boolean).join(' ') || '—'}</td>
                                                <td>{reserva.clientes?.telefono || '—'}</td>
                                                <td>{reserva.mesas.numero_mesa} · {reserva.mesas.sucursales?.nombre || ''}</td>
                                                <td>{reserva.cantidad_personas}</td>
                                                <td><span className="status-pill">{reserva.estado}</span></td>
                                                {puedeGestionar && <td><div className="page-actions">
                                                    {reserva.estado === 'pendiente' && <button className="secondary-button" type="button" onClick={() => cambiarEstado(reserva, 'confirmada')}>Confirmar</button>}
                                                    {['pendiente', 'confirmada'].includes(reserva.estado) && <button className="danger-button" type="button" onClick={() => cambiarEstado(reserva, 'cancelada')}>Cancelar</button>}
                                                    {reserva.estado === 'confirmada' && <button className="secondary-button" type="button" onClick={() => cambiarEstado(reserva, 'completada')}>Completar</button>}
                                                </div></td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>
            )}

            {puedeGestionar && (
                <form className="surface-card" onSubmit={crearMesa}>
                    <h2>Agregar mesa</h2>
                    <div className="inline-form">
                        <label className="form-field">Número<input maxLength="20" required value={numeroMesa} onChange={(event) => setNumeroMesa(event.target.value)} /></label>
                        <label className="form-field">Capacidad<input type="number" min="1" max="100" step="1" required value={capacidadMesa} onChange={(event) => setCapacidadMesa(event.target.value)} /></label>
                        <button className="secondary-button" type="submit" disabled={procesando || (puedeElegirSucursal && !sucursalid)}>Agregar mesa</button>
                    </div>
                </form>
            )}

            {puedeVerMesas && (
                <section className="surface-card">
                    <h2>Mesas</h2>
                    {cargando ? <p className="loading-state">Cargando mesas…</p> :
                        mesas.length === 0 ? <p className="empty-state">No hay mesas registradas o selecciona una sucursal.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Mesa</th><th>Capacidad</th><th>Estado</th>{(puedeGestionar || permisos.includes('tomar_pedidos')) && <th>Acciones</th>}</tr></thead>
                                    <tbody>
                                        {mesas.map((mesa) => (
                                            <tr key={mesa.mesaid}>
                                                <td>{mesa.numero_mesa}</td>
                                                <td>{mesa.capacidad}</td>
                                                <td>{mesa.estado}</td>
                                                {(puedeGestionar || permisos.includes('tomar_pedidos')) && <td>
                                                    {mesa.estado === 'libre'
                                                        ? <button className="secondary-button" type="button" onClick={() => cambiarEstadoMesa(mesa, 'ocupada')}>Ocupar</button>
                                                        : mesa.estado === 'ocupada' && <button className="secondary-button" type="button" onClick={() => cambiarEstadoMesa(mesa, 'libre')}>Liberar</button>}
                                                </td>}
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

export default ReservasPage;
