import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function mostrarFechaHora(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

function ReservasPage({ permisos = [], usuario }) {
    const puedeVerReservas = permisos.includes('ver_reservas');
    const puedeVerPropias = permisos.includes('ver_mis_reservas');
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
    const [duracion, setDuracion] = useState('90');
    const [mesasDisponibles, setMesasDisponibles] = useState([]);
    const [clienteBusqueda, setClienteBusqueda] = useState('');
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState('');
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
            else if (puedeVerPropias) solicitudes.push(solicitudApi('/reservas/mis'));
            if (puedeConsultarMesas) {
                const query = usuario?.sucursalid ? '' : `?sucursalid=${sucursalid}`;
                solicitudes.push(solicitudApi(`/mesas${query}`));
            }
            if (puedeElegirSucursal) solicitudes.push(solicitudApi('/mesas/sucursales'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeVerReservas || puedeVerPropias) setReservas(respuestas[indice++].reservas);
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
        else if (puedeVerPropias) solicitudes.push(solicitudApi('/reservas/mis'));
        if (puedeConsultarMesas) {
            const query = usuario?.sucursalid ? '' : `?sucursalid=${sucursalid}`;
            solicitudes.push(solicitudApi(`/mesas${query}`));
        }
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/mesas/sucursales'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeVerReservas || puedeVerPropias) setReservas(respuestas[indice++].reservas);
            if (puedeConsultarMesas) setMesas(respuestas[indice++].mesas);
            if (puedeElegirSucursal) setSucursales(respuestas[indice].sucursales);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeVerReservas, puedeVerPropias, puedeConsultarMesas, puedeElegirSucursal, usuario?.sucursalid, sucursalid]);

    async function consultarDisponibilidad(event) {
        event.preventDefault();
        setError('');
        setMensaje('');
        if (!fechaHora || !personas || (!usuario?.sucursalid && !sucursalid)) {
            setError('Selecciona sucursal, fecha y cantidad de personas.');
            return;
        }
        const query = new URLSearchParams({
            fecha_hora: new Date(fechaHora).toISOString(),
            personas,
            duracion_minutos: duracion,
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

    async function buscarClientes(event) {
        event.preventDefault();
        setError('');
        try {
            const query = new URLSearchParams({ busqueda: clienteBusqueda.trim() });
            const respuesta = await solicitudApi(`/clientes?${query}`);
            setClientes(respuesta.clientes);
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    async function crearReserva(event) {
        event.preventDefault();
        const mesa = mesasDisponibles.find((item) => item.mesaid === Number(mesaSeleccionada));
        if (!mesa || !clienteSeleccionado) {
            setError('Selecciona un cliente y una mesa disponible.');
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
                    id_cliente: Number(clienteSeleccionado),
                    fecha_hora_inicio: new Date(fechaHora).toISOString(),
                    cantidad_personas: Number(personas),
                    duracion_minutos: Number(duracion),
                    notas: notas || null
                }
            });
            setMensaje(respuesta.mensaje);
            setMesasDisponibles([]);
            setClienteSeleccionado('');
            setMesaSeleccionada('');
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
                        <label className="form-field">Fecha y hora<input type="datetime-local" required value={fechaHora} onChange={(event) => setFechaHora(event.target.value)} /></label>
                        <label className="form-field">Personas<input type="number" min="1" step="1" required value={personas} onChange={(event) => setPersonas(event.target.value)} /></label>
                        <label className="form-field">Duración (minutos)<input type="number" min="30" max="480" step="1" required value={duracion} onChange={(event) => setDuracion(event.target.value)} /></label>
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

            {puedeGestionar && (usuario?.sucursalid || puedeGestionarSucursales) && (
                <>
                    <form className="surface-card" onSubmit={buscarClientes}>
                        <h2>Buscar cliente para reservar</h2>
                        <div className="inline-form">
                            <label className="form-field">Nombre, correo o DUI<input minLength="2" maxLength="100" required value={clienteBusqueda} onChange={(event) => setClienteBusqueda(event.target.value)} /></label>
                            <button className="secondary-button" type="submit">Buscar cliente</button>
                        </div>
                        {clientes.length > 0 && (
                            <label className="form-field" style={{ marginTop: 12 }}>
                                Cliente
                                <select value={clienteSeleccionado} onChange={(event) => setClienteSeleccionado(event.target.value)}>
                                    <option value="">Selecciona un cliente</option>
                                    {clientes.map((cliente) => <option key={cliente.id_cliente} value={cliente.id_cliente}>{cliente.nombre} · {cliente.telefono || 'Sin teléfono'}</option>)}
                                </select>
                            </label>
                        )}
                    </form>
                </>
            )}

            {puedeGestionar && mesasDisponibles.length > 0 && (
                <form className="surface-card" onSubmit={crearReserva}>
                    <h2>Confirmar reserva</h2>
                    <p className="form-help">
                        Cliente: {clientes.find((cliente) => cliente.id_cliente === Number(clienteSeleccionado))?.nombre || 'Selecciona un cliente'} ·
                        Mesa: {mesasDisponibles.find((mesa) => mesa.mesaid === Number(mesaSeleccionada))?.numero_mesa || 'Selecciona una mesa'}
                    </p>
                    <label className="form-field">Notas<textarea maxLength="255" value={notas} onChange={(event) => setNotas(event.target.value)} /></label>
                    <button className="primary-button" type="submit" disabled={procesando || !clienteSeleccionado || !mesaSeleccionada} style={{ marginTop: 16 }}>Crear reserva</button>
                </form>
            )}

            {(puedeVerReservas || puedeVerPropias) && (
                <section className="surface-card">
                    <h2>{puedeVerReservas ? 'Reservas de la sucursal' : 'Mis reservas'}</h2>
                    {cargando ? <p className="loading-state">Cargando reservas…</p> :
                        reservas.length === 0 ? <p className="empty-state">No hay reservas para mostrar.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Mesa</th><th>Personas</th><th>Duración</th><th>Estado</th>{puedeGestionar && <th>Acciones</th>}</tr></thead>
                                    <tbody>
                                        {reservas.map((reserva) => (
                                            <tr key={reserva.id_reserva}>
                                                <td>{mostrarFechaHora(reserva.fecha_hora_inicio)}</td>
                                                <td>{reserva.clientes?.nombre || '—'}</td>
                                                <td>{reserva.mesas.numero_mesa} · {reserva.mesas.sucursales?.nombre || ''}</td>
                                                <td>{reserva.cantidad_personas}</td>
                                                <td>{reserva.duracion_minutos} min</td>
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
