import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/sucursales', async (req, res) => {
    if (!req.auth.permisos.has('ver_reservas_disponibles') &&
        !req.auth.permisos.has('ver_mesas') &&
        !req.auth.permisos.has('gestionar_reservas')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar sucursales' });
    }
    try {
        const sucursales = await prisma.sucursales.findMany({
            where: {
                activo: true,
                ...(req.auth.usuario.sucursalid &&
                    !req.auth.permisos.has('gestionar_sucursales')
                    ? { sucursalid: req.auth.usuario.sucursalid }
                    : {})
            },
            orderBy: { nombre: 'asc' },
            select: { sucursalid: true, nombre: true, direccion: true }
        });
        return res.json({ total: sucursales.length, sucursales });
    } catch (error) {
        console.error('Error al consultar sucursales disponibles:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las sucursales' });
    }
});

router.get('/', (req, res, next) => {
    if (!req.auth.permisos.has('ver_mesas') &&
        !req.auth.permisos.has('gestionar_reservas')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar mesas' });
    }
    return next();
}, async (req, res) => {
    const sucursalid = req.auth.usuario.sucursalid ?? Number(req.query.sucursalid);
    if (!Number.isInteger(sucursalid) || sucursalid <= 0) {
        return res.status(400).json({ mensaje: 'Indica una sucursal válida' });
    }
    if (!req.auth.usuario.sucursalid && !req.auth.permisos.has('gestionar_sucursales')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar otra sucursal' });
    }

    try {
        const mesas = await prisma.mesas.findMany({
            where: { sucursalid },
            orderBy: { numero_mesa: 'asc' },
            select: {
                mesaid: true,
                numero_mesa: true,
                capacidad: true,
                estado: true
            }
        });
        return res.json({ total: mesas.length, mesas });
    } catch (error) {
        console.error('Error al consultar mesas:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las mesas' });
    }
});

router.post('/', requerirPermiso('gestionar_reservas'), async (req, res) => {
    const { sucursalid: sucursalSolicitada, numero_mesa, capacidad } = req.body ?? {};
    const sucursalid = req.auth.usuario.sucursalid ?? Number(sucursalSolicitada);
    if (!Number.isInteger(sucursalid) || sucursalid <= 0 ||
        typeof numero_mesa !== 'string' || !numero_mesa.trim() || numero_mesa.length > 20 ||
        !Number.isInteger(capacidad) || capacidad <= 0 || capacidad > 100) {
        return res.status(400).json({ mensaje: 'Revisa la sucursal, número y capacidad de la mesa' });
    }
    if (!req.auth.usuario.sucursalid && !req.auth.permisos.has('gestionar_sucursales')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para crear mesas en otra sucursal' });
    }

    try {
        const sucursal = await prisma.sucursales.findFirst({
            where: { sucursalid, activo: true },
            select: { sucursalid: true }
        });
        if (!sucursal) return res.status(404).json({ mensaje: 'Sucursal no encontrada o inactiva' });
        const mesa = await prisma.mesas.create({
            data: { sucursalid, numero_mesa: numero_mesa.trim(), capacidad }
        });
        return res.status(201).json({ mensaje: 'Mesa creada', mesa });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe ese número de mesa en la sucursal' });
        console.error('Error al crear mesa:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear la mesa' });
    }
});

router.patch('/:id', requerirPermiso('gestionar_reservas'), async (req, res) => {
    const mesaid = Number(req.params.id);
    const { numero_mesa, capacidad } = req.body ?? {};
    if (!Number.isInteger(mesaid) || mesaid <= 0 ||
        (numero_mesa === undefined && capacidad === undefined) ||
        (numero_mesa !== undefined &&
            (typeof numero_mesa !== 'string' || !numero_mesa.trim() || numero_mesa.length > 20)) ||
        (capacidad !== undefined &&
            (!Number.isInteger(capacidad) || capacidad <= 0 || capacidad > 100))) {
        return res.status(400).json({ mensaje: 'Revisa el id, número y capacidad de la mesa' });
    }

    try {
        const existente = await prisma.mesas.findUnique({
            where: { mesaid },
            select: { sucursalid: true }
        });
        if (!existente || (req.auth.usuario.sucursalid &&
            existente.sucursalid !== req.auth.usuario.sucursalid)) {
            return res.status(404).json({ mensaje: 'Mesa no encontrada' });
        }
        const mesa = await prisma.mesas.update({
            where: { mesaid },
            data: {
                ...(numero_mesa !== undefined ? { numero_mesa: numero_mesa.trim() } : {}),
                ...(capacidad !== undefined ? { capacidad } : {})
            }
        });
        return res.json({ mensaje: 'Mesa actualizada', mesa });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe ese número de mesa en la sucursal' });
        console.error('Error al actualizar mesa:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar la mesa' });
    }
});

router.patch('/:id/estado', async (req, res) => {
    const mesaid = Number(req.params.id);
    const { estado } = req.body ?? {};
    if (!req.auth.permisos.has('tomar_pedidos') && !req.auth.permisos.has('gestionar_reservas')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para cambiar el estado de mesas' });
    }
    const estadosPermitidos = req.auth.permisos.has('gestionar_reservas')
        ? ['libre', 'ocupada', 'inactiva']
        : ['libre', 'ocupada'];
    if (!Number.isInteger(mesaid) || mesaid <= 0 || !estadosPermitidos.includes(estado)) {
        return res.status(400).json({ mensaje: 'Indica un id y un estado permitido' });
    }

    try {
        const mesaExistente = await prisma.mesas.findUnique({
            where: { mesaid },
            select: { mesaid: true, sucursalid: true }
        });
        if (!mesaExistente || (req.auth.usuario.sucursalid &&
            mesaExistente.sucursalid !== req.auth.usuario.sucursalid)) {
            return res.status(404).json({ mensaje: 'Mesa no encontrada' });
        }
        const mesa = await prisma.mesas.update({
            where: { mesaid },
            data: { estado },
            select: { mesaid: true, sucursalid: true, numero_mesa: true, capacidad: true, estado: true }
        });
        return res.json({ mensaje: 'Estado de mesa actualizado', mesa });
    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar la mesa' });
    }
});

export default router;
