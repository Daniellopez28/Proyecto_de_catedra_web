export class ErrorInventario extends Error {
    constructor(mensaje, codigoHttp = 400, detalle = null) {
        super(mensaje);
        this.name = 'ErrorInventario';
        this.codigoHttp = codigoHttp;
        this.detalle = detalle;
    }
}

/** Redondea a 2 decimales (precisión de las columnas DECIMAL(10,2)). */
function redondearADosDecimales(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Valida el arreglo "productos" del body y suma los productos repetidos. */
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

/** Única definición de las reglas de alerta: 'AGOTADO', 'STOCK_BAJO' o null. */
function clasificarNivel(stockActual, stockMinimo) {
    if (stockActual <= 0) return 'AGOTADO';
    if (stockActual <= stockMinimo) return 'STOCK_BAJO';
    return null;
}

/** Convierte insumos en alertas (ignora inactivos); los AGOTADO van primero. */
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

/**
 * Calcula cuánto de cada insumo hace falta (solo lectura).
 * Lanza 404 si un producto no existe y 409 si está desactivado.
 */
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

/** Lista los insumos cuyo stock no alcanza para el consumo calculado. */
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

/** Indica si el inventario alcanza para la orden, sin modificar nada. */
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

/**
 * Descuenta los insumos. Llamar con el cliente de una transacción (tx).
 * Protección doble: verificación previa (informa todos los faltantes) y UPDATE condicionado
 * a stock_actual >= cantidad (si otra venta se llevó el stock, afecta 0 filas y aborta).
 */
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

/** Insumos activos agotados o bajo el mínimo. Se filtra en memoria porque Prisma no compara dos columnas. */
export async function obtenerAlertasStock(cliente) {
    const insumosActivos = await cliente.insumos.findMany({ where: { activo: true } });
    return construirAlertas(insumosActivos);
}

/** Tabla de inventario: insumos activos con su estado (NORMAL, STOCK_BAJO o AGOTADO). */
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

/**
 * Recetas de los productos activos con su costo de elaboración (suma de cantidad x costo promedio).
 * Con idProducto devuelve solo esa; lanza 404 si no existe o está desactivado.
 */
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