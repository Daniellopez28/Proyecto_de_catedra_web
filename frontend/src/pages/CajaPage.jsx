import { useCallback, useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function mostrarFechaHora(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

function CajaPage({ usuario }) {
    const puedeElegirSucursal = !usuario?.sucursalid &&
        usuario?.permisos?.includes('gestionar_sucursales');
    const [caja, setCaja] = useState(null);
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
            const respuesta = await solicitudApi('/caja/actual');
            setCaja(respuesta.caja);
            setError('');
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        let activo = true;
        const solicitudes = [solicitudApi('/caja/actual')];
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes)
            .then(([respuestaCaja, respuestaSucursales]) => {
                if (!activo) return;
                setCaja(respuestaCaja.caja);
                if (puedeElegirSucursal) {
                    setSucursales(respuestaSucursales.sucursales.filter((sucursal) => sucursal.activo));
                }
            })
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => { activo = false; };
    }, [puedeElegirSucursal]);

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

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Caja</h1>
                    <p>Apertura, movimientos y cierre de caja de tu usuario.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {cargando ? <p className="loading-state">Consultando caja…</p> : !caja ? (
                <form className="surface-card" onSubmit={abrir}>
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
                            Fondo inicial ($)
                            <input type="number" min="0" max="99999999.99" step="0.01" required value={montoApertura} onChange={(event) => setMontoApertura(event.target.value)} />
                        </label>
                        <button className="primary-button" type="submit" disabled={procesando || (puedeElegirSucursal && !sucursalid)}>{procesando ? 'Abriendo…' : 'Abrir caja'}</button>
                    </div>
                </form>
            ) : (
                <>
                    <section className="stats-grid">
                        <article className="stat-card">
                            <p className="stat-card-label">Estado</p>
                            <p className="stat-card-value"><span className="status-pill">{caja.estado}</span></p>
                            <p className="stat-card-note">Abierta {mostrarFechaHora(caja.fecha_apertura)}</p>
                        </article>
                        <article className="stat-card">
                            <p className="stat-card-label">Fondo inicial</p>
                            <p className="stat-card-value">${Number(caja.monto_apertura).toFixed(2)}</p>
                        </article>
                        <article className="stat-card">
                            <p className="stat-card-label">Movimientos</p>
                            <p className="stat-card-value">{caja.movimientos_caja.length}</p>
                        </article>
                    </section>

                    <form className="surface-card" onSubmit={registrarMovimiento} style={{ marginTop: 16 }}>
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
                    </form>

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

                    <form className="surface-card" onSubmit={cerrar}>
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
                    </form>
                </>
            )}
        </>
    );
}

export default CajaPage;
