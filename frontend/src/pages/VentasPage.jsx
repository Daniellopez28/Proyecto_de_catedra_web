import { Fragment, useEffect, useMemo, useState } from 'react';
import { ApiError, solicitudApi } from '../api.js';
import './VentasPage.css';

const moneda = (valor) => `$${Number(valor).toFixed(2)}`;

function VentasPage({ permisos = [], usuario, onGestionarMenu }) {
    const puedeRegistrar = permisos.includes('tomar_pedidos');
    const puedeVerVentas = permisos.includes('ver_ventas');
    const puedeVerCocina = permisos.includes('ver_pedidos_cocina');
    const puedeVerListado = puedeVerVentas || puedeVerCocina || puedeRegistrar;
    const puedeGestionarPedidos = puedeRegistrar || puedeVerCocina;
    const puedeVerMenu = permisos.includes('ver_menu');
    const puedeVerMesas = permisos.includes('ver_mesas') && Boolean(usuario?.sucursalid);
    const puedeGestionarProductos = permisos.includes('gestionar_productos');
    const [productos, setProductos] = useState([]);
    const [modificadores, setModificadores] = useState([]);
    const [mesas, setMesas] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
    const [carrito, setCarrito] = useState([]);
    const [mesaid, setMesaid] = useState('');
    const [nombreCliente, setNombreCliente] = useState('');
    const [notas, setNotas] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState('Factura');
    const [pestana, setPestana] = useState(puedeRegistrar ? 'tomar' : 'pedidos');
    const [ventaEditadaId, setVentaEditadaId] = useState(null);
    const [productoAgregarId, setProductoAgregarId] = useState('');
    const [cantidadAgregar, setCantidadAgregar] = useState(1);
    const [modificadoresAgregar, setModificadoresAgregar] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoVentas, setCargandoVentas] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [confirmacion, setConfirmacion] = useState(null);

    useEffect(() => {
        let activo = true;
        const solicitudes = [];

        if (puedeRegistrar && puedeVerMenu) {
            solicitudes.push(
                solicitudApi('/productos').then((respuesta) => {
                    if (activo) setProductos(respuesta.productos);
                }),
                solicitudApi('/modificadores').then((respuesta) => {
                    if (activo) setModificadores(respuesta.modificadores);
                })
            );
        }
        if (puedeVerListado) {
            solicitudes.push(
                solicitudApi('/ventas?pendientes=true&pagina=1&limite=100').then((respuesta) => {
                    if (activo) setVentas(respuesta.ventas);
                })
            );
        }
        if (puedeRegistrar && puedeVerMesas) {
            solicitudes.push(
                solicitudApi('/mesas').then((respuesta) => {
                    if (activo) setMesas(respuesta.mesas.filter((mesa) => mesa.estado !== 'inactiva'));
                })
            );
        }

        Promise.all(solicitudes)
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) {
                    setCargando(false);
                    setCargandoVentas(false);
                }
            });
        return () => { activo = false; };
    }, [puedeRegistrar, puedeVerMenu, puedeVerListado, puedeVerMesas]);

    const categorias = useMemo(
        () => ['Todas', ...new Set(productos.map((producto) => producto.categoria?.trim()).filter(Boolean))],
        [productos]
    );
    const productosFiltrados = useMemo(() => {
        const consulta = busqueda.trim().toLocaleLowerCase('es');
        return productos.filter((producto) => {
            const coincideCategoria = categoriaSeleccionada === 'Todas' ||
                producto.categoria?.trim() === categoriaSeleccionada;
            const coincideBusqueda = !consulta ||
                `${producto.nombre} ${producto.descripcion || ''} ${producto.categoria || ''}`
                    .toLocaleLowerCase('es')
                    .includes(consulta);
            return coincideCategoria && coincideBusqueda;
        });
    }, [productos, busqueda, categoriaSeleccionada]);

    const total = useMemo(() => carrito.reduce((suma, item) => {
        const precioModificadores = item.modificadores.reduce(
            (totalModificadores, id) => totalModificadores +
                Number(modificadores.find((modificador) => modificador.modificadorid === id)?.precio || 0),
            0
        );
        return suma + Math.round((Number(item.precio_venta) + precioModificadores) * 100) * item.cantidad;
    }, 0) / 100, [carrito, modificadores]);

    function agregarProducto(producto) {
        setCarrito((actual) => {
            const existente = actual.find((item) => item.id_producto === producto.id_producto);
            if (existente) {
                return actual.map((item) => item.id_producto === producto.id_producto
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item);
            }
            return [...actual, { ...producto, cantidad: 1, modificadores: [] }];
        });
        setError('');
        setConfirmacion(null);
    }

    function cambiarCantidad(idProducto, valor) {
        const cantidad = Number(valor);
        if (!Number.isInteger(cantidad) || cantidad < 1) return;
        setCarrito((actual) => actual.map((item) =>
            item.id_producto === idProducto ? { ...item, cantidad } : item
        ));
    }

    function alternarModificador(idProducto, idModificador) {
        setCarrito((actual) => actual.map((item) => {
            if (item.id_producto !== idProducto) return item;
            const modificadoresActuales = item.modificadores.includes(idModificador)
                ? item.modificadores.filter((id) => id !== idModificador)
                : [...item.modificadores, idModificador];
            return { ...item, modificadores: modificadoresActuales };
        }));
    }

    async function actualizarEstado(venta, estado_pedido) {
        setError('');
        try {
            await solicitudApi(`/ventas/${venta.id_venta}/estado-pedido`, {
                method: 'PATCH',
                body: { estado_pedido }
            });
            const respuesta = await solicitudApi('/ventas?pendientes=true&pagina=1&limite=100');
            setVentas(respuesta.ventas);
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    async function registrarVenta(event) {
        event.preventDefault();
        if (!nombreCliente.trim()) {
            setError('Ingresa el nombre del cliente para registrar el pedido.');
            return;
        }
        if (carrito.length === 0) {
            setError('Agrega al menos un producto al pedido.');
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
                    nombre_cliente: nombreCliente.trim(),
                    pagoPendiente: true,
                    ...(mesaid ? { mesaid: Number(mesaid) } : {}),
                    ...(notas.trim() ? { notas_generales: notas.trim() } : {}),
                    productos: carrito.map(({ id_producto, cantidad, modificadores: ids }) => ({
                        id_producto,
                        cantidad,
                        modificadores: ids.map((modificadorid) => ({ modificadorid }))
                    }))
                }
            });
            setConfirmacion(respuesta);
            setCarrito([]);
            setMesaid('');
            setNombreCliente('');
            setNotas('');

            if (puedeVerListado) {
                try {
                    const ventasActualizadas = await solicitudApi('/ventas?pendientes=true&pagina=1&limite=100');
                    setVentas(ventasActualizadas.ventas);
                } catch (fallo) {
                    setError(`Pedido registrado, pero no se pudo actualizar el listado: ${fallo.message}`);
                }
            }
        } catch (fallo) {
            setError(fallo instanceof ApiError ? fallo.message : 'No se pudo registrar el pedido.');
        } finally {
            setProcesando(false);
        }
    }

    async function agregarProductosPedido(venta) {
        const idProducto = Number(productoAgregarId);
        if (!idProducto || !Number.isInteger(cantidadAgregar) || cantidadAgregar < 1) {
            setError('Selecciona un producto y una cantidad válida.');
            return;
        }
        setProcesando(true);
        setError('');
        try {
            await solicitudApi(`/ventas/${venta.id_venta}/productos`, {
                method: 'POST',
                body: {
                    productos: [{
                        id_producto: idProducto,
                        cantidad: cantidadAgregar,
                        modificadores: modificadoresAgregar.map((modificadorid) => ({ modificadorid }))
                    }]
                }
            });
            const respuesta = await solicitudApi('/ventas?pendientes=true&pagina=1&limite=100');
            setVentas(respuesta.ventas);
            setVentaEditadaId(null);
            setProductoAgregarId('');
            setCantidadAgregar(1);
            setModificadoresAgregar([]);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    function alternarEdicionPedido(venta) {
        setVentaEditadaId((actual) => actual === venta.id_venta ? null : venta.id_venta);
        setProductoAgregarId('');
        setCantidadAgregar(1);
        setModificadoresAgregar([]);
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Ventas y pedidos</h1>
                    <p>Registra pedidos y consulta las cuentas abiertas de la sucursal.</p>
                </div>
                {puedeGestionarProductos && onGestionarMenu && (
                    <button className="secondary-button" type="button" onClick={onGestionarMenu}>
                        Administrar menú
                    </button>
                )}
            </header>
            {puedeVerListado && (
                <div className="sales-tabs" role="tablist" aria-label="Ventas y pedidos">
                    {puedeRegistrar && <button
                        type="button"
                        role="tab"
                        aria-selected={pestana === 'tomar'}
                        className={pestana === 'tomar' ? 'is-selected' : ''}
                        onClick={() => setPestana('tomar')}
                    >Tomar pedido</button>}
                    <button
                        type="button"
                        role="tab"
                        aria-selected={pestana === 'pedidos'}
                        className={pestana === 'pedidos' ? 'is-selected' : ''}
                        onClick={() => setPestana('pedidos')}
                    >Pedidos abiertos</button>
                </div>
            )}
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {confirmacion && (
                <div className="notice" role="status">
                    Pedido {confirmacion.correlativo} registrado por {moneda(confirmacion.total)}.
                    {confirmacion.inventario?.productos_sin_receta?.length > 0 &&
                        ` Sin receta: ${confirmacion.inventario.productos_sin_receta.map((item) => item.nombre).join(', ')}.`}
                </div>
            )}

            {puedeRegistrar && !puedeVerMenu && (
                <div className="notice is-error" role="alert">
                    Tu cuenta puede tomar pedidos, pero no tiene permiso para consultar el menú. Solicita `ver_menu` al administrador.
                </div>
            )}

            {puedeRegistrar && puedeVerMenu && pestana === 'tomar' && (
                <div className="sales-register-layout">
                    <section className="sales-catalog surface-card">
                        <div className="sales-catalog-heading">
                            <div>
                                <h2>¿Qué servimos hoy?</h2>
                                <p>Busca y agrega productos al pedido.</p>
                                <p className="sales-photo-credits">Las fotografias utilizadas son unicamente con fines ilustrativos. Creditos a: Zara Anaya, Jeder Iglesias y Elisa Gonzalez, por permitirnos usar sus fotografias </p>
                            </div>
                            <label className="sales-search">
                                <span className="sales-visually-hidden">Buscar producto</span>
                                <input
                                    type="search"
                                    placeholder="Buscar producto o ingrediente"
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                />
                            </label>
                        </div>
                        <div className="sales-category-list" aria-label="Categorías de productos">
                            {categorias.map((categoria) => (
                                <button
                                    className={`sales-category${categoriaSeleccionada === categoria ? ' is-selected' : ''}`}
                                    key={categoria}
                                    type="button"
                                    aria-pressed={categoriaSeleccionada === categoria}
                                    onClick={() => setCategoriaSeleccionada(categoria)}
                                >
                                    {categoria}
                                </button>
                            ))}
                        </div>
                        {cargando ? <p className="loading-state">Cargando menú…</p> :
                            productos.length === 0 ? <p className="empty-state">No hay productos activos para vender.</p> :
                                productosFiltrados.length === 0 ? <p className="empty-state">No hay productos que coincidan con la búsqueda.</p> : (
                                    <div className="sales-product-grid">
                                        {productosFiltrados.map((producto) => (
                                            <button
                                                className="sales-product-card"
                                                key={producto.id_producto}
                                                type="button"
                                                onClick={() => agregarProducto(producto)}
                                            >
                                                <span className="sales-product-category">{producto.categoria || 'Menú'}</span>
                                                {producto.imagen && <img className="sales-product-image" src={producto.imagen} alt="" />}
                                                <strong>{producto.nombre}</strong>
                                                {producto.descripcion && <span className="sales-product-description">{producto.descripcion}</span>}
                                                <span className="sales-product-bottom">
                                                    <strong>{moneda(producto.precio_venta)}</strong>
                                                    <span className="sales-product-add" aria-hidden="true">+</span>
                                                    <span className="sales-visually-hidden">Agregar {producto.nombre}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                    </section>

                    <form className="sales-order surface-card" onSubmit={registrarVenta}>
                        <div className="sales-order-heading">
                            <div>
                                <h2>Pedido actual</h2>
                                <p>{carrito.length} {carrito.length === 1 ? 'producto' : 'productos'}</p>
                            </div>
                            <button
                                className="secondary-button"
                                type="button"
                                disabled={carrito.length === 0}
                                onClick={() => { setCarrito([]); setError(''); }}
                            >
                                Limpiar
                            </button>
                        </div>

                        <label className="form-field sales-table-field">
                            Cliente
                            <input
                                maxLength="150"
                                required
                                value={nombreCliente}
                                onChange={(event) => setNombreCliente(event.target.value)}
                                placeholder="Nombre del cliente"
                            />
                        </label>

                        {puedeVerMesas && (
                            <label className="form-field sales-table-field">
                                Mesa (opcional)
                                <select value={mesaid} onChange={(event) => setMesaid(event.target.value)}>
                                    <option value="">Para llevar / Sin mesa</option>
                                    {mesas.map((mesa) => (
                                        <option key={mesa.mesaid} value={mesa.mesaid}>
                                            Mesa {mesa.numero_mesa} · {mesa.estado}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {carrito.length === 0 ? (
                            <p className="empty-state sales-empty-cart">Agrega productos desde el menú para comenzar.</p>
                        ) : (
                            <ul className="sales-cart-list">
                                {carrito.map((item) => {
                                    const totalModificadores = item.modificadores.reduce(
                                        (suma, id) => suma + Number(
                                            modificadores.find((modificador) => modificador.modificadorid === id)?.precio || 0
                                        ),
                                        0
                                    );
                                    return (
                                        <li className="sales-cart-item" key={item.id_producto}>
                                            <div className="sales-cart-item-heading">
                                                <div>
                                                    <strong>{item.nombre}</strong>
                                                    <span>{moneda(Number(item.precio_venta) + totalModificadores)} c/u</span>
                                                </div>
                                                <strong>{moneda((Number(item.precio_venta) + totalModificadores) * item.cantidad)}</strong>
                                            </div>
                                            {modificadores.length > 0 && (
                                                <details className="sales-modifiers">
                                                    <summary>Personalizar</summary>
                                                    <div className="sales-modifier-options">
                                                        {modificadores.map((modificador) => (
                                                            <label key={modificador.modificadorid}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.modificadores.includes(modificador.modificadorid)}
                                                                    onChange={() => alternarModificador(item.id_producto, modificador.modificadorid)}
                                                                />
                                                                {modificador.nombre}
                                                                <span>+{moneda(modificador.precio)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                            <div className="sales-cart-item-controls">
                                                <div className="sales-quantity-control" aria-label={`Cantidad de ${item.nombre}`}>
                                                    <button
                                                        type="button"
                                                        aria-label={`Quitar una unidad de ${item.nombre}`}
                                                        onClick={() => item.cantidad === 1
                                                            ? setCarrito((actual) => actual.filter((producto) => producto.id_producto !== item.id_producto))
                                                            : cambiarCantidad(item.id_producto, item.cantidad - 1)}
                                                    >
                                                        −
                                                    </button>
                                                    <span>{item.cantidad}</span>
                                                    <button
                                                        type="button"
                                                        aria-label={`Agregar una unidad de ${item.nombre}`}
                                                        onClick={() => cambiarCantidad(item.id_producto, item.cantidad + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    className="sales-remove-item"
                                                    type="button"
                                                    onClick={() => setCarrito((actual) => actual.filter((producto) => producto.id_producto !== item.id_producto))}
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <label className="form-field sales-notes">
                            Nota para el pedido
                            <textarea
                                maxLength="255"
                                placeholder="Indicaciones generales para cocina"
                                value={notas}
                                onChange={(event) => setNotas(event.target.value)}
                            />
                        </label>

                        <div className="sales-total">
                            <span>Total</span>
                            <strong>{moneda(total)}</strong>
                        </div>
                        <div className="sales-order-options">
                            <label className="form-field">
                                Documento
                                <select value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value)}>
                                    <option value="Factura">Factura</option>
                                    <option value="CCF">Crédito fiscal</option>
                                </select>
                            </label>
                        </div>
                        <button className="primary-button sales-submit-button" type="submit" disabled={procesando || carrito.length === 0}>
                            {procesando ? 'Registrando…' : 'Enviar pedido'}
                            {!procesando && <span aria-hidden="true">→</span>}
                        </button>
                    </form>
                </div>
            )}

            {puedeVerListado && (!puedeRegistrar || pestana === 'pedidos') && (
                <section className="surface-card sales-history">
                    <h2>Pedidos abiertos</h2>
                    {cargandoVentas ? <p className="loading-state">Cargando pedidos…</p> :
                        ventas.length === 0 ? <p className="empty-state">No hay pedidos abiertos.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Mesa</th><th>Cliente</th><th>Detalle</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
                                    <tbody>
                                        {ventas.map((venta) => (
                                            <Fragment key={venta.id_venta}>
                                            <tr>
                                                <td>{venta.mesas?.numero_mesa || 'Para llevar'}</td>
                                                <td>{venta.nombre_cliente || '—'}</td>
                                                <td>{venta.venta_detalle.map((linea) => `${linea.productos.nombre} × ${linea.cantidad}`).join(', ')}</td>
                                                <td>{moneda(venta.total)}</td>
                                                <td><span className="status-pill">{venta.estado_pedido}</span></td>
                                                <td>{puedeGestionarPedidos && <div className="page-actions">
                                                    {puedeRegistrar && <button className="secondary-button" type="button" onClick={() => alternarEdicionPedido(venta)}>
                                                        {ventaEditadaId === venta.id_venta ? 'Cerrar edición' : 'Editar / agregar platos'}
                                                    </button>}
                                                    {venta.estado_pedido === 'abierto' && <button className="secondary-button" type="button" onClick={() => actualizarEstado(venta, 'en_cocina')}>Enviar a cocina</button>}
                                                    {venta.estado_pedido === 'en_cocina' && <button className="secondary-button" type="button" onClick={() => actualizarEstado(venta, 'servido')}>Marcar servido</button>}
                                                    {['abierto', 'en_cocina'].includes(venta.estado_pedido) && <button className="danger-button" type="button" onClick={() => actualizarEstado(venta, 'cancelado')}>Cancelar</button>}
                                                </div>}</td>
                                            </tr>
                                            {ventaEditadaId === venta.id_venta && puedeRegistrar && (
                                                <tr key={`${venta.id_venta}-editar`}>
                                                    <td colSpan="6">
                                                        <form className="inline-form" onSubmit={(event) => {
                                                            event.preventDefault();
                                                            agregarProductosPedido(venta);
                                                        }}>
                                                            <label className="form-field">Agregar producto
                                                                <select required value={productoAgregarId} onChange={(event) => {
                                                                    setProductoAgregarId(event.target.value);
                                                                    setModificadoresAgregar([]);
                                                                }}>
                                                                    <option value="">Selecciona un producto</option>
                                                                    {productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre}</option>)}
                                                                </select>
                                                            </label>
                                                            <label className="form-field">Cantidad
                                                                <input type="number" min="1" max="1000" step="1" value={cantidadAgregar} onChange={(event) => setCantidadAgregar(Number(event.target.value))} />
                                                            </label>
                                                            {modificadores.length > 0 && <fieldset className="sales-add-modifiers">
                                                                <legend>Modificadores</legend>
                                                                {modificadores.map((modificador) => (
                                                                    <label key={modificador.modificadorid}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={modificadoresAgregar.includes(modificador.modificadorid)}
                                                                            onChange={() => setModificadoresAgregar((actuales) =>
                                                                                actuales.includes(modificador.modificadorid)
                                                                                    ? actuales.filter((id) => id !== modificador.modificadorid)
                                                                                    : [...actuales, modificador.modificadorid])}
                                                                        />
                                                                        {modificador.nombre}
                                                                    </label>
                                                                ))}
                                                            </fieldset>}
                                                            <button className="primary-button" type="submit" disabled={procesando}>{procesando ? 'Guardando…' : 'Agregar al pedido'}</button>
                                                        </form>
                                                    </td>
                                                </tr>
                                            )}
                                            </Fragment>
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
