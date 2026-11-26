import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function InventarioPage({ permisos = [], usuario }) {
    const puedeVer = permisos.includes('ver_inventario');
    const puedeGestionar = permisos.includes('gestionar_inventario');
    const puedeElegirSucursal = !usuario?.sucursalid && permisos.includes('gestionar_sucursales');
    const [insumos, setInsumos] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalid, setSucursalid] = useState('');
    const [nuevoInsumo, setNuevoInsumo] = useState({
        nombre: '',
        unidad_medida: '',
        stock_minimo: '0',
        costo_promedio: '0'
    });
    const [ajuste, setAjuste] = useState({
        id_insumo: '',
        tipo_movimiento: 'entrada',
        cantidad: '',
        stock_nuevo: '',
        referencia: ''
    });
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
            const solicitudes = [];
            if (puedeVer && (!puedeElegirSucursal || sucursalid)) {
                solicitudes.push(Promise.all([
                    solicitudApi(`/inventario/insumos${query}`),
                    solicitudApi(`/inventario/alertas${query}`),
                    solicitudApi(`/inventario/movimientos${query}`)
                ]));
            }
            if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeVer && (!puedeElegirSucursal || sucursalid)) {
                const [respuestaInsumos, respuestaAlertas, respuestaMovimientos] = respuestas[indice++];
                setInsumos(respuestaInsumos.insumos);
                setAlertas(respuestaAlertas.alertas);
                setMovimientos(respuestaMovimientos.movimientos);
                setAjuste((actual) => ({
                    ...actual,
                    id_insumo: actual.id_insumo ||
                        (respuestaInsumos.insumos[0] ? String(respuestaInsumos.insumos[0].id_insumo) : '')
                }));
            }
            if (puedeElegirSucursal) {
                const activas = respuestas[indice].sucursales.filter((item) => item.activo);
                setSucursales(activas);
                if (!sucursalid && activas[0]) setSucursalid(String(activas[0].sucursalid));
            }
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let activo = true;
        const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
        const solicitudes = [];
        if (puedeVer && (!puedeElegirSucursal || sucursalid)) {
            solicitudes.push(Promise.all([
                solicitudApi(`/inventario/insumos${query}`),
                solicitudApi(`/inventario/alertas${query}`),
                solicitudApi(`/inventario/movimientos${query}`)
            ]));
        }
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeVer && (!puedeElegirSucursal || sucursalid)) {
                const [respuestaInsumos, respuestaAlertas, respuestaMovimientos] = respuestas[indice++];
                setInsumos(respuestaInsumos.insumos);
                setAlertas(respuestaAlertas.alertas);
                setMovimientos(respuestaMovimientos.movimientos);
                setAjuste((actual) => ({
                    ...actual,
                    id_insumo: actual.id_insumo ||
                        (respuestaInsumos.insumos[0] ? String(respuestaInsumos.insumos[0].id_insumo) : '')
                }));
            }
            if (puedeElegirSucursal) {
                const activas = respuestas[indice].sucursales.filter((item) => item.activo);
                setSucursales(activas);
                if (!sucursalid && activas[0]) setSucursalid(String(activas[0].sucursalid));
            }
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeVer, puedeElegirSucursal, sucursalid]);

    async function crearInsumo(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/inventario/insumos', {
                method: 'POST',
                body: {
                    ...nuevoInsumo,
                    stock_minimo: Number(nuevoInsumo.stock_minimo),
                    costo_promedio: Number(nuevoInsumo.costo_promedio)
                }
            });
            setMensaje(respuesta.mensaje);
            setNuevoInsumo({ nombre: '', unidad_medida: '', stock_minimo: '0', costo_promedio: '0' });
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function ajustar(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const esAjuste = ajuste.tipo_movimiento === 'ajuste';
            const respuesta = await solicitudApi('/inventario/ajustes', {
                method: 'POST',
                body: {
                    id_insumo: Number(ajuste.id_insumo),
                    tipo_movimiento: ajuste.tipo_movimiento,
                    ...(esAjuste ? { stock_nuevo: Number(ajuste.stock_nuevo) } : { cantidad: Number(ajuste.cantidad) }),
                    referencia: ajuste.referencia || null,
                    ...(sucursalid ? { sucursalid: Number(sucursalid) } : {})
                }
            });
            setMensaje(respuesta.mensaje);
            setAjuste({ ...ajuste, cantidad: '', stock_nuevo: '', referencia: '' });
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
                    <h1>Inventario</h1>
                    <p>Existencias, ajustes y movimientos por sucursal.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {puedeElegirSucursal && (
                <label className="form-field" style={{ maxWidth: 360, marginBottom: 16 }}>
                    Sucursal para consultar y ajustar
                    <select value={sucursalid} onChange={(event) => {
                        setSucursalid(event.target.value);
                        setCargando(true);
                        setInsumos([]);
                        setAlertas([]);
                        setMovimientos([]);
                    }}>
                        <option value="">Selecciona una sucursal</option>
                        {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                    </select>
                </label>
            )}
            {puedeGestionar && (
                <div className="form-grid">
                    <form className="surface-card" onSubmit={crearInsumo}>
                        <h2>Nuevo insumo</h2>
                        <div className="form-grid">
                            <label className="form-field">Nombre<input maxLength="100" required value={nuevoInsumo.nombre} onChange={(event) => setNuevoInsumo({ ...nuevoInsumo, nombre: event.target.value })} /></label>
                            <label className="form-field">Unidad de medida<input maxLength="20" required value={nuevoInsumo.unidad_medida} onChange={(event) => setNuevoInsumo({ ...nuevoInsumo, unidad_medida: event.target.value })} /></label>
                            <label className="form-field">Stock mínimo<input type="number" min="0" step="0.01" value={nuevoInsumo.stock_minimo} onChange={(event) => setNuevoInsumo({ ...nuevoInsumo, stock_minimo: event.target.value })} /></label>
                            <label className="form-field">Costo promedio ($)<input type="number" min="0" step="0.0001" value={nuevoInsumo.costo_promedio} onChange={(event) => setNuevoInsumo({ ...nuevoInsumo, costo_promedio: event.target.value })} /></label>
                        </div>
                        <button className="primary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>Crear insumo</button>
                    </form>

                    {puedeVer && (
                        <form className="surface-card" onSubmit={ajustar}>
                            <h2>Ajustar existencias</h2>
                            <div className="form-grid">
                                <label className="form-field">Insumo<select required value={ajuste.id_insumo} onChange={(event) => setAjuste({ ...ajuste, id_insumo: event.target.value })}>
                                    {insumos.map((insumo) => <option key={insumo.id_insumo} value={insumo.id_insumo}>{insumo.nombre} · {insumo.unidad_medida}</option>)}
                                </select></label>
                                <label className="form-field">Tipo<select value={ajuste.tipo_movimiento} onChange={(event) => setAjuste({ ...ajuste, tipo_movimiento: event.target.value })}>
                                    <option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Definir stock exacto</option>
                                </select></label>
                                {ajuste.tipo_movimiento === 'ajuste'
                                    ? <label className="form-field">Nuevo stock<input type="number" min="0" step="0.01" required value={ajuste.stock_nuevo} onChange={(event) => setAjuste({ ...ajuste, stock_nuevo: event.target.value })} /></label>
                                    : <label className="form-field">Cantidad<input type="number" min="0.01" step="0.01" required value={ajuste.cantidad} onChange={(event) => setAjuste({ ...ajuste, cantidad: event.target.value })} /></label>}
                                <label className="form-field">Referencia<input maxLength="100" value={ajuste.referencia} onChange={(event) => setAjuste({ ...ajuste, referencia: event.target.value })} /></label>
                            </div>
                            <button className="secondary-button" type="submit" disabled={procesando || !insumos.length || (puedeElegirSucursal && !sucursalid)} style={{ marginTop: 16 }}>Aplicar ajuste</button>
                        </form>
                    )}
                </div>
            )}
            {puedeElegirSucursal && !sucursalid ? (
                <div className="notice is-info">
                    {sucursales.length
                        ? 'Selecciona una sucursal para consultar sus existencias y movimientos.'
                        : 'No hay sucursales activas disponibles para consultar inventario.'}
                </div>
            ) : puedeVer ? (
                <>
                    <section className="stats-grid">
                        <article className="stat-card"><p className="stat-card-label">Insumos activos</p><p className="stat-card-value">{cargando ? '—' : insumos.length}</p></article>
                        <article className="stat-card"><p className="stat-card-label">Alertas de stock</p><p className="stat-card-value">{cargando ? '—' : alertas.length}</p></article>
                        <article className="stat-card"><p className="stat-card-label">Agotados</p><p className="stat-card-value">{cargando ? '—' : alertas.filter((alerta) => alerta.nivel === 'AGOTADO').length}</p></article>
                    </section>
                    <section className="surface-card">
                        <h2>Alertas de stock</h2>
                        {alertas.length === 0 ? <p className="empty-state">No hay insumos bajo el mínimo.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Insumo</th><th>Stock actual</th><th>Mínimo</th><th>Estado</th></tr></thead>
                                    <tbody>{alertas.map((alerta) => (
                                        <tr key={alerta.id_insumo}>
                                            <td>{alerta.nombre}</td><td>{alerta.stock_actual} {alerta.unidad_medida}</td><td>{alerta.stock_minimo} {alerta.unidad_medida}</td>
                                            <td><span className={`status-pill ${alerta.nivel === 'AGOTADO' ? 'is-danger' : 'is-warning'}`}>{alerta.nivel}</span></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section className="surface-card">
                        <h2>Existencias</h2>
                        {insumos.length === 0 ? <p className="empty-state">No hay insumos activos.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Insumo</th><th>Stock actual</th><th>Stock mínimo</th><th>Costo promedio</th><th>Estado</th></tr></thead>
                                    <tbody>{insumos.map((insumo) => (
                                        <tr key={insumo.id_insumo}>
                                            <td>{insumo.nombre}</td><td>{insumo.stock_actual} {insumo.unidad_medida}</td><td>{insumo.stock_minimo} {insumo.unidad_medida}</td><td>${Number(insumo.costo_promedio).toFixed(4)}</td>
                                            <td><span className={`status-pill ${insumo.estado === 'AGOTADO' ? 'is-danger' : insumo.estado === 'STOCK_BAJO' ? 'is-warning' : ''}`}>{insumo.estado}</span></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section className="surface-card">
                        <h2>Movimientos recientes</h2>
                        {movimientos.length === 0 ? <p className="empty-state">No hay movimientos recientes.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th>Cantidad</th><th>Sucursal</th><th>Referencia</th></tr></thead>
                                    <tbody>{movimientos.map((movimiento) => (
                                        <tr key={movimiento.movimientoid}>
                                            <td>{new Intl.DateTimeFormat('es-SV', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(movimiento.fecha))}</td>
                                            <td>{movimiento.insumos.nombre}</td><td>{movimiento.tipo_movimiento}</td><td>{movimiento.cantidad} {movimiento.insumos.unidad_medida}</td><td>{movimiento.sucursales.nombre}</td><td>{movimiento.referencia || '—'}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : <div className="notice is-info">Tu cuenta puede gestionar inventario, pero no tiene permiso para consultar existencias.</div>}
        </>
    );
}

export default InventarioPage;
