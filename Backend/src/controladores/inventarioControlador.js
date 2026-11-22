import prisma from '../config/prisma.js';
import {
    ErrorInventario,
    normalizarProductosVenta,
    ejecutarExplosion,
    simularExplosion,
    obtenerAlertasStock,
    listarInsumos,
    obtenerRecetas
} from '../servicios/inventarioServicio.js';

/** Responde con el código del ErrorInventario; cualquier otro error es un 500 sin detalles internos. */
function manejarError(error, respuesta) {
    if (error instanceof ErrorInventario) {
        return respuesta.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
    }
    console.error('Error inesperado en el módulo de inventario:', error);
    return respuesta.status(500).json({ mensaje: 'Error interno del servidor', detalle: null });
}

/** POST /api/inventario/explosion  Body: { productos: [{ id_producto, cantidad }] } */
export async function explotarMateriales(peticion, respuesta) {
    try {
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        // tx: si algún insumo falla, no se descuenta ninguno (todo o nada).
        const resultado = await prisma.$transaction((tx) => ejecutarExplosion(tx, productosVenta));
        return respuesta.status(200).json({ mensaje: 'Inventario descontado correctamente', ...resultado });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

/** POST /api/inventario/explosion/simulacion  Mismo body; no modifica el inventario. */
export async function simularExplosionMateriales(peticion, respuesta) {
    try {
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        return respuesta.status(200).json(await simularExplosion(prisma, productosVenta));
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

/** GET /api/inventario/alertas  Insumos agotados o bajo el mínimo. */
export async function consultarAlertasStock(peticion, respuesta) {
    try {
        const alertas = await obtenerAlertasStock(prisma);
        return respuesta.status(200).json({ total: alertas.length, alertas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

/** GET /api/inventario/insumos  Tabla de inventario con estado de stock. */
export async function consultarInsumos(peticion, respuesta) {
    try {
        const insumos = await listarInsumos(prisma);
        return respuesta.status(200).json({ total: insumos.length, insumos });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

/** GET /api/inventario/recetas  Recetas de todos los productos con su costo. */
export async function consultarRecetas(peticion, respuesta) {
    try {
        const recetas = await obtenerRecetas(prisma);
        return respuesta.status(200).json({ total: recetas.length, recetas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

/** GET /api/inventario/recetas/:id_producto  Receta de un producto (400 si el id es inválido, 404 si no existe). */
export async function consultarRecetaDeProducto(peticion, respuesta) {
    try {
        const idProducto = Number(peticion.params.id_producto);
        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            throw new ErrorInventario('El id_producto de la dirección debe ser un entero positivo', 400);
        }
        const [receta] = await obtenerRecetas(prisma, idProducto);
        return respuesta.status(200).json(receta);
    } catch (error) {
        return manejarError(error, respuesta);
    }
}