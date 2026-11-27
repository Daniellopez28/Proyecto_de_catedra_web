import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/', requerirPermiso('ver_menu'), async (req, res) => {
    try {
        const modificadores = await prisma.modificadores.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' }
        });
        return res.json({ total: modificadores.length, modificadores });
    } catch (error) {
        console.error('Error al consultar modificadores:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los modificadores' });
    }
});

router.post('/', requerirPermiso('gestionar_productos'), async (req, res) => {
    const { nombre, precio } = req.body ?? {};
    const monto = Number(precio);
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100 ||
        !Number.isFinite(monto) || monto < 0 || monto > 99999999.99) {
        return res.status(400).json({ mensaje: 'Revisa el nombre y el precio del modificador' });
    }

    try {
        const modificador = await prisma.modificadores.create({
            data: { nombre: nombre.trim(), precio: monto }
        });
        return res.status(201).json({ mensaje: 'Modificador creado', modificador });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe un modificador con ese nombre' });
        console.error('Error al crear modificador:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear el modificador' });
    }
});

router.patch('/:id', requerirPermiso('gestionar_productos'), async (req, res) => {
    const modificadorid = Number(req.params.id);
    const { nombre, precio, activo } = req.body ?? {};
    if (!Number.isInteger(modificadorid) || modificadorid <= 0 ||
        (nombre === undefined && precio === undefined && activo === undefined) ||
        (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100)) ||
        (precio !== undefined &&
            (!Number.isFinite(Number(precio)) || Number(precio) < 0 || Number(precio) > 99999999.99)) ||
        (activo !== undefined && typeof activo !== 'boolean')) {
        return res.status(400).json({ mensaje: 'Revisa el id y los campos del modificador' });
    }

    try {
        const modificador = await prisma.modificadores.update({
            where: { modificadorid },
            data: {
                ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
                ...(precio !== undefined ? { precio: Number(precio) } : {}),
                ...(activo !== undefined ? { activo } : {})
            }
        });
        return res.json({ mensaje: 'Modificador actualizado', modificador });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ mensaje: 'Modificador no encontrado' });
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe un modificador con ese nombre' });
        console.error('Error al actualizar modificador:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el modificador' });
    }
});

export default router;
