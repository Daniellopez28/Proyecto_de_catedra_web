import { useEffect, useMemo, useState } from 'react';
import { ApiError, solicitudApi } from '../api.js';

function VentasPage({ permisos = [] }) {
    const puedeRegistrar = permisos.includes('tomar_pedidos');
    const puedeVerVentas = permisos.includes('ver_ventas');
    const puedeVerCocina = permisos.includes('ver_pedidos_cocina');
    const puedeVerListado = puedeVerVentas || puedeVerCocina;
    const puedeGestionarPedidos = puedeRegistrar || puedeVerCocina;
    const puedeVerMenu = permisos.includes('ver_menu');
    const [productos, setProductos] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [productoId, setProductoId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [carrito, setCarrito] = useState([]);
    const [tipoDocumento, setTipoDocumento] = useState('Factura');
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [pagoPendiente, setPagoPendiente] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [cargandoVentas, setCargandoVentas] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [confirmacion, setConfirmacion] = useState(null);

    useEffect(() => {
        let activo = true;
        const solicitudes = [];
        if (puedeRegistrar && puedeVerMenu) solicitudes.push(solicitudApi('/productos'));
        if (puedeVerListado) solicitudes.push(solicitudApi('/ventas?pagina=1&limite=50'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeRegistrar && puedeVerMenu) setProductos(respuestas[indice++].productos);
            if (puedeVerListado) setVentas(respuestas[indice].ventas);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) {
                setCargando(false);
                setCargandoVentas(false);
            }
        });
        return () => { activo = false; };
    }, [puedeRegistrar, puedeVerMenu, puedeVerListado]);

    async function actualizarEstado(venta, estado_pedido) {
        setError('');
        try {
            await solicitudApi(`/ventas/${venta.id_venta}/estado-pedido`, {
                method: 'PATCH',
                body: { estado_pedido }
            });
            const respuesta = await solicitudApi('/ventas?pagina=1&limite=50');
            setVentas(respuesta.ventas);
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    const total = useMemo(() => carrito.reduce(
        (suma, item) => suma + Math.round(Number(item.precio_venta) * 100) * item.cantidad,
        0
    ) / 100, [carrito]);

    function agregarProducto(event) {
        event.preventDefault();
        const producto = productos.find((item) => item.id_producto === Number(productoId));
        if (!producto || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) return;

        setCarrito((actual) => {
            const existente = actual.find((item) => item.id_producto === producto.id_producto);
            if (existente) {
                return actual.map((item) => item.id_producto === producto.id_producto
                    ? { ...item, cantidad: item.cantidad + Number(cantidad) }
                    : item);
            }
            return [...actual, { ...producto, cantidad: Number(cantidad) }];
        });
        setProductoId('');
        setCantidad(1);
        setError('');
        setConfirmacion(null);
    }

    async function registrarVenta(event) {
        event.preventDefault();
        if (carrito.length === 0) {
            setError('Agrega al menos un producto a la venta.');
            return;
        }

        setProcesando(true);
        setError('');
        setConfirmacion(null);
        try {
            const respuesta = await solicitudApi('/ventas', {
                method: 'POST',
                body: {
                    tipoDocumento,
                    metodoPago,
                    pagoPendiente,
                    productos: carrito.map(({ id_producto, cantidad: cantidadItem }) => ({
                        id_producto,
                        cantidad: cantidadItem
                    }))
                }
            });
            setConfirmacion(respuesta);
            setCarrito([]);
        } catch (fallo) {
            setError(fallo instanceof ApiError ? fallo.message : 'No se pudo registrar la venta.');
        } finally {
            setProcesando(false);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Ventas</h1>
                    <p>Registra la venta, el pago y el descuento de inventario en una sola operación.</p>
                </div>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {confirmacion && (
                <div className="notice" role="status">
                    Venta {confirmacion.correlativo} registrada por ${Number(confirmacion.total).toFixed(2)}.
                    {confirmacion.inventario?.productos_sin_receta?.length > 0 &&
                        ` Sin receta: ${confirmacion.inventario.productos_sin_receta.map((item) => item.nombre).join(', ')}.`}
                </div>
            )}

            {puedeRegistrar && !puedeVerMenu && (
                <div className="notice is-error" role="alert">
                    Tu cuenta puede tomar pedidos, pero no tiene permiso para consultar el menú. Solicita `ver_menu` al administrador.
                </div>
            )}

            {puedeRegistrar && puedeVerMenu && <section className="surface-card">
                <h2>Agregar productos</h2>
                {cargando ? <p className="loading-state">Cargando menú…</p> : productos.length === 0 ? (
                    <p className="empty-state">No hay productos activos para vender.</p>
                ) : (
                    <form className="inline-form" onSubmit={agregarProducto}>
                        <label className="form-field">
                            Producto
                            <select required value={productoId} onChange={(event) => setProductoId(event.target.value)}>
                                <option value="">Selecciona un producto</option>
                                {productos.map((producto) => (
                                    <option key={producto.id_producto} value={producto.id_producto}>
                                        {producto.nombre} · ${Number(producto.precio_venta).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="form-field" style={{ maxWidth: 130 }}>
                            Cantidad
                            <input min="1" step="1" type="number" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
                        </label>
                        <button className="secondary-button" type="submit">Agregar</button>
                    </form>
                )}
            </section>}

            {puedeRegistrar && puedeVerMenu && <form onSubmit={registrarVenta}>
                <section className="surface-card">
                    <h2>Detalle de venta</h2>
                    {carrito.length === 0 ? <p className="empty-state">Todavía no hay productos en esta venta.</p> : (
                        <ul className="cart-list">
                            {carrito.map((item) => (
                                <li className="cart-row" key={item.id_producto}>
                                    <span><strong>{item.nombre}</strong><br />${Number(item.precio_venta).toFixed(2)} por unidad</span>
                                    <input
                                        aria-label={`Cantidad de ${item.nombre}`}
                                        min="1"
                                        step="1"
                                        type="number"
                                        value={item.cantidad}
                                        onChange={(event) => {
                                            const next = Number(event.target.value);
                                            if (!Number.isInteger(next) || next < 1) return;
                                            setCarrito((actual) => actual.map((producto) =>
                                                producto.id_producto === item.id_producto
                                                    ? { ...producto, cantidad: next }
                                                    : producto
                                            ));
                                        }}
                                    />
                                    <button
                                        className="danger-button"
                                        type="button"
                                        aria-label={`Quitar ${item.nombre}`}
                                        onClick={() => setCarrito((actual) => actual.filter((producto) => producto.id_producto !== item.id_producto))}
                                    >
                                        Quitar
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="sales-total">
                        <span>Total</span>
                        <strong>${total.toFixed(2)}</strong>
                    </div>
                    <div className="form-grid sales-options">
                        <label className="form-field">
                            Documento
                            <select value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value)}>
                                <option value="Factura">Factura</option>
                                <option value="CCF">Crédito fiscal</option>
                            </select>
                        </label>
                        <label className="form-field">
                            Método de pago
                            <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
                                <option>Efectivo</option>
                                <option>Tarjeta</option>
                                <option>Transferencia</option>
                            </select>
                        </label>
                        <label className="form-field sales-pending-option">
                            <span>Pago</span>
                            <span><input type="checkbox" checked={pagoPendiente} onChange={(event) => setPagoPendiente(event.target.checked)} /> Registrar como pedido pendiente de pago</span>
                        </label>
                    </div>
                    <div className="sales-submit">
                        <button className="primary-button" type="submit" disabled={procesando || carrito.length === 0}>
                            {procesando ? 'Registrando…' : 'Registrar venta'}
                        </button>
                    </div>
                </section>
            </form>}

            {puedeVerListado && (
                <section className="surface-card">
                    <h2>{puedeVerVentas ? 'Ventas recientes' : 'Pedidos de cocina'}</h2>
                    {cargandoVentas ? <p className="loading-state">Cargando ventas…</p> :
                        ventas.length === 0 ? <p className="empty-state">No hay ventas o pedidos para mostrar.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Fecha</th><th>Correlativo</th><th>Atendió</th><th>Detalle</th><th>Total</th><th>Estado</th>{puedeGestionarPedidos && <th>Acciones</th>}</tr></thead>
                                    <tbody>
                                        {ventas.map((venta) => (
                                            <tr key={venta.id_venta}>
                                                <td>{venta.fecha_hora ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(venta.fecha_hora)) : '—'}</td>
                                                <td>{venta.correlativo}</td>
                                                <td>{venta.usuarios?.nombre_completo || '—'}</td>
                                                <td>{venta.venta_detalle.map((linea) => `${linea.productos.nombre} × ${linea.cantidad}`).join(', ')}</td>
                                                <td>${Number(venta.total).toFixed(2)}</td>
                                                <td><span className="status-pill">{venta.estado_pedido}</span></td>
                                                {puedeGestionarPedidos && <td><div className="page-actions">
                                                    {venta.estado_pedido === 'abierto' && <button className="secondary-button" type="button" onClick={() => actualizarEstado(venta, 'en_cocina')}>Enviar a cocina</button>}
                                                    {venta.estado_pedido === 'en_cocina' && <button className="secondary-button" type="button" onClick={() => actualizarEstado(venta, 'servido')}>Marcar servido</button>}
                                                    {['abierto', 'en_cocina'].includes(venta.estado_pedido) && <button className="danger-button" type="button" onClick={() => actualizarEstado(venta, 'cancelado')}>Cancelar</button>}
                                                </div></td>}
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

export default VentasPage;
