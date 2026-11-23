import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/yo', requerirPermiso('ver_mi_perfil'), async (req, res) => {
    const idCliente = req.auth.usuario.id_cliente;
    if (!idCliente) return res.status(404).json({ mensaje: 'La cuenta no tiene un perfil de cliente' });
    try {
        const cliente = await prisma.clientes.findUnique({
            where: { id_cliente: idCliente },
            select: {
                id_cliente: true,
                nombre: true,
                dui: true,
                nit: true,
                nrc: true,
                telefono: true,
                correo: true,
                direccion: true,
                giro: true,
                direccion_fiscal: true
            }
        });
        if (!cliente) return res.status(404).json({ mensaje: 'No se encontró el perfil' });
        return res.json(cliente);
    } catch (error) {
        console.error('Error al consultar perfil de cliente:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar el perfil' });
    }
});

router.patch('/yo', requerirPermiso('ver_mi_perfil'), async (req, res) => {
    const idCliente = req.auth.usuario.id_cliente;
    if (!idCliente) return res.status(404).json({ mensaje: 'La cuenta no tiene un perfil de cliente' });
    const { nombre, telefono, direccion } = req.body ?? {};
    if ((nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150)) ||
        (telefono !== undefined && telefono !== null &&
            (typeof telefono !== 'string' || telefono.length > 20)) ||
        (direccion !== undefined && direccion !== null && typeof direccion !== 'string')) {
        return res.status(400).json({ mensaje: 'Revisa los datos del perfil' });
    }

    try {
        const cliente = await prisma.clientes.update({
            where: { id_cliente: idCliente },
            data: {
                ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
                ...(telefono !== undefined ? { telefono: telefono?.trim() || null } : {}),
                ...(direccion !== undefined ? { direccion: direccion?.trim() || null } : {})
            },
            select: { id_cliente: true, nombre: true, telefono: true, direccion: true, correo: true }
        });
        return res.json({ mensaje: 'Perfil actualizado', cliente });
    } catch (error) {
        console.error('Error al actualizar perfil de cliente:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el perfil' });
    }
});

router.get('/', (req, res, next) => {
    if (!req.auth.permisos.has('ver_ventas') &&
        !req.auth.permisos.has('tomar_pedidos') &&
        !req.auth.permisos.has('gestionar_reservas')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar clientes' });
    }
    return next();
}, async (req, res) => {
    const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
    if (busqueda.length < 2 || busqueda.length > 100) {
        return res.status(400).json({ mensaje: 'busqueda debe tener entre 2 y 100 caracteres' });
    }

    try {
        const puedeVerVentas = req.auth.permisos.has('ver_ventas') ||
            req.auth.permisos.has('tomar_pedidos');
        const clientes = await prisma.clientes.findMany({
            where: {
                OR: [
                    { nombre: { contains: busqueda } },
                    { correo: { contains: busqueda } },
                    { dui: { contains: busqueda } },
                    { nit: { contains: busqueda } }
                ]
            },
            take: 25,
            orderBy: { nombre: 'asc' },
            select: puedeVerVentas ? {
                id_cliente: true,
                nombre: true,
                dui: true,
                nit: true,
                telefono: true,
                correo: true
            } : {
                id_cliente: true,
                nombre: true,
                telefono: true
            }
        });
        return res.json({ total: clientes.length, clientes });
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los clientes' });
    }
});

export default router;
