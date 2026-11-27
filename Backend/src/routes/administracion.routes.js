import { Router } from 'express';
import prisma from '../config/prisma.js';
import {
    invalidarTodasLasSesiones,
    requerirPermiso
} from '../middleware/autenticacion.js';

const router = Router();

router.get('/roles', requerirPermiso('gestionar_roles_permisos'), async (_req, res) => {
    try {
        const roles = await prisma.roles.findMany({
            orderBy: { nombre_rol: 'asc' },
            include: {
                niveles_acceso: {
                    select: {
                        id_nivel: true,
                        codigo: true,
                        nivel_permiso: { include: { permisos: { select: { codigo: true } } } }
                    }
                }
            }
        });
        return res.json(roles.map((rol) => ({
            id_rol: rol.id_rol,
            nombre_rol: rol.nombre_rol,
            descripcion: rol.descripcion,
            es_administrativo: rol.es_administrativo,
            pantalla_inicio: rol.pantalla_inicio,
            nivel: rol.niveles_acceso.codigo,
            permisos: rol.niveles_acceso.nivel_permiso.map((item) => item.permisos.codigo)
        })));
    } catch (error) {
        console.error('Error al consultar roles:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los roles' });
    }
});

router.get('/permisos', requerirPermiso('gestionar_roles_permisos'), async (_req, res) => {
    try {
        const permisos = await prisma.permisos.findMany({ orderBy: { codigo: 'asc' } });
        return res.json({ total: permisos.length, permisos });
    } catch (error) {
        console.error('Error al consultar permisos:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los permisos' });
    }
});

router.get('/niveles', requerirPermiso('gestionar_roles_permisos'), async (_req, res) => {
    try {
        const niveles = await prisma.niveles_acceso.findMany({ orderBy: { codigo: 'asc' } });
        return res.json({ total: niveles.length, niveles });
    } catch (error) {
        console.error('Error al consultar niveles de acceso:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los niveles' });
    }
});

router.post('/roles', requerirPermiso('gestionar_roles_permisos'), async (req, res) => {
    const { nombre_rol, descripcion, id_nivel, pantalla_inicio } = req.body ?? {};
    if (typeof nombre_rol !== 'string' || !nombre_rol.trim() || nombre_rol.length > 50 ||
        (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') ||
        !Number.isInteger(Number(id_nivel)) || Number(id_nivel) <= 0 ||
        (pantalla_inicio !== undefined &&
            (typeof pantalla_inicio !== 'string' || !pantalla_inicio.trim() || pantalla_inicio.length > 50))) {
        return res.status(400).json({ mensaje: 'Revisa los datos del rol' });
    }
    try {
        const rol = await prisma.roles.create({
            data: {
                nombre_rol: nombre_rol.trim(),
                descripcion: descripcion?.trim() || null,
                id_nivel: Number(id_nivel),
                pantalla_inicio: pantalla_inicio?.trim() || 'panel_principal'
            }
        });
        return res.status(201).json({ mensaje: 'Rol creado', rol });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe un rol con ese nombre' });
        if (error.code === 'P2003') return res.status(400).json({ mensaje: 'El nivel de acceso no existe' });
        console.error('Error al crear rol:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear el rol' });
    }
});

router.put('/roles/:id/permisos', requerirPermiso('gestionar_roles_permisos'), async (req, res) => {
    const idRol = Number(req.params.id);
    const codigos = req.body?.permisos;
    if (!Number.isInteger(idRol) || idRol <= 0 || !Array.isArray(codigos) ||
        codigos.some((codigo) => typeof codigo !== 'string') ||
        new Set(codigos).size !== codigos.length) {
        return res.status(400).json({ mensaje: 'Indica un rol válido y una lista de permisos sin duplicados' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const rol = await tx.roles.findUnique({
                where: { id_rol: idRol },
                select: { id_rol: true, id_nivel: true, niveles_acceso: { select: { codigo: true } } }
            });
            if (!rol) return { error: 404 };
            const permisos = await tx.permisos.findMany({
                where: { codigo: { in: codigos } },
                select: { id_permiso: true, codigo: true }
            });
            if (permisos.length !== codigos.length) return { error: 400 };
            if (rol.niveles_acceso.codigo === 'administrador') return { error: 409 };

            await tx.nivel_permiso.deleteMany({ where: { id_nivel: rol.id_nivel } });
            if (permisos.length > 0) {
                await tx.nivel_permiso.createMany({
                    data: permisos.map((permiso) => ({ id_nivel: rol.id_nivel, id_permiso: permiso.id_permiso }))
                });
            }
            return { permisos: permisos.map((permiso) => permiso.codigo) };
        });
        if (resultado.error === 404) return res.status(404).json({ mensaje: 'Rol no encontrado' });
        if (resultado.error === 400) return res.status(400).json({ mensaje: 'La lista contiene permisos inexistentes' });
        if (resultado.error === 409) return res.status(409).json({ mensaje: 'Los permisos del administrador no se pueden modificar' });
        invalidarTodasLasSesiones();
        return res.json({
            mensaje: 'Permisos actualizados para el nivel del rol; todos deben iniciar sesión nuevamente',
            permisos: resultado.permisos
        });
    } catch (error) {
        console.error('Error al actualizar permisos de rol:', error);
        return res.status(500).json({ mensaje: 'No se pudieron actualizar los permisos' });
    }
});

router.get('/sucursales', requerirPermiso('gestionar_sucursales'), async (_req, res) => {
    try {
        const sucursales = await prisma.sucursales.findMany({ orderBy: { nombre: 'asc' } });
        return res.json({ total: sucursales.length, sucursales });
    } catch (error) {
        console.error('Error al consultar sucursales:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las sucursales' });
    }
});

router.post('/sucursales', requerirPermiso('gestionar_sucursales'), async (req, res) => {
    const { nombre, direccion, telefono } = req.body ?? {};
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100 ||
        typeof direccion !== 'string' || !direccion.trim() || direccion.length > 255 ||
        (telefono !== undefined && telefono !== null &&
            (typeof telefono !== 'string' || telefono.length > 20))) {
        return res.status(400).json({ mensaje: 'Revisa los datos de la sucursal' });
    }

    try {
        const sucursal = await prisma.$transaction(async (tx) => {
            const creada = await tx.sucursales.create({
                data: { nombre: nombre.trim(), direccion: direccion.trim(), telefono: telefono?.trim() || null }
            });
            const insumos = await tx.insumos.findMany({
                where: { activo: true },
                select: { id_insumo: true, stock_minimo: true }
            });
            if (insumos.length > 0) {
                await tx.inventario_sucursal.createMany({
                    data: insumos.map((insumo) => ({
                        sucursalid: creada.sucursalid,
                        insumoid: insumo.id_insumo,
                        stock_actual: 0,
                        stock_minimo: Number(insumo.stock_minimo ?? 0)
                    }))
                });
            }
            return creada;
        });
        return res.status(201).json({ mensaje: 'Sucursal creada con inventario inicial vacío', sucursal });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe una sucursal con ese nombre' });
        console.error('Error al crear sucursal:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear la sucursal' });
    }
});

router.patch('/sucursales/:id', requerirPermiso('gestionar_sucursales'), async (req, res) => {
    const sucursalid = Number(req.params.id);
    const { nombre, direccion, telefono, activo } = req.body ?? {};
    if (!Number.isInteger(sucursalid) || sucursalid <= 0 ||
        [nombre, direccion, telefono, activo].every((valor) => valor === undefined) ||
        (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100)) ||
        (direccion !== undefined &&
            (typeof direccion !== 'string' || !direccion.trim() || direccion.length > 255)) ||
        (telefono !== undefined && telefono !== null &&
            (typeof telefono !== 'string' || telefono.length > 20)) ||
        (activo !== undefined && typeof activo !== 'boolean')) {
        return res.status(400).json({ mensaje: 'Revisa el id y los campos de la sucursal' });
    }

    try {
        const sucursal = await prisma.sucursales.update({
            where: { sucursalid },
            data: {
                ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
                ...(direccion !== undefined ? { direccion: direccion.trim() } : {}),
                ...(telefono !== undefined ? { telefono: telefono?.trim() || null } : {}),
                ...(activo !== undefined ? { activo } : {})
            }
        });
        return res.json({ mensaje: 'Sucursal actualizada', sucursal });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ mensaje: 'Sucursal no encontrada' });
        if (error.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe una sucursal con ese nombre' });
        console.error('Error al actualizar sucursal:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar la sucursal' });
    }
});

export default router;
