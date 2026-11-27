import { Router } from 'express';
import prisma from '../config/prisma.js';
import {
    invalidarSesionesDeUsuario,
    requerirPermiso
} from '../middleware/autenticacion.js';
import {
    etiquetaSucursalEmpleado,
    nombresBaseSucursalesEmpleados
} from '../constants/sucursalesEmpleados.js';

const router = Router();

function fechaValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function textoOpcionalValido(valor, maximo) {
    return valor === undefined || valor === null || (typeof valor === 'string' && valor.length <= maximo);
}

<<<<<<< HEAD
=======
function puedeGestionarTodasLasSucursales(req) {
    return req.auth.permisos.has('gestionar_empleados_todas_sucursales') ||
        req.auth.permisos.has('gestionar_sucursales');
}

function validarContrato(tipoContrato, fechaIngreso, fechaFinContrato) {
    if (!['indefinido', 'definido'].includes(tipoContrato)) return false;
    if (tipoContrato === 'indefinido') return fechaFinContrato === undefined || fechaFinContrato === null;
    return fechaValida(fechaFinContrato) && fechaFinContrato > fechaIngreso;
}

const nivelesEmpleadoAsignables = new Set([
    'empleado', 'rrhh', 'cajero', 'mesero', 'cocinero', 'barista', 'contabilidad', 'compras'
]);

function requiereAdministracionDeUsuarios(rol) {
    return rol.es_administrativo && !nivelesEmpleadoAsignables.has(rol.niveles_acceso.codigo);
}

>>>>>>> frontend
router.get('/roles', requerirPermiso('registrar_empleados'), async (req, res) => {
    try {
        const roles = await prisma.roles.findMany({
            include: { niveles_acceso: { select: { codigo: true } } },
            orderBy: { nombre_rol: 'asc' }
        });
        return res.json(roles
            .filter((rol) => rol.niveles_acceso.codigo !== 'cliente' &&
<<<<<<< HEAD
                (req.auth.permisos.has('gestionar_roles_permisos') || rol.niveles_acceso.codigo === 'empleado'))
=======
                (req.auth.permisos.has('gestionar_roles_permisos') ||
                    nivelesEmpleadoAsignables.has(rol.niveles_acceso.codigo)))
>>>>>>> frontend
            .map(({ id_rol, nombre_rol }) => ({ id_rol, nombre_rol })));
    } catch (error) {
        console.error('Error al listar roles de empleados:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los roles' });
    }
});

router.get('/sucursales', requerirPermiso('registrar_empleados'), async (req, res) => {
<<<<<<< HEAD
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
>>>>>>> frontend
    try {
        const sucursales = await prisma.sucursales.findMany({
            where: {
                activo: true,
                nombre: { in: nombresBaseSucursalesEmpleados },
<<<<<<< HEAD
                ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
=======
                ...(!puedeGestionarTodasLasSucursales(req)
                    ? { sucursalid: req.auth.usuario.sucursalid }
                    : {})
>>>>>>> frontend
            },
            orderBy: { nombre: 'asc' },
            select: { sucursalid: true, nombre: true }
        });
        return res.json(sucursales.map((sucursal) => ({
            ...sucursal,
            nombre: etiquetaSucursalEmpleado(sucursal.nombre)
        })));
    } catch (error) {
        console.error('Error al listar sucursales para empleados:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las sucursales' });
    }
});

router.get('/yo', requerirPermiso('ver_mi_ficha'), async (req, res) => {
    const idEmpleado = req.auth.usuario.id_empleado;
    if (!idEmpleado) return res.status(404).json({ mensaje: 'La cuenta no tiene una ficha laboral' });
    try {
        const empleado = await prisma.empleados.findUnique({
            where: { id_empleado: idEmpleado },
            select: {
                id_empleado: true,
                codigo_empleado: true,
                nombre_completo: true,
                dui: true,
                cargo: true,
                tipo_planilla: true,
                salario_base: true,
                fecha_ingreso: true,
                tipo_contrato: true,
                jornada: true,
                forma_pago: true,
                isss_numero: true,
                afp_numero: true,
                roles: { select: { nombre_rol: true } },
                sucursales: { select: { nombre: true } }
            }
        });
        if (!empleado) return res.status(404).json({ mensaje: 'Ficha laboral no encontrada' });
        return res.json(empleado);
    } catch (error) {
        console.error('Error al consultar ficha laboral propia:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar la ficha laboral' });
    }
});

router.get('/', (req, res, next) => {
    if (!req.auth.permisos.has('ver_empleados') &&
        !req.auth.permisos.has('registrar_empleados')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar empleados' });
    }
<<<<<<< HEAD
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
>>>>>>> frontend
    return next();
}, async (req, res) => {
    try {
        const empleados = await prisma.empleados.findMany({
            where: {
                activo: true,
                sucursales: { is: { activo: true, nombre: { in: nombresBaseSucursalesEmpleados } } },
<<<<<<< HEAD
                ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
=======
                ...(!puedeGestionarTodasLasSucursales(req)
                    ? { sucursalid: req.auth.usuario.sucursalid }
                    : {})
>>>>>>> frontend
            },
            orderBy: { nombre_completo: 'asc' },
            select: {
                id_empleado: true,
                codigo_empleado: true,
                nombre_completo: true,
                cargo: true,
                tipo_planilla: true,
                salario_base: true,
                fecha_ingreso: true,
<<<<<<< HEAD
=======
                fecha_fin_contrato: true,
>>>>>>> frontend
                activo: true,
                roles: { select: { nombre_rol: true } },
                sucursales: { select: { nombre: true } }
            }
        });
        return res.json({ total: empleados.length, empleados });
    } catch (error) {
        console.error('Error al consultar empleados:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los empleados' });
    }
});

router.get('/:id', requerirPermiso('registrar_empleados'), async (req, res) => {
    const idEmpleado = Number(req.params.id);
    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
        return res.status(400).json({ mensaje: 'El id de empleado no es válido' });
    }
<<<<<<< HEAD
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
>>>>>>> frontend

    try {
        const empleado = await prisma.empleados.findFirst({
            where: {
                id_empleado: idEmpleado,
                activo: true,
                sucursales: { is: { activo: true, nombre: { in: nombresBaseSucursalesEmpleados } } },
<<<<<<< HEAD
                ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
=======
                ...(!puedeGestionarTodasLasSucursales(req)
                    ? { sucursalid: req.auth.usuario.sucursalid }
                    : {})
>>>>>>> frontend
            },
            select: {
                id_empleado: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
                dui: true,
                fecha_nacimiento: true,
                cargo: true,
                tipo_planilla: true,
                salario_base: true,
                fecha_ingreso: true,
<<<<<<< HEAD
=======
                fecha_fin_contrato: true,
>>>>>>> frontend
                sucursalid: true,
                isss_numero: true,
                afp_numero: true,
                tipo_contrato: true,
                jornada: true,
                forma_pago: true,
                id_rol: true,
<<<<<<< HEAD
                roles: { select: { nombre_rol: true, es_administrativo: true } }
            }
        });
        if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        if (empleado.roles.es_administrativo && !req.auth.permisos.has('gestionar_usuarios')) {
=======
                roles: {
                    select: {
                        nombre_rol: true,
                        es_administrativo: true,
                        niveles_acceso: { select: { codigo: true } }
                    }
                }
            }
        });
        if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        if (requiereAdministracionDeUsuarios(empleado.roles) &&
            !req.auth.permisos.has('gestionar_usuarios')) {
>>>>>>> frontend
            return res.status(403).json({ mensaje: 'Se requiere permiso de administración de usuarios para editar este rol' });
        }
        return res.json({ empleado });
    } catch (error) {
        console.error('Error al consultar el expediente del empleado:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar el expediente' });
    }
});

router.patch('/:id', requerirPermiso('registrar_empleados'), async (req, res) => {
    const idEmpleado = Number(req.params.id);
    const {
        nombres,
        apellido_paterno,
        apellido_materno,
        dui,
        fecha_nacimiento,
        nombre_rol,
        cargo,
        tipo_planilla,
        salario_base,
        fecha_ingreso,
        sucursalid,
        isss_numero,
        afp_numero,
        tipo_contrato,
<<<<<<< HEAD
=======
        fecha_fin_contrato,
>>>>>>> frontend
        jornada,
        forma_pago
    } = req.body ?? {};
    const campos = {
        nombres, apellido_paterno, apellido_materno, dui, fecha_nacimiento, nombre_rol,
        cargo, tipo_planilla, salario_base, fecha_ingreso, sucursalid, isss_numero,
<<<<<<< HEAD
        afp_numero, tipo_contrato, jornada, forma_pago
=======
        afp_numero, tipo_contrato, fecha_fin_contrato, jornada, forma_pago
>>>>>>> frontend
    };

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0 ||
        Object.values(campos).every((valor) => valor === undefined) ||
        (nombres !== undefined && (typeof nombres !== 'string' || !nombres.trim() || nombres.length > 100)) ||
        (apellido_paterno !== undefined &&
            (typeof apellido_paterno !== 'string' || !apellido_paterno.trim() || apellido_paterno.length > 50)) ||
        !textoOpcionalValido(apellido_materno, 50) ||
        (dui !== undefined && (typeof dui !== 'string' || !dui.trim() || dui.length > 10)) ||
        (fecha_nacimiento !== undefined && !fechaValida(fecha_nacimiento)) ||
        (fecha_ingreso !== undefined && !fechaValida(fecha_ingreso)) ||
        (nombre_rol !== undefined &&
            (typeof nombre_rol !== 'string' || !nombre_rol.trim() || nombre_rol.length > 50)) ||
        (cargo !== undefined && (typeof cargo !== 'string' || !cargo.trim() || cargo.length > 50)) ||
        (tipo_planilla !== undefined &&
            !['quincenal', 'mensual'].includes(String(tipo_planilla).toLowerCase())) ||
        (salario_base !== undefined &&
            (!Number.isFinite(Number(salario_base)) || Number(salario_base) < 0 ||
                Number(salario_base) > 99999999.99)) ||
        (sucursalid !== undefined &&
            (!Number.isInteger(Number(sucursalid)) || Number(sucursalid) <= 0)) ||
        !textoOpcionalValido(isss_numero, 15) ||
        !textoOpcionalValido(afp_numero, 20) ||
<<<<<<< HEAD
        !textoOpcionalValido(tipo_contrato, 50) ||
=======
        (tipo_contrato !== undefined && !['indefinido', 'definido'].includes(tipo_contrato)) ||
        (fecha_fin_contrato !== undefined && fecha_fin_contrato !== null &&
            !fechaValida(fecha_fin_contrato)) ||
>>>>>>> frontend
        !textoOpcionalValido(jornada, 50) ||
        !textoOpcionalValido(forma_pago, 50)) {
        return res.status(400).json({ mensaje: 'Revisa el id, los campos y sus formatos' });
    }

    const nuevaSucursal = sucursalid === undefined ? undefined :
        sucursalid === null ? null : Number(sucursalid);
<<<<<<< HEAD
    if (req.auth.usuario.sucursalid &&
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
    if (req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req) &&
>>>>>>> frontend
        nuevaSucursal !== undefined && nuevaSucursal !== req.auth.usuario.sucursalid) {
        return res.status(403).json({ mensaje: 'Solo puedes asignar empleados a tu sucursal' });
    }
    if ((fecha_nacimiento !== undefined &&
            new Date(`${fecha_nacimiento}T00:00:00.000Z`) > new Date(new Date().toISOString().slice(0, 10))) ||
        (dui !== undefined && !dui.trim())) {
        return res.status(400).json({ mensaje: 'Revisa la fecha de nacimiento y el DUI' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const empleado = await tx.empleados.findFirst({
                where: {
                    id_empleado: idEmpleado,
                    activo: true,
                    sucursales: { is: { activo: true, nombre: { in: nombresBaseSucursalesEmpleados } } },
<<<<<<< HEAD
                    ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
=======
                    ...(!puedeGestionarTodasLasSucursales(req)
                        ? { sucursalid: req.auth.usuario.sucursalid }
                        : {})
>>>>>>> frontend
                },
                select: {
                    id_empleado: true,
                    nombres: true,
                    apellido_paterno: true,
                    apellido_materno: true,
                    sucursalid: true,
<<<<<<< HEAD
                    id_rol: true,
                    roles: { select: { es_administrativo: true } },
=======
                    fecha_ingreso: true,
                    fecha_fin_contrato: true,
                    tipo_contrato: true,
                    id_rol: true,
                    roles: {
                        select: {
                            es_administrativo: true,
                            niveles_acceso: { select: { codigo: true } }
                        }
                    },
>>>>>>> frontend
                    usuarios: { select: { id_usuario: true } }
                }
            });
            if (!empleado) return { error: 404 };
<<<<<<< HEAD
            if (empleado.roles.es_administrativo && !req.auth.permisos.has('gestionar_usuarios')) {
=======
            if (requiereAdministracionDeUsuarios(empleado.roles) &&
                !req.auth.permisos.has('gestionar_usuarios')) {
>>>>>>> frontend
                return { error: 403 };
            }

            let rol;
            if (nombre_rol !== undefined) {
                rol = await tx.roles.findUnique({
                    where: { nombre_rol: nombre_rol.trim() },
                    include: { niveles_acceso: { select: { codigo: true } } }
                });
                if (!rol || rol.niveles_acceso.codigo === 'cliente') return { error: 400 };
                if (!req.auth.permisos.has('gestionar_roles_permisos') &&
<<<<<<< HEAD
                    rol.niveles_acceso.codigo !== 'empleado') return { error: 403 };
=======
                    !nivelesEmpleadoAsignables.has(rol.niveles_acceso.codigo)) return { error: 403 };
>>>>>>> frontend
            }
            if (nuevaSucursal !== undefined && nuevaSucursal !== null &&
                !await tx.sucursales.findFirst({
                    where: {
                        sucursalid: nuevaSucursal,
                        activo: true,
                        nombre: { in: nombresBaseSucursalesEmpleados }
                    },
                    select: { sucursalid: true }
                })) {
                return { error: 400 };
            }
<<<<<<< HEAD
=======
            const contratoCambiado = tipo_contrato !== undefined ||
                fecha_fin_contrato !== undefined || fecha_ingreso !== undefined;
            const tipoContratoActual = tipo_contrato ?? empleado.tipo_contrato?.toLowerCase();
            const fechaIngresoActual = fecha_ingreso ?? empleado.fecha_ingreso.toISOString().slice(0, 10);
            const fechaFinActual = fecha_fin_contrato === undefined
                ? (empleado.fecha_fin_contrato?.toISOString().slice(0, 10) ?? null)
                : fecha_fin_contrato;
            if (contratoCambiado &&
                !validarContrato(tipoContratoActual, fechaIngresoActual, fechaFinActual)) {
                return { error: 422 };
            }
>>>>>>> frontend

            const nombresActualizados = {
                nombres: nombres === undefined ? empleado.nombres : nombres.trim(),
                apellido_paterno: apellido_paterno === undefined
                    ? empleado.apellido_paterno
                    : apellido_paterno.trim(),
                apellido_materno: apellido_materno === undefined
                    ? empleado.apellido_materno
                    : apellido_materno?.trim() || null
            };
            const nombreCompleto = [
                nombresActualizados.nombres,
                nombresActualizados.apellido_paterno,
                nombresActualizados.apellido_materno
            ].filter(Boolean).join(' ');
            const datos = {
                ...(nombres !== undefined ? { nombres: nombresActualizados.nombres } : {}),
                ...(apellido_paterno !== undefined
                    ? { apellido_paterno: nombresActualizados.apellido_paterno }
                    : {}),
                ...(apellido_materno !== undefined
                    ? { apellido_materno: nombresActualizados.apellido_materno }
                    : {}),
                ...(nombres !== undefined || apellido_paterno !== undefined || apellido_materno !== undefined
                    ? { nombre_completo: nombreCompleto }
                    : {}),
                ...(dui !== undefined ? { dui: dui.trim() } : {}),
                ...(fecha_nacimiento !== undefined
                    ? { fecha_nacimiento: new Date(`${fecha_nacimiento}T00:00:00.000Z`) }
                    : {}),
                ...(rol ? { id_rol: rol.id_rol } : {}),
                ...(cargo !== undefined ? { cargo: cargo.trim() } : {}),
                ...(tipo_planilla !== undefined ? { tipo_planilla: String(tipo_planilla).toLowerCase() } : {}),
                ...(salario_base !== undefined ? { salario_base: Number(salario_base) } : {}),
                ...(fecha_ingreso !== undefined
                    ? { fecha_ingreso: new Date(`${fecha_ingreso}T00:00:00.000Z`) }
                    : {}),
                ...(nuevaSucursal !== undefined ? { sucursalid: nuevaSucursal } : {}),
                ...(isss_numero !== undefined ? { isss_numero: isss_numero?.trim() || null } : {}),
                ...(afp_numero !== undefined ? { afp_numero: afp_numero?.trim() || null } : {}),
<<<<<<< HEAD
                ...(tipo_contrato !== undefined ? { tipo_contrato: tipo_contrato?.trim() || null } : {}),
=======
                ...(contratoCambiado ? {
                    tipo_contrato: tipoContratoActual,
                    fecha_fin_contrato: tipoContratoActual === 'indefinido'
                        ? null
                        : new Date(`${fechaFinActual}T00:00:00.000Z`)
                } : {}),
>>>>>>> frontend
                ...(jornada !== undefined ? { jornada: jornada?.trim() || null } : {}),
                ...(forma_pago !== undefined ? { forma_pago: forma_pago?.trim() || null } : {})
            };

            await tx.empleados.update({ where: { id_empleado: idEmpleado }, data: datos });
            if (empleado.usuarios) {
                await tx.usuarios.update({
                    where: { id_usuario: empleado.usuarios.id_usuario },
                    data: {
                        ...(nombreCompleto !== [
                            empleado.nombres,
                            empleado.apellido_paterno,
                            empleado.apellido_materno
                        ].filter(Boolean).join(' ') ? { nombre_completo: nombreCompleto } : {}),
                        ...(rol ? { id_rol: rol.id_rol } : {}),
                        ...(nuevaSucursal !== undefined ? { sucursalid: nuevaSucursal } : {})
                    }
                });
            }
            return {
                empleado: await tx.empleados.findUnique({
                    where: { id_empleado: idEmpleado },
                    select: {
                        id_empleado: true,
                        codigo_empleado: true,
                        nombre_completo: true,
                        cargo: true,
                        tipo_planilla: true,
                        salario_base: true,
                        fecha_ingreso: true,
<<<<<<< HEAD
=======
                        fecha_fin_contrato: true,
                        tipo_contrato: true,
>>>>>>> frontend
                        roles: { select: { nombre_rol: true } },
                        sucursales: { select: { nombre: true } }
                    }
                }),
                idUsuario: empleado.usuarios?.id_usuario ?? null,
                invalidarSesion: Boolean(empleado.usuarios && (
                    nombres !== undefined || apellido_paterno !== undefined ||
                    apellido_materno !== undefined ||
                    (rol && rol.id_rol !== empleado.id_rol) ||
                    (nuevaSucursal !== undefined && nuevaSucursal !== empleado.sucursalid)
                ))
            };
        });

        if (resultado.error === 404) return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        if (resultado.error === 400) return res.status(400).json({ mensaje: 'Revisa el rol y la sucursal activos' });
<<<<<<< HEAD
=======
        if (resultado.error === 422) {
            return res.status(400).json({ mensaje: 'Un contrato definido debe finalizar después de la fecha de ingreso' });
        }
>>>>>>> frontend
        if (resultado.error === 403) {
            return res.status(403).json({ mensaje: 'No tienes permiso para modificar ese nivel o rol administrativo' });
        }
        if (resultado.idUsuario && resultado.invalidarSesion) {
            invalidarSesionesDeUsuario(resultado.idUsuario);
        }
        return res.json({ mensaje: 'Expediente actualizado', empleado: resultado.empleado });
    } catch (error) {
        if (error.code === 'P2002' || [2601, 2627].includes(error.originalError?.info?.number ?? error.number)) {
            return res.status(409).json({ mensaje: 'El DUI ya está registrado' });
        }
        console.error('Error al actualizar expediente del empleado:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el expediente' });
    }
});

router.post('/', requerirPermiso('registrar_empleados'), async (req, res) => {
    const {
        nombres,
        apellido_paterno,
        apellido_materno,
        dui,
        fecha_nacimiento,
        nombre_rol,
        cargo,
        tipo_planilla,
        salario_base,
        fecha_ingreso,
        sucursalid,
        isss_numero,
        afp_numero,
        tipo_contrato,
<<<<<<< HEAD
=======
        fecha_fin_contrato,
>>>>>>> frontend
        jornada,
        forma_pago
    } = req.body ?? {};

    if (typeof nombres !== 'string' || !nombres.trim() || nombres.length > 100 ||
        typeof apellido_paterno !== 'string' || !apellido_paterno.trim() || apellido_paterno.length > 50 ||
        !textoOpcionalValido(apellido_materno, 50) ||
        typeof dui !== 'string' || !dui.trim() || dui.length > 10 ||
        !fechaValida(fecha_nacimiento) || !fechaValida(fecha_ingreso) ||
        typeof nombre_rol !== 'string' || !nombre_rol.trim() || nombre_rol.length > 50 ||
        typeof cargo !== 'string' || !cargo.trim() || cargo.length > 50 ||
        !['quincenal', 'mensual'].includes(String(tipo_planilla).toLowerCase()) ||
        !Number.isFinite(Number(salario_base)) || Number(salario_base) < 0 || Number(salario_base) > 99999999.99 ||
        (!Number.isInteger(Number(sucursalid)) || Number(sucursalid) <= 0) ||
        !textoOpcionalValido(isss_numero, 15) ||
        !textoOpcionalValido(afp_numero, 20) ||
<<<<<<< HEAD
        !textoOpcionalValido(tipo_contrato, 50) ||
=======
        !['indefinido', 'definido'].includes(tipo_contrato) ||
        (tipo_contrato === 'indefinido'
            ? fecha_fin_contrato !== undefined && fecha_fin_contrato !== null
            : !fechaValida(fecha_fin_contrato) || fecha_fin_contrato <= fecha_ingreso) ||
>>>>>>> frontend
        !textoOpcionalValido(jornada, 50) ||
        !textoOpcionalValido(forma_pago, 50)) {
        return res.status(400).json({ mensaje: 'Revisa los campos obligatorios y sus formatos' });
    }
    const sucursalSolicitada = Number(sucursalid);
<<<<<<< HEAD
    if (req.auth.usuario.sucursalid && sucursalSolicitada !== req.auth.usuario.sucursalid) {
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
    if (req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req) &&
        sucursalSolicitada !== req.auth.usuario.sucursalid) {
>>>>>>> frontend
        return res.status(403).json({ mensaje: 'Solo puedes registrar empleados en tu sucursal' });
    }

    try {
        const fechaNacimiento = new Date(`${fecha_nacimiento}T00:00:00.000Z`);
        if (fechaNacimiento > new Date(new Date().toISOString().slice(0, 10))) {
            return res.status(400).json({ mensaje: 'La fecha de nacimiento no puede ser futura' });
        }
        const duiRegistrado = await prisma.empleados.findUnique({
            where: { dui: dui.trim() },
            select: { id_empleado: true }
        });
        if (duiRegistrado) return res.status(409).json({ mensaje: 'El DUI ya está registrado' });
        const rol = await prisma.roles.findUnique({
            where: { nombre_rol: nombre_rol.trim() },
            include: { niveles_acceso: { select: { codigo: true } } }
        });
        if (!rol || rol.niveles_acceso.codigo === 'cliente') {
            return res.status(400).json({ mensaje: 'Selecciona un rol válido para empleado' });
        }
<<<<<<< HEAD
        if (!req.auth.permisos.has('gestionar_roles_permisos') && rol.niveles_acceso.codigo !== 'empleado') {
=======
        if (!req.auth.permisos.has('gestionar_roles_permisos') &&
            !nivelesEmpleadoAsignables.has(rol.niveles_acceso.codigo)) {
>>>>>>> frontend
            return res.status(403).json({ mensaje: 'No tienes permiso para asignar ese nivel de acceso' });
        }
        if (sucursalid !== undefined && sucursalid !== null &&
            !await prisma.sucursales.findFirst({
                where: {
                    sucursalid: Number(sucursalid),
                    activo: true,
                    nombre: { in: nombresBaseSucursalesEmpleados }
                },
                select: { sucursalid: true }
            })) {
            return res.status(400).json({ mensaje: 'Selecciona una sucursal activa' });
        }

<<<<<<< HEAD
        const [creado] = await prisma.$queryRaw`
            EXEC dbo.sp_registrar_empleado
=======
        const creado = await prisma.$transaction(async (tx) => {
            const [empleadoCreado] = await tx.$queryRaw`
                EXEC dbo.sp_registrar_empleado
>>>>>>> frontend
                @nombres = ${nombres.trim()},
                @apellido_paterno = ${apellido_paterno.trim()},
                @apellido_materno = ${apellido_materno?.trim() || null},
                @dui = ${dui.trim()},
<<<<<<< HEAD
                @fecha_nacimiento = CONVERT(date, ${fecha_nacimiento}),
=======
                @fecha_nacimiento = ${new Date(`${fecha_nacimiento}T00:00:00.000Z`)},
>>>>>>> frontend
                @nombre_rol = ${nombre_rol.trim()},
                @cargo = ${cargo.trim()},
                @tipo_planilla = ${String(tipo_planilla).toLowerCase()},
                @salario_base = ${Number(salario_base)},
<<<<<<< HEAD
                @fecha_ingreso = CONVERT(date, ${fecha_ingreso}),
=======
                @fecha_ingreso = ${new Date(`${fecha_ingreso}T00:00:00.000Z`)},
>>>>>>> frontend
                @sucursalid = ${sucursalid ? Number(sucursalid) : null},
                @isss_numero = ${isss_numero?.trim() || null},
                @afp_numero = ${afp_numero?.trim() || null},
                @tipo_contrato = ${tipo_contrato?.trim() || null},
                @jornada = ${jornada?.trim() || null},
                @forma_pago = ${forma_pago?.trim() || null}
<<<<<<< HEAD
        `;

        if (!creado) {
            throw new Error('El procedimiento de registro no devolvió el empleado creado');
        }
=======
            `;

            if (!empleadoCreado) {
                throw new Error('El procedimiento de registro no devolvió el empleado creado');
            }
            if (fecha_fin_contrato) {
                await tx.empleados.update({
                    where: { id_empleado: empleadoCreado.id_empleado },
                    data: { fecha_fin_contrato: new Date(`${fecha_fin_contrato}T00:00:00.000Z`) }
                });
            }
            return empleadoCreado;
        });
>>>>>>> frontend

        return res.status(201).json({
            mensaje: 'Empleado registrado. Entrega la contraseña inicial de forma segura.',
            empleado: {
                id_empleado: creado.id_empleado,
                codigo_empleado: creado.codigo_empleado,
                nombre_completo: creado.nombre_completo,
                correo: creado.correo,
                rol: creado.rol
            },
            credenciales_iniciales: {
                correo: creado.correo,
                password: creado.password_inicial
            }
        });
    } catch (error) {
        if (error.code === 'P2002' || [2601, 2627].includes(error.originalError?.info?.number ?? error.number)) {
            return res.status(409).json({ mensaje: 'El DUI ya está registrado' });
        }
        console.error('Error al registrar empleado:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar el empleado por un error del servidor' });
    }
});

router.patch('/:id/desactivar', requerirPermiso('registrar_empleados'), async (req, res) => {
    const idEmpleado = Number(req.params.id);
    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
        return res.status(400).json({ mensaje: 'El id de empleado no es válido' });
    }
<<<<<<< HEAD
=======
    if (!req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req)) {
        return res.status(403).json({ mensaje: 'Tu cuenta debe tener una sucursal asignada' });
    }
>>>>>>> frontend

    try {
        const empleado = await prisma.empleados.findFirst({
            where: {
                id_empleado: idEmpleado,
                sucursales: { is: { activo: true, nombre: { in: nombresBaseSucursalesEmpleados } } }
            },
            select: {
                id_empleado: true,
                activo: true,
                sucursalid: true,
<<<<<<< HEAD
                roles: { select: { es_administrativo: true } },
=======
                roles: {
                    select: {
                        es_administrativo: true,
                        niveles_acceso: { select: { codigo: true } }
                    }
                },
>>>>>>> frontend
                usuarios: { select: { id_usuario: true } }
            }
        });
        if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado' });
<<<<<<< HEAD
        if (req.auth.usuario.sucursalid && empleado.sucursalid !== req.auth.usuario.sucursalid) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }
        if (!empleado.activo) return res.status(409).json({ mensaje: 'El empleado ya está inactivo' });
        if (empleado.roles.es_administrativo && !req.auth.permisos.has('gestionar_usuarios')) {
=======
        if (req.auth.usuario.sucursalid && !puedeGestionarTodasLasSucursales(req) &&
            empleado.sucursalid !== req.auth.usuario.sucursalid) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }
        if (!empleado.activo) return res.status(409).json({ mensaje: 'El empleado ya está inactivo' });
        if (requiereAdministracionDeUsuarios(empleado.roles) &&
            !req.auth.permisos.has('gestionar_usuarios')) {
>>>>>>> frontend
            return res.status(403).json({ mensaje: 'Se requiere permiso de administración de usuarios para dar de baja este rol' });
        }
        if (empleado.usuarios?.id_usuario === req.auth.usuario.id_usuario) {
            return res.status(409).json({ mensaje: 'No puedes dar de baja tu propio usuario' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.empleados.update({
                where: { id_empleado: idEmpleado },
                data: { activo: false }
            });
            await tx.usuarios.updateMany({
                where: { id_empleado: idEmpleado },
                data: { activo: false }
            });
        });
        if (empleado.usuarios) invalidarSesionesDeUsuario(empleado.usuarios.id_usuario);

        return res.json({ mensaje: 'Empleado dado de baja; su expediente e historial se conservaron' });
    } catch (error) {
        console.error('Error al dar de baja empleado:', error);
        return res.status(500).json({ mensaje: 'No se pudo dar de baja el empleado' });
    }
});

export default router;
