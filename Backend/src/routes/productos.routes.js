import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/', requerirPermiso('ver_menu'), async (req, res) => {
    try {
        const productos = await prisma.productos.findMany({
            where: { activo: true },
            orderBy: { categoria: 'asc' },
            select: {
                id_producto: true,
                nombre: true,
                descripcion: true,
                precio_venta: true,
                categoria: true,
                es_reventa: true
            }
        });
        return res.json({ total: productos.length, productos });
    } catch (error) {
        console.error('Error al consultar productos:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los productos' });
    }
});

router.post('/', requerirPermiso('gestionar_productos'), async (req, res) => {
    const { nombre, descripcion, precio_venta, categoria, es_reventa = false, ingredientes = [] } = req.body ?? {};
    const precio = Number(precio_venta);
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150 ||
        (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') ||
        !Number.isFinite(precio) || precio < 0 || precio > 99999999.99 ||
        (categoria !== undefined && categoria !== null &&
            (typeof categoria !== 'string' || categoria.length > 50)) ||
        typeof es_reventa !== 'boolean' || !Array.isArray(ingredientes) || ingredientes.length > 100) {
        return res.status(400).json({ mensaje: 'Revisa los datos del producto y su receta' });
    }

    const detalles = [];
    const idsInsumos = new Set();
    for (const [indice, ingrediente] of ingredientes.entries()) {
        const id_insumo = Number(ingrediente?.id_insumo);
        const cantidad_requerida = Number(ingrediente?.cantidad_requerida);
        if (!Number.isInteger(id_insumo) || id_insumo <= 0 ||
            !Number.isFinite(cantidad_requerida) || cantidad_requerida <= 0 ||
            cantidad_requerida > 99999999.99 || idsInsumos.has(id_insumo)) {
            return res.status(400).json({ mensaje: `El ingrediente ${indice + 1} no es válido o está duplicado` });
        }
        idsInsumos.add(id_insumo);
        detalles.push({ id_insumo, cantidad_requerida });
    }

    try {
        if (detalles.length > 0) {
            const activos = await prisma.insumos.count({
                where: { id_insumo: { in: detalles.map((item) => item.id_insumo) }, activo: true }
            });
            if (activos !== detalles.length) {
                return res.status(400).json({ mensaje: 'La receta contiene insumos inexistentes o inactivos' });
            }
        }
        const producto = await prisma.productos.create({
            data: {
                nombre: nombre.trim(),
                descripcion: descripcion?.trim() || null,
                precio_venta: precio,
                categoria: categoria?.trim() || null,
                es_reventa,
                recetas_detalle: { create: detalles }
            },
            include: { recetas_detalle: { include: { insumos: true } } }
        });
        return res.status(201).json({ mensaje: 'Producto creado', producto });
    } catch (error) {
        console.error('Error al crear producto:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear el producto' });
    }
});

router.patch('/:id', requerirPermiso('gestionar_productos'), async (req, res) => {
    const idProducto = Number(req.params.id);
    const {
        nombre,
        descripcion,
        precio_venta,
        categoria,
        es_reventa,
        activo,
        ingredientes
    } = req.body ?? {};
    const campos = { nombre, descripcion, precio_venta, categoria, es_reventa, activo, ingredientes };
    if (!Number.isInteger(idProducto) || idProducto <= 0 ||
        Object.values(campos).every((valor) => valor === undefined) ||
        (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150)) ||
        (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') ||
        (precio_venta !== undefined &&
            (!Number.isFinite(Number(precio_venta)) || Number(precio_venta) < 0 ||
                Number(precio_venta) > 99999999.99)) ||
        (categoria !== undefined && categoria !== null &&
            (typeof categoria !== 'string' || categoria.length > 50)) ||
        (es_reventa !== undefined && typeof es_reventa !== 'boolean') ||
        (activo !== undefined && typeof activo !== 'boolean') ||
        (ingredientes !== undefined && (!Array.isArray(ingredientes) || ingredientes.length > 100))) {
        return res.status(400).json({ mensaje: 'Revisa el id y los campos del producto' });
    }

    const detalles = [];
    if (ingredientes !== undefined) {
        const idsInsumos = new Set();
        for (const [indice, ingrediente] of ingredientes.entries()) {
            const id_insumo = Number(ingrediente?.id_insumo);
            const cantidad_requerida = Number(ingrediente?.cantidad_requerida);
            if (!Number.isInteger(id_insumo) || id_insumo <= 0 ||
                !Number.isFinite(cantidad_requerida) || cantidad_requerida <= 0 ||
                cantidad_requerida > 99999999.99 || idsInsumos.has(id_insumo)) {
                return res.status(400).json({ mensaje: `El ingrediente ${indice + 1} no es válido o está duplicado` });
            }
            idsInsumos.add(id_insumo);
            detalles.push({ id_insumo, cantidad_requerida });
        }
    }

    try {
        const producto = await prisma.$transaction(async (tx) => {
            if (ingredientes !== undefined && detalles.length > 0) {
                const activos = await tx.insumos.count({
                    where: { id_insumo: { in: detalles.map((item) => item.id_insumo) }, activo: true }
                });
                if (activos !== detalles.length) {
                    const error = new Error('La receta contiene insumos inexistentes o inactivos');
                    error.codigoHttp = 400;
                    throw error;
                }
            }
            if (ingredientes !== undefined) {
                await tx.recetas_detalle.deleteMany({ where: { id_producto: idProducto } });
            }
            return tx.productos.update({
                where: { id_producto: idProducto },
                data: {
                    ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
                    ...(descripcion !== undefined ? { descripcion: descripcion?.trim() || null } : {}),
                    ...(precio_venta !== undefined ? { precio_venta: Number(precio_venta) } : {}),
                    ...(categoria !== undefined ? { categoria: categoria?.trim() || null } : {}),
                    ...(es_reventa !== undefined ? { es_reventa } : {}),
                    ...(activo !== undefined ? { activo } : {}),
                    ...(ingredientes !== undefined ? { recetas_detalle: { create: detalles } } : {})
                },
                include: { recetas_detalle: { include: { insumos: true } } }
            });
        });
        return res.json({ mensaje: 'Producto actualizado', producto });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        if (error.code === 'P2025') return res.status(404).json({ mensaje: 'Producto no encontrado' });
        console.error('Error al actualizar producto:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el producto' });
    }
});

export default router;
