// Clase de error personalizada que extiende Error para asociar un código HTTP y detalle estructurado a fallos de inventario
export class ErrorInventario extends Error {
    constructor(mensaje, codigoHttp = 400, detalle = null) {
        super(mensaje);
        this.name = 'ErrorInventario';
        this.codigoHttp = codigoHttp;
        this.detalle = detalle;
    }
}

//Funcion que redondea el numero a dos decimales 
function redondearADosDecimales(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

//Export para normalizar el arreglo de productos de una venta
export function normalizarProductosVenta(productos) {
    if (!Array.isArray(productos) || productos.length === 0) {
        throw new ErrorInventario('Debe enviar al menos un producto en el arreglo "productos"', 400);
    }

    const cantidadesPorProducto = new Map();
    for (const [posicion, elemento] of productos.entries()) {
        const idProducto = elemento?.id_producto;
        const cantidad = elemento?.cantidad;

        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            throw new ErrorInventario(`El elemento ${posicion} no tiene un id_producto válido`, 400);
        }
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            throw new ErrorInventario(`El elemento ${posicion} no tiene una cantidad válida`, 400);
        }
        cantidadesPorProducto.set(idProducto, (cantidadesPorProducto.get(idProducto) ?? 0) + cantidad);
    }

    return Array.from(cantidadesPorProducto, ([id_producto, cantidad]) => ({ id_producto, cantidad }));
}

//Funcion para calificar el nivel de stock de un insumo
function clasificarNivel(stockActual, stockMinimo) {
    if (stockActual <= 0) return 'AGOTADO';
    if (stockActual <= stockMinimo) return 'STOCK_BAJO';
    return null;
}

//Funcion para construir las alertas de stock a partir de un arreglo de insumos osea los insumos activos que estan en stock bajo o agotado
function construirAlertas(insumos) {
    const alertas = [];
    for (const insumo of insumos) {
        if (insumo.activo === false) continue;

        const stockActual = Number(insumo.stock_actual ?? 0); // la columna permite NULL
        const stockMinimo = Number(insumo.stock_minimo ?? 0);
        const nivel = clasificarNivel(stockActual, stockMinimo);
        if (nivel === null) continue;

        alertas.push({
            id_insumo: insumo.id_insumo,
            nombre: insumo.nombre,
            unidad_medida: insumo.unidad_medida,
            stock_actual: stockActual,
            stock_minimo: stockMinimo,
            nivel,
            faltante_para_minimo: redondearADosDecimales(Math.max(stockMinimo - stockActual, 0))
        });
    }

    alertas.sort((a, b) => {
        const prioridadA = a.nivel === 'AGOTADO' ? 0 : 1;
        const prioridadB = b.nivel === 'AGOTADO' ? 0 : 1;
        return prioridadA - prioridadB || a.id_insumo - b.id_insumo;
    });
    return alertas;
}

//Funcion para calcualr la explosion de materiales de una venta, es decir, calcular el consumo de insumos a partir de los productos vendidos y sus recetas
async function calcularExplosion(cliente, productosVenta) {
    const idsProductos = productosVenta.map((producto) => producto.id_producto);

    const productosEncontrados = await cliente.productos.findMany({
        where: { id_producto: { in: idsProductos } },
        select: { id_producto: true, nombre: true, activo: true }
    });
    const nombrePorProducto = new Map(productosEncontrados.map((p) => [p.id_producto, p.nombre]));

    const idsInexistentes = idsProductos.filter((id) => !nombrePorProducto.has(id));
    if (idsInexistentes.length > 0) {
        throw new ErrorInventario(
            `Los productos con id ${idsInexistentes.join(', ')} no existen`, 404, { ids_inexistentes: idsInexistentes });
    }
    const inactivos = productosEncontrados.filter((p) => p.activo === false);
    if (inactivos.length > 0) {
        throw new ErrorInventario(
            `Los productos ${inactivos.map((p) => p.nombre).join(', ')} están desactivados`, 409);
    }

    // Filas de receta de los productos, con su insumo (relación "insumos" del esquema).
    const filasReceta = await cliente.recetas_detalle.findMany({
        where: { id_producto: { in: idsProductos } },
        include: { insumos: true }
    });

    const cantidadVendida = new Map(productosVenta.map((p) => [p.id_producto, p.cantidad]));
    const productosConReceta = new Set();
    const consumosPorInsumo = new Map(); // id_insumo -> consumo acumulado

    for (const fila of filasReceta) {
        productosConReceta.add(fila.id_producto);
        // Receta x cantidad vendida. Ej.: 18 g de café x 2 Lattes = 36 g.
        const cantidadUsada = Number(fila.cantidad_requerida) * cantidadVendida.get(fila.id_producto);

        let consumo = consumosPorInsumo.get(fila.id_insumo);
        if (!consumo) {
            consumo = {
                id_insumo: fila.id_insumo,
                nombre: fila.insumos.nombre,
                unidad_medida: fila.insumos.unidad_medida,
                stock_actual: Number(fila.insumos.stock_actual ?? 0),
                cantidad_total: 0,
                origen: []
            };
            consumosPorInsumo.set(fila.id_insumo, consumo);
        }
        consumo.cantidad_total += cantidadUsada; // insumo compartido: se suma
        consumo.origen.push({
            id_producto: fila.id_producto,
            producto: nombrePorProducto.get(fila.id_producto),
            cantidad_vendida: cantidadVendida.get(fila.id_producto),
            cantidad_usada: redondearADosDecimales(cantidadUsada)
        });
    }

    // Orden fijo por id: evita interbloqueos entre ventas simultáneas.
    const consumos = Array.from(consumosPorInsumo.values())
        .map((consumo) => ({ ...consumo, cantidad_total: redondearADosDecimales(consumo.cantidad_total) }))
        .sort((a, b) => a.id_insumo - b.id_insumo);

    const productosSinReceta = productosVenta
        .filter((producto) => !productosConReceta.has(producto.id_producto))
        .map((producto) => ({ id_producto: producto.id_producto, nombre: nombrePorProducto.get(producto.id_producto) }));

    return { consumos, productosSinReceta };
}

//Funcion para obtener los insumos que no alcanzan para otra orden
function obtenerFaltantes(consumos) {
    return consumos
        .filter((consumo) => consumo.stock_actual < consumo.cantidad_total)
        .map((consumo) => ({
            id_insumo: consumo.id_insumo,
            nombre: consumo.nombre,
            unidad_medida: consumo.unidad_medida,
            stock_actual: consumo.stock_actual,
            cantidad_requerida: consumo.cantidad_total,
            cantidad_faltante: redondearADosDecimales(consumo.cantidad_total - consumo.stock_actual)
        }));
}

//Export para devolver el consumo de insumos a partir de los productos vendidos y sus recetas 
export async function simularExplosion(cliente, productosVenta) {
    const { consumos, productosSinReceta } = await calcularExplosion(cliente, productosVenta);
    const faltantes = obtenerFaltantes(consumos);

    return {
        alcanza_inventario: faltantes.length === 0,
        consumos: consumos.map((consumo) => ({
            ...consumo,
            stock_restante: redondearADosDecimales(consumo.stock_actual - consumo.cantidad_total),
            alcanza: consumo.stock_actual >= consumo.cantidad_total
        })),
        faltantes,
        productos_sin_receta: productosSinReceta
    };
}

//Export para descontar el consumo de insumso 
export async function ejecutarExplosion(cliente, productosVenta) {
    const { consumos, productosSinReceta } = await calcularExplosion(cliente, productosVenta);

    const faltantes = obtenerFaltantes(consumos);
    if (faltantes.length > 0) {
        throw new ErrorInventario(
            `Stock insuficiente de: ${faltantes.map((f) => f.nombre).join(', ')}`, 409, { faltantes });
    }

    for (const consumo of consumos) {
        const resultado = await cliente.insumos.updateMany({
            where: { id_insumo: consumo.id_insumo, stock_actual: { gte: consumo.cantidad_total } },
            data: { stock_actual: { decrement: consumo.cantidad_total } }
        });
        if (resultado.count === 0) { // el stock cambió mientras se procesaba la orden
            throw new ErrorInventario(
                `El stock de "${consumo.nombre}" cambió mientras se procesaba la orden. Intente de nuevo`, 409,
                { id_insumo: consumo.id_insumo });
        }
    }

    // Se releen los insumos tocados para devolver el stock real y evaluar alertas.
    const insumosActualizados = await cliente.insumos.findMany({
        where: { id_insumo: { in: consumos.map((consumo) => consumo.id_insumo) } }
    });
    const stockNuevo = new Map(insumosActualizados.map((i) => [i.id_insumo, Number(i.stock_actual ?? 0)]));

    return {
        consumos: consumos.map((consumo) => ({
            id_insumo: consumo.id_insumo,
            nombre: consumo.nombre,
            unidad_medida: consumo.unidad_medida,
            cantidad_descontada: consumo.cantidad_total,
            stock_anterior: consumo.stock_actual,
            stock_nuevo: stockNuevo.get(consumo.id_insumo),
            origen: consumo.origen
        })),
        productos_sin_receta: productosSinReceta,
        alertas_stock: construirAlertas(insumosActualizados)
    };
}

//Export para obtener alertas para los insumos que estan con un stock bajo o agotado
export async function obtenerAlertasStock(cliente) {
    const insumosActivos = await cliente.insumos.findMany({ where: { activo: true } });
    return construirAlertas(insumosActivos);
}

//Export para listar los insumos con sus stock y estado
export async function listarInsumos(cliente) {
    const insumos = await cliente.insumos.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });

    return insumos.map((insumo) => {
        const stockActual = Number(insumo.stock_actual ?? 0);
        const stockMinimo = Number(insumo.stock_minimo ?? 0);
        return {
            id_insumo: insumo.id_insumo,
            nombre: insumo.nombre,
            unidad_medida: insumo.unidad_medida,
            stock_actual: stockActual,
            stock_minimo: stockMinimo,
            costo_promedio: Number(insumo.costo_promedio ?? 0),
            estado: clasificarNivel(stockActual, stockMinimo) ?? 'NORMAL'
        };
    });
}

//Export que funciona para obtener los insumos que se encuentran bajos para las recetas
export async function obtenerRecetas(cliente, idProducto = null) {
    const filtroProducto = { activo: true };
    if (idProducto !== null) filtroProducto.id_producto = idProducto;

    const productos = await cliente.productos.findMany({
        where: filtroProducto,
        orderBy: { nombre: 'asc' },
        select: { id_producto: true, nombre: true, categoria: true, precio_venta: true, es_reventa: true }
    });
    if (idProducto !== null && productos.length === 0) {
        throw new ErrorInventario(`El producto ${idProducto} no existe o está desactivado`, 404);
    }

    const filasReceta = await cliente.recetas_detalle.findMany({
        where: { id_producto: { in: productos.map((producto) => producto.id_producto) } },
        include: { insumos: true }
    });

    return productos.map((producto) => {
        const ingredientes = filasReceta
            .filter((fila) => fila.id_producto === producto.id_producto)
            .map((fila) => {
                const cantidadRequerida = Number(fila.cantidad_requerida);
                const costoPromedio = Number(fila.insumos.costo_promedio ?? 0);
                return {
                    id_insumo: fila.id_insumo,
                    insumo: fila.insumos.nombre,
                    unidad_medida: fila.insumos.unidad_medida,
                    cantidad_requerida: cantidadRequerida,
                    costo_linea: Math.round(cantidadRequerida * costoPromedio * 10000) / 10000
                };
            });
        const costoReceta = ingredientes.reduce((acumulado, ingrediente) => acumulado + ingrediente.costo_linea, 0);

        return {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            categoria: producto.categoria,
            es_reventa: producto.es_reventa === true,
            precio_venta: Number(producto.precio_venta),
            ingredientes,
            costo_receta: Math.round(costoReceta * 10000) / 10000
        };
    });
}