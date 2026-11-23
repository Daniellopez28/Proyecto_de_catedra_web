//importamos el cliente de prisma y configuracion de los servicios de inventario
import prisma from '../config/prisma.js';
import {
    ErrorInventario,
    resolverSucursalInventario,
    normalizarProductosVenta,
    ejecutarExplosion,
    simularExplosion,
    obtenerAlertasStock,
    listarInsumos,
    obtenerRecetas
} from '../servicios/inventarioServicio.js';

//funcion para redondear valores a un numero especifico de decimales, en este caso 2
function redondear(valor, decimales = 2) {
    const factor = 10 ** decimales;
    return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
}

//Funcion de manejo de errores para el modulo de inventario.
function manejarError(error, respuesta) {
    if (error instanceof ErrorInventario) {
        return respuesta.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
    }
    console.error('Error inesperado en el módulo de inventario:', error);
    return respuesta.status(500).json({ mensaje: 'Error interno del servidor', detalle: null });
}

//export que devuelve el inventario de insumos y productos, sus cantidades y precios
export async function explotarMateriales(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.body?.sucursalid);
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        // tx: si algún insumo falla, no se descuenta ninguno (todo o nada).
        const resultado = await prisma.$transaction((tx) => ejecutarExplosion(tx, productosVenta, {
            sucursalid: Number(sucursalid),
            id_usuario: peticion.auth.usuario.id_usuario,
            referencia: 'explosion-manual'
        }));
        return respuesta.status(200).json({ mensaje: 'Inventario descontado correctamente', ...resultado });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que devuelve las alertas de stock de insumos y productos.
export async function simularExplosionMateriales(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.body?.sucursalid);
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        return respuesta.status(200).json(await simularExplosion(prisma, productosVenta, {
            sucursalid: Number(sucursalid)
        }));
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

