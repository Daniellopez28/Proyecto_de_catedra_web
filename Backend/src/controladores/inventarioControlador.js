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

