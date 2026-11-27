import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function ComprasPage({ permisos = [], usuario }) {
    const puedeVerCompras = permisos.includes('ver_compras');
    const puedeRegistrar = permisos.includes('registrar_compras');
    const puedeVerProveedores = permisos.includes('ver_proveedores');
    const puedeVerInsumos = permisos.includes('ver_inventario');
    const puedeElegirSucursal = !usuario?.sucursalid && permisos.includes('gestionar_sucursales');
    const [compras, setCompras] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalid, setSucursalid] = useState('');
    const [detalle, setDetalle] = useState({ id_insumo: '', cantidad: '', costo_unitario: '' });
    const [formulario, setFormulario] = useState({
        id_proveedor: '',
        numero_factura_proveedor: '',
        iva: '0',
        metodo_pago: 'Transferencia',
        monto_pagado: '0'
    });
    const [nuevoProveedor, setNuevoProveedor] = useState({ nombre_empresa: '', nit: '', telefono: '', correo: '' });
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const solicitudes = [];
            const puedeCargarSucursal = !puedeElegirSucursal || sucursalid;
            if (puedeVerCompras && puedeCargarSucursal) {
                const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
                solicitudes.push(solicitudApi(`/compras${query}`));
            }
            if (puedeVerProveedores) solicitudes.push(solicitudApi('/proveedores'));
            if (puedeVerInsumos && puedeCargarSucursal) {
                const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
                solicitudes.push(solicitudApi(`/inventario/insumos${query}`));
            }
            if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeVerCompras && puedeCargarSucursal) setCompras(respuestas[indice++].compras);
            if (puedeVerProveedores) setProveedores(respuestas[indice++].proveedores);
            if (puedeVerInsumos && puedeCargarSucursal) setInsumos(respuestas[indice++].insumos);
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
        const solicitudes = [];
        const puedeCargarSucursal = !puedeElegirSucursal || sucursalid;
        if (puedeVerCompras && puedeCargarSucursal) {
            const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
            solicitudes.push(solicitudApi(`/compras${query}`));
        }
        if (puedeVerProveedores) solicitudes.push(solicitudApi('/proveedores'));
        if (puedeVerInsumos && puedeCargarSucursal) {
            const query = sucursalid ? `?sucursalid=${sucursalid}` : '';
            solicitudes.push(solicitudApi(`/inventario/insumos${query}`));
        }
        if (puedeElegirSucursal) solicitudes.push(solicitudApi('/administracion/sucursales'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeVerCompras && puedeCargarSucursal) setCompras(respuestas[indice++].compras);
            if (puedeVerProveedores) setProveedores(respuestas[indice++].proveedores);
            if (puedeVerInsumos && puedeCargarSucursal) setInsumos(respuestas[indice++].insumos);
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
    }, [puedeVerCompras, puedeVerProveedores, puedeVerInsumos, puedeElegirSucursal, sucursalid]);

    async function registrarCompra(event) {
        event.preventDefault();
        if (!puedeVerProveedores || !puedeVerInsumos) {
            setError('Para registrar una compra también necesitas permisos para consultar proveedores e insumos.');
            return;
        }
        if (!detalle.id_insumo) {
            setError('Selecciona el insumo comprado.');
            return;
        }
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/compras', {
                method: 'POST',
                body: {
                    ...formulario,
                    id_proveedor: Number(formulario.id_proveedor),
                    iva: Number(formulario.iva),
                    monto_pagado: Number(formulario.monto_pagado),
                    sucursalid: sucursalid ? Number(sucursalid) : undefined,
                    detalles: [{
                        id_insumo: Number(detalle.id_insumo),
                        cantidad: Number(detalle.cantidad),
                        costo_unitario: Number(detalle.costo_unitario)
                    }]
                }
            });
            setMensaje(respuesta.mensaje);
            setFormulario({ ...formulario, numero_factura_proveedor: '', monto_pagado: '0' });
            setDetalle({ id_insumo: '', cantidad: '', costo_unitario: '' });
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function registrarProveedor(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/proveedores', {
                method: 'POST',
                body: nuevoProveedor
            });
            setMensaje(respuesta.mensaje);
            setNuevoProveedor({ nombre_empresa: '', nit: '', telefono: '', correo: '' });
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
                    <h1>Compras y proveedores</h1>
                    <p>Registra facturas y entradas de inventario; los pagos en efectivo requieren caja abierta.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}

            {puedeElegirSucursal && (
                <label className="form-field" style={{ maxWidth: 360, marginBottom: 16 }}>
                    Sucursal
                    <select required value={sucursalid} onChange={(event) => {
                        setSucursalid(event.target.value);
                        setCargando(true);
                        setCompras([]);
                        setInsumos([]);
                    }}>
                        <option value="">Selecciona una sucursal</option>
                        {sucursales.map((sucursal) => <option key={sucursal.sucursalid} value={sucursal.sucursalid}>{sucursal.nombre}</option>)}
                    </select>
                </label>
            )}
            {puedeElegirSucursal && !sucursalid && (
                <div className="notice is-info">
                    {sucursales.length
                        ? 'Selecciona una sucursal para consultar compras y existencias.'
                        : 'No hay sucursales activas disponibles para registrar compras.'}
                </div>
            )}

            {puedeRegistrar && (
                <form className="surface-card" onSubmit={registrarCompra}>
                    <h2>Registrar compra</h2>
                    {(!puedeVerProveedores || !puedeVerInsumos) && (
                        <p className="notice is-info">Faltan permisos de lectura para cargar los proveedores o insumos necesarios para la factura.</p>
                    )}
                    <div className="form-grid">
                        <label className="form-field">Proveedor<select required value={formulario.id_proveedor} onChange={(event) => setFormulario({ ...formulario, id_proveedor: event.target.value })}>
                            <option value="">Selecciona un proveedor</option>
                            {proveedores.map((proveedor) => <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>{proveedor.nombre_empresa}</option>)}
                        </select></label>
                        <label className="form-field">Número de factura<input maxLength="50" required value={formulario.numero_factura_proveedor} onChange={(event) => setFormulario({ ...formulario, numero_factura_proveedor: event.target.value })} /></label>
                        <label className="form-field">Insumo<select required value={detalle.id_insumo} onChange={(event) => setDetalle({ ...detalle, id_insumo: event.target.value })}>
                            <option value="">Selecciona un insumo</option>
                            {insumos.map((insumo) => <option key={insumo.id_insumo} value={insumo.id_insumo}>{insumo.nombre} · {insumo.unidad_medida}</option>)}
                        </select></label>
                        <label className="form-field">Cantidad<input type="number" min="0.01" step="0.01" required value={detalle.cantidad} onChange={(event) => setDetalle({ ...detalle, cantidad: event.target.value })} /></label>
                        <label className="form-field">Costo por unidad ($)<input type="number" min="0" step="0.0001" required value={detalle.costo_unitario} onChange={(event) => setDetalle({ ...detalle, costo_unitario: event.target.value })} /></label>
                        <label className="form-field">IVA ($)<input type="number" min="0" step="0.01" value={formulario.iva} onChange={(event) => setFormulario({ ...formulario, iva: event.target.value })} /></label>
                        <label className="form-field">Pago inicial ($)<input type="number" min="0" step="0.01" value={formulario.monto_pagado} onChange={(event) => setFormulario({ ...formulario, monto_pagado: event.target.value })} /></label>
                        <label className="form-field">Método de pago<select value={formulario.metodo_pago} onChange={(event) => setFormulario({ ...formulario, metodo_pago: event.target.value })}><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option><option>Cheque</option></select></label>
                    </div>
                    <button className="primary-button" type="submit" disabled={procesando || !puedeVerProveedores || !puedeVerInsumos || (puedeElegirSucursal && !sucursalid)} style={{ marginTop: 16 }}>{procesando ? 'Registrando…' : 'Registrar factura'}</button>
                </form>
            )}

            {puedeRegistrar && (
                <form className="surface-card" onSubmit={registrarProveedor}>
                    <h2>Registrar proveedor</h2>
                    <div className="form-grid">
                        <label className="form-field">Empresa<input maxLength="150" required value={nuevoProveedor.nombre_empresa} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, nombre_empresa: event.target.value })} /></label>
                        <label className="form-field">NIT<input maxLength="17" value={nuevoProveedor.nit} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, nit: event.target.value })} /></label>
                        <label className="form-field">Teléfono<input maxLength="20" value={nuevoProveedor.telefono} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, telefono: event.target.value })} /></label>
                        <label className="form-field">Correo<input type="email" maxLength="150" value={nuevoProveedor.correo} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, correo: event.target.value })} /></label>
                    </div>
                    <button className="secondary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>Guardar proveedor</button>
                </form>
            )}

            {puedeVerCompras && (
                <section className="surface-card">
                    <h2>Facturas recientes</h2>
                    {cargando ? <p className="loading-state">Cargando compras…</p> :
                        compras.length === 0 ? <p className="empty-state">No hay compras registradas.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Factura</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Detalle</th></tr></thead>
                                    <tbody>
                                        {compras.map((compra) => (
                                            <tr key={compra.id_compra}>
                                                <td>{compra.numero_factura_proveedor}</td>
                                                <td>{compra.proveedores.nombre_empresa}</td>
                                                <td>{new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' }).format(new Date(compra.fecha_compra))}</td>
                                                <td>${Number(compra.total_compra).toFixed(2)}</td>
                                                <td>{compra.estado_pago}</td>
                                                <td>{compra.compra_detalle.map((linea) => `${linea.insumos.nombre} × ${linea.cantidad}`).join(', ')}</td>
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

export default ComprasPage;
