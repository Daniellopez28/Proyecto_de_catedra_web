import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

const productoVacio = {
    nombre: '',
    descripcion: '',
    precio_venta: '',
    categoria: '',
    es_reventa: false
};

function ProductosPage({ permisos = [] }) {
    const puedeVer = permisos.includes('ver_menu');
    const puedeGestionar = permisos.includes('gestionar_productos');
    const puedeConfigurarRecetas = puedeGestionar &&
        permisos.includes('gestionar_inventario') && permisos.includes('ver_inventario');
    const [productos, setProductos] = useState([]);
    const [modificadores, setModificadores] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [producto, setProducto] = useState(productoVacio);
    const [ingredientes, setIngredientes] = useState([]);
    const [recetaCargada, setRecetaCargada] = useState(true);
    const [modificador, setModificador] = useState({ nombre: '', precio: '' });
    const [productoEditado, setProductoEditado] = useState(null);
    const [cargando, setCargando] = useState(puedeVer);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            if (!puedeVer) {
                setProductos([]);
                setModificadores([]);
            } else {
                const [respuestaProductos, respuestaModificadores] = await Promise.all([
                    solicitudApi('/productos'),
                    solicitudApi('/modificadores')
                ]);
                setProductos(respuestaProductos.productos);
                setModificadores(respuestaModificadores.modificadores);
            }
            if (puedeConfigurarRecetas) {
                const respuestaInsumos = await solicitudApi('/inventario/insumos/catalogo');
                setInsumos(respuestaInsumos.insumos);
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
        if (puedeVer) {
            solicitudes.push(Promise.all([solicitudApi('/productos'), solicitudApi('/modificadores')]));
        }
        if (puedeConfigurarRecetas) solicitudes.push(solicitudApi('/inventario/insumos/catalogo'));
        Promise.all(solicitudes)
            .then((respuestas) => {
                if (!activo) return;
                let indice = 0;
                if (puedeVer) {
                    const [respuestaProductos, respuestaModificadores] = respuestas[indice++];
                    setProductos(respuestaProductos.productos);
                    setModificadores(respuestaModificadores.modificadores);
                }
                if (puedeConfigurarRecetas) setInsumos(respuestas[indice].insumos);
            })
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => { activo = false; };
    }, [puedeVer, puedeConfigurarRecetas]);

    async function enviarProducto(event) {
        event.preventDefault();
        if (productoEditado && puedeConfigurarRecetas && !recetaCargada) return;
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const body = {
                ...producto,
                precio_venta: Number(producto.precio_venta),
                ...(puedeConfigurarRecetas ? { ingredientes: ingredientes.map((item) => ({
                    id_insumo: Number(item.id_insumo),
                    cantidad_requerida: Number(item.cantidad_requerida)
                })) } : {})
            };
            const respuesta = productoEditado
                ? await solicitudApi(`/productos/${productoEditado.id_producto}`, {
                    method: 'PATCH',
                    body
                })
                : await solicitudApi('/productos', { method: 'POST', body });
            setMensaje(respuesta.mensaje);
            setProducto(productoVacio);
            setIngredientes([]);
            setProductoEditado(null);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function crearModificador(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/modificadores', {
                method: 'POST',
                body: { ...modificador, precio: Number(modificador.precio) }
            });
            setMensaje(respuesta.mensaje);
            setModificador({ nombre: '', precio: '' });
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function cambiarEstadoModificador(item) {
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/modificadores/${item.modificadorid}`, {
                method: 'PATCH',
                body: { activo: false }
            });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        }
    }

    function editarProducto(item) {
        if (productoEditado) {
            setError('Guarda o cancela la edición actual antes de abrir otro producto.');
            return;
        }
        setProductoEditado(item);
        setProducto({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            precio_venta: String(item.precio_venta),
            categoria: item.categoria || '',
            es_reventa: item.es_reventa
        });
        if (puedeConfigurarRecetas) {
            setIngredientes([]);
            setRecetaCargada(false);
            solicitudApi(`/inventario/recetas/${item.id_producto}`)
                .then((receta) => {
                    setIngredientes(receta.ingredientes.map((linea) => ({
                        id_insumo: String(linea.id_insumo),
                        cantidad_requerida: String(linea.cantidad_requerida)
                    })));
                    setRecetaCargada(true);
                })
                .catch((fallo) => setError(fallo.message));
        }
    }

    async function desactivarProducto(item) {
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi(`/productos/${item.id_producto}`, {
                method: 'PATCH',
                body: { activo: false }
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
                    <h1>Menú y productos</h1>
                    <p>Consulta el menú y administra productos y modificadores según tus permisos.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}

            {puedeGestionar && (
                <div className="form-grid">
                    <form className="surface-card" onSubmit={enviarProducto}>
                        <h2>{productoEditado ? 'Editar producto' : 'Nuevo producto'}</h2>
                        <div className="form-grid">
                            <label className="form-field">Nombre<input maxLength="150" required value={producto.nombre} onChange={(event) => setProducto({ ...producto, nombre: event.target.value })} /></label>
                            <label className="form-field">Categoría<input maxLength="50" value={producto.categoria} onChange={(event) => setProducto({ ...producto, categoria: event.target.value })} /></label>
                            <label className="form-field">Precio ($)<input type="number" min="0" max="99999999.99" step="0.01" required value={producto.precio_venta} onChange={(event) => setProducto({ ...producto, precio_venta: event.target.value })} /></label>
                            <label className="form-field">Descripción<textarea value={producto.descripcion} onChange={(event) => setProducto({ ...producto, descripcion: event.target.value })} /></label>
                            <label className="form-field"><span>Tipo</span><span><input type="checkbox" checked={producto.es_reventa} onChange={(event) => setProducto({ ...producto, es_reventa: event.target.checked })} /> Producto de reventa</span></label>
                        </div>
                        {puedeConfigurarRecetas && (
                            <div style={{ marginTop: 16 }}>
                                <h3>Receta</h3>
                                {ingredientes.map((ingrediente, indice) => (
                                    <div className="inline-form" key={`${ingrediente.id_insumo}-${indice}`} style={{ marginBottom: 10 }}>
                                        <label className="form-field">Insumo<select required value={ingrediente.id_insumo} onChange={(event) => setIngredientes((actuales) => actuales.map((item, index) => index === indice ? { ...item, id_insumo: event.target.value } : item))}>
                                            <option value="">Selecciona un insumo</option>
                                            {insumos.map((insumo) => <option key={insumo.id_insumo} value={insumo.id_insumo}>{insumo.nombre} · {insumo.unidad_medida}</option>)}
                                        </select></label>
                                        <label className="form-field">Cantidad requerida<input type="number" min="0.01" step="0.01" required value={ingrediente.cantidad_requerida} onChange={(event) => setIngredientes((actuales) => actuales.map((item, index) => index === indice ? { ...item, cantidad_requerida: event.target.value } : item))} /></label>
                                        <button className="danger-button" type="button" onClick={() => setIngredientes((actuales) => actuales.filter((_, index) => index !== indice))}>Quitar</button>
                                    </div>
                                ))}
                                <button className="secondary-button" type="button" onClick={() => setIngredientes((actuales) => [...actuales, { id_insumo: '', cantidad_requerida: '' }])}>Agregar ingrediente</button>
                            </div>
                        )}
                        <div className="page-actions" style={{ marginTop: 16 }}>
                            <button className="primary-button" type="submit" disabled={procesando || !recetaCargada}>{procesando ? 'Guardando…' : !recetaCargada ? 'Cargando receta…' : productoEditado ? 'Guardar producto' : 'Crear producto'}</button>
                            {productoEditado && <button className="secondary-button" type="button" onClick={() => { setProductoEditado(null); setProducto(productoVacio); setIngredientes([]); setRecetaCargada(true); }}>Cancelar</button>}
                        </div>
                    </form>

                    <form className="surface-card" onSubmit={crearModificador}>
                        <h2>Nuevo modificador</h2>
                        <div className="form-grid">
                            <label className="form-field">Nombre<input maxLength="100" required value={modificador.nombre} onChange={(event) => setModificador({ ...modificador, nombre: event.target.value })} /></label>
                            <label className="form-field">Precio adicional ($)<input type="number" min="0" max="99999999.99" step="0.01" required value={modificador.precio} onChange={(event) => setModificador({ ...modificador, precio: event.target.value })} /></label>
                        </div>
                        <button className="primary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>Crear modificador</button>
                    </form>
                </div>
            )}

            {puedeVer ? (
                <>
                    <section className="surface-card" style={{ marginTop: 16 }}>
                        <h2>Productos activos</h2>
                        {cargando ? <p className="loading-state">Cargando menú…</p> :
                            productos.length === 0 ? <p className="empty-state">No hay productos activos.</p> : (
                                <div className="data-table-wrap">
                                    <table className="data-table">
                                        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Tipo</th>{puedeGestionar && <th>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {productos.map((item) => (
                                                <tr key={item.id_producto}>
                                                    <td>{item.nombre}</td>
                                                    <td>{item.categoria || '—'}</td>
                                                    <td>${Number(item.precio_venta).toFixed(2)}</td>
                                                    <td>{item.es_reventa ? 'Reventa' : 'Preparación'}</td>
                                                    {puedeGestionar && <td><div className="page-actions">
                                                        <button className="secondary-button" type="button" onClick={() => editarProducto(item)}>Editar</button>
                                                        <button className="danger-button" type="button" onClick={() => desactivarProducto(item)}>Desactivar</button>
                                                    </div></td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </section>
                    <section className="surface-card">
                        <h2>Modificadores activos</h2>
                        {modificadores.length === 0 ? <p className="empty-state">No hay modificadores activos.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Modificador</th><th>Adicional</th>{puedeGestionar && <th>Acciones</th>}</tr></thead>
                                    <tbody>
                                        {modificadores.map((item) => (
                                            <tr key={item.modificadorid}>
                                                <td>{item.nombre}</td>
                                                <td>${Number(item.precio).toFixed(2)}</td>
                                                {puedeGestionar && <td><button className="danger-button" type="button" onClick={() => cambiarEstadoModificador(item)}>Desactivar</button></td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : (
                <div className="notice is-info">Tu cuenta puede administrar el menú, pero no tiene permiso para consultar el listado activo.</div>
            )}
        </>
    );
}

export default ProductosPage;
