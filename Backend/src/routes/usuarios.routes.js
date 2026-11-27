import { Router } from 'express';
import prisma from '../config/prisma.js';
import { invalidarSesionesDeUsuario, requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

function validarAmbitoUsuario(req, res) {
    if (!req.auth.usuario.sucursalid && !req.auth.permisos.has('gestionar_sucursales')) {
        res.status(403).json({ mensaje: 'Se requiere una sucursal asignada o permiso para gestionar sucursales' });
        return false;
    }
    return true;
}

function usuarioEnSucursalDelSolicitante(req, usuario) {
    return !req.auth.usuario.sucursalid ||
        usuario.sucursalid === req.auth.usuario.sucursalid;
}

router.get('/', requerirPermiso('gestionar_usuarios'), async (req, res) => {
    if (!validarAmbitoUsuario(req, res)) return;
    const consultaSinSucursal = req.query.sucursalid === 'sin_asignar';
    const tieneFiltroSucursal = req.query.sucursalid !== undefined;
    const sucursalSolicitada = tieneFiltroSucursal && !consultaSinSucursal
        ? Number(req.query.sucursalid)
        : null;
    if (!req.auth.usuario.sucursalid && !tieneFiltroSucursal) {
        return res.status(400).json({ mensaje: 'Selecciona una sucursal para consultar usuarios' });
    }
    if (tieneFiltroSucursal && !consultaSinSucursal &&
        (!Number.isInteger(sucursalSolicitada) || sucursalSolicitada <= 0)) {
        return res.status(400).json({ mensaje: 'La sucursal solicitada no es válida' });
    }
    if (req.auth.usuario.sucursalid && (
        consultaSinSucursal ||
        (sucursalSolicitada && sucursalSolicitada !== req.auth.usuario.sucursalid)
    )) {
        return res.status(403).json({ mensaje: 'Solo puedes consultar usuarios de tu sucursal' });
    }

    try {
        const sucursalFiltro = consultaSinSucursal
            ? null
            : req.auth.usuario.sucursalid || sucursalSolicitada;
        if (sucursalFiltro && !await prisma.sucursales.findFirst({
            where: { sucursalid: sucursalFiltro, activo: true },
            select: { sucursalid: true }
        })) {
            return res.status(404).json({ mensaje: 'La sucursal no existe o está inactiva' });
        }
        const usuarios = await prisma.usuarios.findMany({
            where: req.auth.usuario.sucursalid
                ? { sucursalid: req.auth.usuario.sucursalid }
                : consultaSinSucursal
                    ? { sucursalid: null }
                    : sucursalSolicitada
                    ? { sucursalid: sucursalSolicitada }
                    : { sucursalid: null },
            orderBy: { nombre_completo: 'asc' },
            select: {
                id_usuario: true,
                id_rol: true,
                sucursalid: true,
                id_empleado: true,
                id_cliente: true,
                nombre_completo: true,
                correo: true,
                debe_cambiar_password: true,
                ultimo_acceso: true,
                activo: true,
                creado_en: true,
                roles: {
                    select: {
                        nombre_rol: true,
                        niveles_acceso: { select: { codigo: true } }
                    }
                },
                empleados: { select: { codigo_empleado: true, activo: true } },
                sucursales: { select: { sucursalid: true, nombre: true } }
            }
        });
        return res.json({ total: usuarios.length, usuarios });
    } catch (error) {
        console.error('Error al consultar usuarios:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los usuarios' });
    }
});

router.patch('/:id/rol', requerirPermiso('gestionar_usuarios'), async (req, res) => {
    if (!validarAmbitoUsuario(req, res)) return;
    const idUsuario = Number(req.params.id);
    const idRol = Number(req.body?.id_rol);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0 ||
        !Number.isInteger(idRol) || idRol <= 0) {
        return res.status(400).json({ mensaje: 'Indica un usuario y un rol válidos' });
    }

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { id_usuario: idUsuario },
            select: { id_usuario: true, id_empleado: true, id_cliente: true, sucursalid: true }
        });
        if (!usuario || !usuarioEnSucursalDelSolicitante(req, usuario)) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        const rol = await prisma.roles.findUnique({
            where: { id_rol: idRol },
            include: { niveles_acceso: { select: { codigo: true } } }
        });
        if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado' });
        if ((usuario.id_cliente && rol.niveles_acceso.codigo !== 'cliente') ||
            (usuario.id_empleado && rol.niveles_acceso.codigo === 'cliente')) {
            return res.status(400).json({ mensaje: 'El rol no corresponde al tipo de cuenta' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.usuarios.update({ where: { id_usuario: idUsuario }, data: { id_rol: idRol } });
            if (usuario.id_empleado) {
                await tx.empleados.update({
                    where: { id_empleado: usuario.id_empleado },
                    data: { id_rol: idRol }
                });
            }
        });
        invalidarSesionesDeUsuario(idUsuario);
        return res.json({ mensaje: 'Rol actualizado; el usuario debe iniciar sesión nuevamente' });
    } catch (error) {
        console.error('Error al cambiar rol de usuario:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el rol' });
    }
});

router.patch('/:id/desactivar', requerirPermiso('gestionar_usuarios'), async (req, res) => {
    if (!validarAmbitoUsuario(req, res)) return;
    const idUsuario = Number(req.params.id);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ mensaje: 'El id de usuario no es válido' });
    }
    if (idUsuario === req.auth.usuario.id_usuario) {
        return res.status(409).json({ mensaje: 'No puedes desactivar tu propio usuario' });
    }

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { id_usuario: idUsuario },
            select: { id_usuario: true, activo: true, id_empleado: true, sucursalid: true }
        });
        if (!usuario || !usuarioEnSucursalDelSolicitante(req, usuario)) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        if (!usuario.activo) return res.status(409).json({ mensaje: 'El usuario ya está inactivo' });

        await prisma.$transaction(async (tx) => {
            await tx.usuarios.update({ where: { id_usuario: idUsuario }, data: { activo: false } });
            if (usuario.id_empleado) {
                await tx.empleados.update({
                    where: { id_empleado: usuario.id_empleado },
                    data: { activo: false }
                });
            }
        });
        invalidarSesionesDeUsuario(idUsuario);
        return res.json({ mensaje: 'Usuario desactivado; sus datos e historial se conservaron' });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        return res.status(500).json({ mensaje: 'No se pudo desactivar el usuario' });
    }
});

export default router;
