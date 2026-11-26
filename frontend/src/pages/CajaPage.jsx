import { useCallback, useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function mostrarFechaHora(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

function saldoPendiente(pedido) {
    const pagado = pedido.pagos.reduce((suma, pago) => suma + Number(pago.monto), 0);
    return Math.max(0, Number((Number(pedido.total) - pagado).toFixed(2)));
}

function CajaPage({ usuario }) {
    const puedeOperar = usuario?.permisos?.includes('operar_caja');
    const puedeVer = puedeOperar || usuario?.permisos?.includes('ver_caja');
    const puedeElegirSucursal = !usuario?.sucursalid &&
        usuario?.permisos?.includes('gestionar_sucursales');
    const [caja, setCaja] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [referenciaPago, setReferenciaPago] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [sucursalid, setSucursalid] = useState('');
    const [montoApertura, setMontoApertura] = useState('');
    const [nombreCaja, setNombreCaja] = useState('');
    const [tipoMovimiento, setTipoMovimiento] = useState('ingreso_extra');
    const [montoMovimiento, setMontoMovimiento] = useState('');
    const [motivo, setMotivo] = useState('');
    const [montoCierre, setMontoCierre] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const solicitudes = [solicitudApi('/caja/actual')];
            if (puedeOperar) {
                solicitudes.push(solicitudApi('/ventas?pendientes=true&pagina=1&limite=100'));
            }
            const [respuestaCaja, respuestaPedidos] = await Promise.all(solicitudes);
            setCaja(respuestaCaja.caja);
            if (puedeOperar) setPedidos(respuestaPedidos.ventas);
            setError('');
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }, [puedeOperar]);

    useEffect(() => {
        let activo = true;
        const solicitudes = [solicitudApi('/caja/actual')];
        if (puedeOperar) solicitudes.push(solicitudApi('/ventas?pendientes=true&pagina=1&limite=100'));
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes)
            .then((respuestas) => {
                if (!activo) return;
                let indice = 0;
                const respuestaCaja = respuestas[indice++];
                setCaja(respuestaCaja.caja);
                if (puedeOperar) setPedidos(respuestas[indice++].ventas);
                if (puedeElegirSucursal) {
                    setSucursales(respuestas[indice].sucursales.filter((sucursal) => sucursal.activo));
                }
            })
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => { activo = false; };
    }, [puedeElegirSucursal, puedeOperar]);

    async function ejecutar(path, body) {
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(path, { method: 'POST', body });
            setMensaje(respuesta.nota ? `${respuesta.mensaje}. ${respuesta.nota}` : respuesta.mensaje);
            await cargar();
            return true;
        } catch (fallo) {
            setError(fallo.message);
            return false;
        } finally {
            setProcesando(false);
        }
    }

    async function abrir(event) {
        event.preventDefault();
        await ejecutar('/caja/abrir', {
            monto_apertura: Number(montoApertura),
            nombre_caja: nombreCaja || null,
            ...(sucursalid ? { sucursalid: Number(sucursalid) } : {})
        });
    }

    async function registrarMovimiento(event) {
        event.preventDefault();
        const registrado = await ejecutar(`/caja/${caja.id_caja}/movimientos`, {
            tipo_movimiento: tipoMovimiento,
            monto: Number(montoMovimiento),
            motivo: motivo || null
        });
        if (registrado) {
            setMontoMovimiento('');
            setMotivo('');
        }
    }

    async function cerrar(event) {
        event.preventDefault();
        const cerrada = await ejecutar(`/caja/${caja.id_caja}/cerrar`, {
            monto_cierre_fisico: Number(montoCierre),
            observaciones_cierre: observaciones || null
        });
        if (cerrada) setCaja(null);
    }

    async function cerrarCuenta(event) {
        event.preventDefault();
        if (!pedidoSeleccionado) return;
        const saldo = saldoPendiente(pedidoSeleccionado);
        if (saldo <= 0) {
            setError('El pedido no tiene saldo pendiente.');
            return;
        }
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/ventas/${pedidoSeleccionado.id_venta}/pagos`, {
                method: 'POST',
                body: {
                    monto: saldo,
                    metodo_pago: metodoPago,
                    referencia: referenciaPago.trim() || null
                }
            });
            setMensaje(respuesta.mensaje);
            setPedidoSeleccionado(null);
            setReferenciaPago('');
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    if (!puedeVer) {
        return <div className="notice is-error" role="alert">No tienes permiso para consultar caja.</div>;
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Caja</h1>
                    <p>{puedeOperar ? 'Pedidos pendientes, cobros y control de caja.' : 'Consulta de la caja abierta de tu sucursal.'}</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {puedeOperar && (
                <section className="surface-card">
                    <h2>Cuentas pendientes</h2>
                    {pedidos.length === 0 ? <p className="empty-state">No hay pedidos pendientes de cobro.</p> : (
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead><tr><th>Mesa</th><th>Cliente</th><th>Pedido</th><th>Monto</th><th>Acción</th></tr></thead>
                                <tbody>
                                    {pedidos.map((pedido) => (
                                        <tr key={pedido.id_venta}>
                                            <td>{pedido.mesas?.numero_mesa || 'Para llevar'}</td>
                                            <td>{pedido.nombre_cliente || '—'}</td>
                                            <td>{pedido.correlativo}</td>
                                            <td>${saldoPendiente(pedido).toFixed(2)}</td>
                                            <td><button
                                                className="primary-button"
                                                type="button"
                                                onClick={() => setPedidoSeleccionado(pedido)}
                                                disabled={!caja}
                                                title={!caja ? 'Abre caja para registrar el cobro' : undefined}
                                            >Cerrar cuenta</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
            {pedidoSeleccionado && (
                <form className="surface-card" onSubmit={cerrarCuenta}>
                    <h2>Cerrar cuenta · {pedidoSeleccionado.nombre_cliente || pedidoSeleccionado.correlativo}</h2>
                    <div className="inline-form">
                        <label className="form-field">Método de pago
                            <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
                                <option>Efectivo</option>
                                <option>Tarjeta</option>
                                <option>Transferencia</option>
                                <option>Link de pago</option>
                                <option>Wallet</option>
                            </select>
                        </label>
                        <label className="form-field">Referencia (opcional)
                            <input maxLength="100" value={referenciaPago} onChange={(event) => setReferenciaPago(event.target.value)} />
                        </label>
                        <strong>Saldo: ${saldoPendiente(pedidoSeleccionado).toFixed(2)}</strong>
                    </div>
                    <div className="page-actions" style={{ marginTop: 16 }}>
                        <button className="primary-button" type="submit" disabled={procesando || !caja}>{procesando ? 'Registrando…' : 'Registrar pago y cerrar cuenta'}</button>
                        <button className="secondary-button" type="button" onClick={() => setPedidoSeleccionado(null)}>Cancelar</button>
                    </div>
                </form>
            )}
            {cargando ? <p className="loading-state">Consultando caja…</p> : !caja ? (
                puedeOperar ? <form className="surface-card" onSubmit={abrir}>
                    <h2>Abrir turno</h2>
                    <div className="inline-form">
                        {puedeElegirSucursal && <label className="form-field">
                            Sucursal
                            <select required value={sucursalid} onChange={(event) => setSucursalid(event.target.value)}>
                                <option value="">Selecciona una sucursal</option>
                                {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                            </select>
                        </label>}
                        <label className="form-field">
                            Nombre de caja
                            <input maxLength="50" value={nombreCaja} onChange={(event) => setNombreCaja(event.target.value)} placeholder="Caja principal" />
                        </label>
                        <label className="form-field">
                            Monto inicial del día ($)
                            <input type="number" min="0" max="99999999.99" step="0.01" required value={montoApertura} onChange={(event) => setMontoApertura(event.target.value)} />
                        </label>
                        <button className="primary-button" type="submit" disabled={procesando || (puedeElegirSucursal && !sucursalid)}>{procesando ? 'Abriendo…' : 'Abrir caja'}</button>
                    </div>
                </form> : <section className="surface-card"><p className="empty-state">No hay una caja abierta para consultar en esta sucursal.</p></section>
            ) : (
                <>
                    <section className="stats-grid">
                        <article className="stat-card">
                            <p className="stat-card-label">Estado</p>
                            <p className="stat-card-value"><span className="status-pill">{caja.estado}</span></p>
                            <p className="stat-card-note">Abierta {mostrarFechaHora(caja.fecha_apertura)}</p>
                            <p className="stat-card-note">{caja.usuarios?.nombre_completo || '—'} · {caja.sucursales?.nombre || 'Sucursal'}</p>
                        </article>
                        <article className="stat-card">
                            <p className="stat-card-label">Monto inicial del día</p>
                            <p className="stat-card-value">${Number(caja.monto_apertura).toFixed(2)}</p>
                        </article>
                        <article className="stat-card">
                            <p className="stat-card-label">Saldo actual en caja</p>
                            <p className="stat-card-value">${Number(caja.monto_sistema).toFixed(2)}</p>
                        </article>
                    </section>

                    {puedeOperar && <form className="surface-card" onSubmit={registrarMovimiento} style={{ marginTop: 16 }}>
                        <h2>Registrar movimiento</h2>
                        <div className="inline-form">
                            <label className="form-field">
                                Tipo
                                <select value={tipoMovimiento} onChange={(event) => setTipoMovimiento(event.target.value)}>
                                    <option value="ingreso_extra">Ingreso extra</option>
                                    <option value="retiro">Retiro</option>
                                    <option value="pago_proveedor">Pago a proveedor</option>
                                </select>
                            </label>
                            <label className="form-field">
                                Monto ($)
                                <input type="number" min="0.01" max="99999999.99" step="0.01" required value={montoMovimiento} onChange={(event) => setMontoMovimiento(event.target.value)} />
                            </label>
                            <label className="form-field">
                                Motivo
                                <input maxLength="255" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
                            </label>
                            <button className="secondary-button" type="submit" disabled={procesando}>Registrar</button>
                        </div>
                    </form>}

                    <section className="surface-card">
                        <h2>Movimientos de esta caja</h2>
                        {caja.movimientos_caja.length === 0 ? <p className="empty-state">No hay movimientos registrados.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Monto</th></tr></thead>
                                    <tbody>
                                        {caja.movimientos_caja.map((movimiento) => (
                                            <tr key={movimiento.movimientocajaid}>
                                                <td>{mostrarFechaHora(movimiento.fecha)}</td>
                                                <td>{movimiento.tipo_movimiento.replaceAll('_', ' ')}</td>
                                                <td>{movimiento.motivo || '—'}</td>
                                                <td>${Number(movimiento.monto).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {puedeOperar && <form className="surface-card" onSubmit={cerrar}>
                        <h2>Cerrar turno</h2>
                        <div className="inline-form">
                            <label className="form-field">
                                Efectivo contado ($)
                                <input type="number" min="0" max="99999999.99" step="0.01" required value={montoCierre} onChange={(event) => setMontoCierre(event.target.value)} />
                            </label>
                            <label className="form-field">
                                Observaciones
                                <input maxLength="255" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
                            </label>
                            <button className="danger-button" type="submit" disabled={procesando}>{procesando ? 'Cerrando…' : 'Cerrar caja'}</button>
                        </div>
                    </form>}
                </>
            )}
        </>
    );
}

export default CajaPage;
