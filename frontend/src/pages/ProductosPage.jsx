import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

const productoVacio = {
    nombre: '',
    descripcion: '',
    precio_venta: '',
    categoria: '',
    es_reventa: false,
    imagen: ''
};

function ProductosPage({ permisos = [] }) {
    const puedeVer = permisos.includes('ver_menu');
    const puedeGestionar = permisos.includes('gestionar_productos');
    const puedeConfigurarRecetas = puedeGestionar &&
        permisos.includes('gestionar_inventario') && permisos.includes('ver_inventario');
    const [productos, setProductos] = useState([]);
    const [insumos, setInsumos] = useState([]);
    const [producto, setProducto] = useState(productoVacio);
    const [ingredientes, setIngredientes] = useState([]);
    const [recetaCargada, setRecetaCargada] = useState(true);
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
            } else {
                const respuestaProductos = await solicitudApi('/productos');
                setProductos(respuestaProductos.productos);
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
        if (puedeVer) solicitudes.push(solicitudApi('/productos'));
        if (puedeConfigurarRecetas) solicitudes.push(solicitudApi('/inventario/insumos/catalogo'));
        Promise.all(solicitudes)
            .then((respuestas) => {
                if (!activo) return;
                let indice = 0;
                if (puedeVer) setProductos(respuestas[indice++].productos);
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

    function seleccionarImagen(event) {
        const archivo = event.target.files?.[0];
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 1024 * 1024) {
            setError('Selecciona una imagen JPEG, PNG o WebP de máximo 1 MB.');
            event.target.value = '';
            return;
        }
        const lector = new FileReader();
        lector.onload = () => {
            if (typeof lector.result === 'string') {
                setProducto((actual) => ({ ...actual, imagen: lector.result }));
                setError('');
            } else {
                setError('No se pudo leer la imagen seleccionada.');
            }
        };
        lector.onerror = () => setError('No se pudo leer la imagen seleccionada.');
        lector.readAsDataURL(archivo);
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
            es_reventa: item.es_reventa,
            imagen: item.imagen || ''
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
                    <p>Consulta el menú y administra productos según tus permisos.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}

            {puedeGestionar && (
                <>
                    <form className="surface-card product-form-card" onSubmit={enviarProducto}>
                        <h2>{productoEditado ? 'Editar producto' : 'Nuevo producto'}</h2>
                        <div className="form-grid product-form-grid">
                            <div className="product-form-column">
                                <label className="form-field product-name-field">Nombre<input maxLength="150" required value={producto.nombre} onChange={(event) => setProducto({ ...producto, nombre: event.target.value })} /></label>
                                <label className="form-field product-price-field">Precio ($)<input type="number" min="0" max="99999999.99" step="0.01" required value={producto.precio_venta} onChange={(event) => setProducto({ ...producto, precio_venta: event.target.value })} /></label>
                                <label className="form-field product-type-field">
                                    <span>Tipo</span>
                                    <span className="product-checkbox-option">
                                        <input type="checkbox" checked={producto.es_reventa} onChange={(event) => setProducto({ ...producto, es_reventa: event.target.checked })} />
                                        Producto de reventa
                                    </span>
                                </label>
                                {puedeConfigurarRecetas && (
                                    <div className="product-recipe-section">
                                        <h3>Receta</h3>
                                        {ingredientes.map((ingrediente, indice) => (
                                            <div className="inline-form product-ingredient-row" key={`${ingrediente.id_insumo}-${indice}`}>
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
                            </div>
                            <div className="product-form-column">
                                <label className="form-field product-category-field">Categoría<input maxLength="50" value={producto.categoria} onChange={(event) => setProducto({ ...producto, categoria: event.target.value })} /></label>
                                <label className="form-field product-description-field">Descripción<textarea value={producto.descripcion} onChange={(event) => setProducto({ ...producto, descripcion: event.target.value })} /></label>
                                <label className="form-field product-photo-field">Fotografía del producto
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagen} />
                                    <small>JPEG, PNG o WebP · máximo 1 MB. Se guarda en la base de datos.</small>
                                </label>
                                {producto.imagen && <div className="product-image-preview product-form-preview">
                                    <img
                                        src={producto.imagen}
                                        alt={`Vista previa de ${producto.nombre || 'producto'}`}
                                        style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                                    />
                                    <button className="secondary-button" type="button" onClick={() => setProducto({ ...producto, imagen: '' })}>Quitar imagen</button>
                                </div>}
                            </div>
                        </div>
                        <div className="page-actions product-form-actions">
                            <button className="primary-button" type="submit" disabled={procesando || !recetaCargada}>{procesando ? 'Guardando…' : !recetaCargada ? 'Cargando receta…' : productoEditado ? 'Guardar producto' : 'Crear producto'}</button>
                            {productoEditado && <button className="secondary-button" type="button" onClick={() => { setProductoEditado(null); setProducto(productoVacio); setIngredientes([]); setRecetaCargada(true); }}>Cancelar</button>}
                        </div>
                    </form>

                </>
            )}

            {puedeVer ? (
                <>
                    <section className="surface-card" style={{ marginTop: 16 }}>
                        <h2>Productos activos</h2>
                        {cargando ? <p className="loading-state">Cargando menú…</p> :
                            productos.length === 0 ? <p className="empty-state">No hay productos activos.</p> : (
                                <div className="data-table-wrap">
                                    <table className="data-table">
                                        <thead><tr><th>Foto</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Tipo</th>{puedeGestionar && <th>Acciones</th>}</tr></thead>
                                        <tbody>
                                            {productos.map((item) => (
                                                <tr key={item.id_producto}>
                                                    <td>{item.imagen ? <img src={item.imagen} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} /> : '—'}</td>
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
                </>
            ) : (
                <div className="notice is-info">Tu cuenta puede administrar el menú, pero no tiene permiso para consultar el listado activo.</div>
            )}
        </>
    );
}

export default ProductosPage;
