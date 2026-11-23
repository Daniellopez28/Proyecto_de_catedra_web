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

