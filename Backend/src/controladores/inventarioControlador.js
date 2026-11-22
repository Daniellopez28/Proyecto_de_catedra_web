//Archivo encargado de recibir las peticiones HTTP y llamar a los servicios de inventario
import prisma from '../config/prisma.js'; //llamamos la configuracion de la base de datos con prisma 
import {
    ErrorInventario,
    normalizarProductosVenta,
    ejecutarExplosion,
    simularExplosion,
    obtenerAlertasStock,
    listarInsumos,
    obtenerRecetas
} from '../servicios/inventarioServicio.js'; //llamamos a los servicios de el inventario 

//funcion para manejar los errores que puede lelgar a dat el inventario, devuelve un 500 para dar a entender un error interno en el servidor 
function manejarError(error, respuesta) {
    if (error instanceof ErrorInventario) {
        return respuesta.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
    }
    console.error('Error inesperado en el módulo de inventario:', error);
    return respuesta.status(500).json({ mensaje: 'Error interno del servidor', detalle: null });
}

//Export que maneja la peticion para descontar los insumos de la receta de un producto, si no hay suficientes devueve un 409 y no descuenta
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

//Export que maneja la peticion para el anejar que si no hay suficientes insumos para un producto entonces devuelve un 409
export async function simularExplosionMateriales(peticion, respuesta) {
    try {
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        return respuesta.status(200).json(await simularExplosion(prisma, productosVenta));
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que maneja alertas de stock, si hay insumos con stock bajo o agotado devuelve un 200 co la lista de insumos 
export async function consultarAlertasStock(peticion, respuesta) {
    try {
        const alertas = await obtenerAlertasStock(prisma);
        return respuesta.status(200).json({ total: alertas.length, alertas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que maneja la consulta de insumos, devuelve la lista de insumos
export async function consultarInsumos(peticion, respuesta) {
    try {
        const insumos = await listarInsumos(prisma);
        return respuesta.status(200).json({ total: insumos.length, insumos });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que maneja la consulta de recetas.
export async function consultarRecetas(peticion, respuesta) {
    try {
        const recetas = await obtenerRecetas(prisma);
        return respuesta.status(200).json({ total: recetas.length, recetas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que maneja la recetas de un producto en especifico, devuelve la receta de un producto y si no devuelve un 404
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