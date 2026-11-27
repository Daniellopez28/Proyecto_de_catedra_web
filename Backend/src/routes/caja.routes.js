import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();
const tiposMovimiento = new Set(['retiro', 'ingreso_extra', 'pago_proveedor']);

function montoValido(valor, permitirCero = false) {
    const monto = Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
    return Number.isFinite(monto) && monto >= (permitirCero ? 0 : 0.01) && monto <= 99999999.99;
}

function redondearMoneda(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function validarId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function enteroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

<<<<<<< HEAD
router.get('/actual', requerirPermiso('operar_caja'), async (req, res) => {
    try {
        const caja = await prisma.cajas.findFirst({
            where: { id_usuario: req.auth.usuario.id_usuario, estado: 'abierta' },
            orderBy: { fecha_apertura: 'desc' },
            include: { movimientos_caja: { orderBy: { fecha: 'desc' } } }
        });
        return res.json({
            caja: caja && {
                ...caja,
=======
async function calcularMontoSistema(db, caja) {
    const [ventasEfectivo] = await db.$queryRaw`
        SELECT COALESCE(SUM(p.monto), 0) AS monto
        FROM dbo.ventas v
        INNER JOIN dbo.pagos p ON p.id_venta = v.id_venta
        WHERE v.sucursalid = ${caja.sucursalid}
          AND p.fecha_pago >= ${caja.fecha_apertura}
          AND LOWER(p.metodo_pago) = 'efectivo'
    `;
    const movimientos = caja.movimientos_caja.reduce((total, movimiento) => {
        const monto = Number(movimiento.monto);
        return total + (movimiento.tipo_movimiento === 'ingreso_extra' ? monto : -monto);
    }, 0);
    return Number((
        Number(caja.monto_apertura) + Number(ventasEfectivo.monto) + movimientos
    ).toFixed(2));
}

router.get('/actual', async (req, res) => {
    const puedeOperar = req.auth.permisos.has('operar_caja');
    const puedeVer = req.auth.permisos.has('ver_caja');
    if (!puedeOperar && !puedeVer) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar caja' });
    }
    try {
        const caja = await prisma.cajas.findFirst({
            where: {
                estado: 'abierta',
                ...(puedeOperar
                    ? { id_usuario: req.auth.usuario.id_usuario }
                    : req.auth.usuario.sucursalid
                        ? { sucursalid: req.auth.usuario.sucursalid }
                        : {})
            },
            orderBy: { fecha_apertura: 'desc' },
            include: {
                movimientos_caja: { orderBy: { fecha: 'desc' } },
                usuarios: { select: { nombre_completo: true } },
                sucursales: { select: { nombre: true } }
            }
        });
        const montoSistema = caja ? await calcularMontoSistema(prisma, caja) : null;
        return res.json({
            caja: caja && {
                ...caja,
                monto_sistema: montoSistema,
>>>>>>> frontend
                movimientos_caja: caja.movimientos_caja.map((movimiento) => ({
                    ...movimiento,
                    movimientocajaid: String(movimiento.movimientocajaid)
                }))
            }
        });
    } catch (error) {
        console.error('Error al consultar caja abierta:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar la caja' });
    }
});

router.post('/abrir', requerirPermiso('operar_caja'), async (req, res) => {
    const { monto_apertura, nombre_caja, observaciones_apertura, sucursalid: sucursalSolicitada } =
        req.body ?? {};
    const sucursalid = req.auth.usuario.sucursalid ??
        (req.auth.permisos.has('gestionar_sucursales') ? enteroPositivo(sucursalSolicitada) : null);
    if (!montoValido(monto_apertura, true) ||
        !enteroPositivo(sucursalid) ||
        (nombre_caja !== undefined && nombre_caja !== null &&
            (typeof nombre_caja !== 'string' || nombre_caja.length > 50)) ||
        (observaciones_apertura !== undefined && observaciones_apertura !== null &&
            (typeof observaciones_apertura !== 'string' || observaciones_apertura.length > 255))) {
        return res.status(400).json({ mensaje: 'Revisa el monto y los datos de apertura' });
    }

    try {
        const sucursalActiva = await prisma.sucursales.findFirst({
            where: { sucursalid: Number(sucursalid), activo: true },
            select: { sucursalid: true }
        });
        if (!sucursalActiva) return res.status(404).json({ mensaje: 'Sucursal no encontrada o inactiva' });
        const existente = await prisma.cajas.findFirst({
            where: { sucursalid: Number(sucursalid), estado: 'abierta' },
            select: { id_caja: true }
        });
        if (existente) return res.status(409).json({ mensaje: 'Ya existe una caja abierta para esta sucursal' });

        const caja = await prisma.cajas.create({
            data: {
                id_usuario: req.auth.usuario.id_usuario,
                sucursalid: Number(sucursalid),
                monto_apertura: redondearMoneda(monto_apertura),
                nombre_caja: nombre_caja?.trim() || null,
                observaciones_apertura: observaciones_apertura?.trim() || null
            }
        });
        return res.status(201).json({ mensaje: 'Caja abierta', caja });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ mensaje: 'Ya existe una caja abierta para esta sucursal' });
        }
        console.error('Error al abrir caja:', error);
        return res.status(500).json({ mensaje: 'No se pudo abrir la caja' });
    }
});

router.post('/:id/movimientos', requerirPermiso('operar_caja'), async (req, res) => {
    const idCaja = validarId(req.params.id);
    const { tipo_movimiento, monto, motivo } = req.body ?? {};
    if (!idCaja || !tiposMovimiento.has(tipo_movimiento) || !montoValido(monto) ||
        (motivo !== undefined && motivo !== null && (typeof motivo !== 'string' || motivo.length > 255))) {
        return res.status(400).json({ mensaje: 'Revisa el tipo, monto y motivo del movimiento' });
    }

    try {
        const caja = await prisma.cajas.findFirst({
            where: { id_caja: idCaja, id_usuario: req.auth.usuario.id_usuario, estado: 'abierta' },
            select: { id_caja: true }
        });
        if (!caja) return res.status(404).json({ mensaje: 'No se encontró una caja abierta propia con ese id' });

        const movimiento = await prisma.movimientos_caja.create({
            data: {
                cajaid: idCaja,
                tipo_movimiento,
                monto: redondearMoneda(monto),
                motivo: motivo?.trim() || null,
                empleado_autoriza_id: req.auth.usuario.id_empleado
            }
        });
        return res.status(201).json({
            mensaje: 'Movimiento registrado',
            movimiento: { ...movimiento, movimientocajaid: String(movimiento.movimientocajaid) }
        });
    } catch (error) {
        console.error('Error al registrar movimiento de caja:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar el movimiento' });
    }
});

router.post('/:id/cerrar', requerirPermiso('operar_caja'), async (req, res) => {
    const idCaja = validarId(req.params.id);
    const { monto_cierre_fisico, observaciones_cierre } = req.body ?? {};
    if (!idCaja || !montoValido(monto_cierre_fisico, true) ||
        (observaciones_cierre !== undefined && observaciones_cierre !== null &&
            (typeof observaciones_cierre !== 'string' || observaciones_cierre.length > 255))) {
        return res.status(400).json({ mensaje: 'Revisa el monto y las observaciones del cierre' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const caja = await tx.cajas.findFirst({
                where: { id_caja: idCaja, id_usuario: req.auth.usuario.id_usuario, estado: 'abierta' },
                include: { movimientos_caja: true }
            });
            if (!caja) return null;

<<<<<<< HEAD
            const [ventasEfectivo] = await tx.$queryRaw`
                SELECT COALESCE(SUM(p.monto), 0) AS monto
                FROM dbo.ventas v
                INNER JOIN dbo.pagos p ON p.id_venta = v.id_venta
                WHERE v.id_usuario = ${req.auth.usuario.id_usuario}
                  AND v.sucursalid = ${caja.sucursalid}
                  AND p.fecha_pago >= ${caja.fecha_apertura}
                  AND LOWER(p.metodo_pago) = 'efectivo'
            `;
            const movimientos = caja.movimientos_caja.reduce((total, movimiento) => {
                const monto = Number(movimiento.monto);
                return total + (movimiento.tipo_movimiento === 'ingreso_extra' ? monto : -monto);
            }, 0);
            const montoSistema = Number((
                Number(caja.monto_apertura) + Number(ventasEfectivo.monto) + movimientos
            ).toFixed(2));
=======
            const montoSistema = await calcularMontoSistema(tx, caja);
>>>>>>> frontend
            const actualizada = await tx.cajas.updateMany({
                where: { id_caja: idCaja, id_usuario: req.auth.usuario.id_usuario, estado: 'abierta' },
                data: {
                    fecha_cierre: new Date(),
                    monto_cierre_sistema: montoSistema,
                    monto_cierre_fisico: redondearMoneda(monto_cierre_fisico),
                    diferencia: redondearMoneda(Number(monto_cierre_fisico) - montoSistema),
                    observaciones_cierre: observaciones_cierre?.trim() || null,
                    estado: 'cerrada'
                }
            });
            if (actualizada.count !== 1) return null;
            return tx.cajas.findUnique({ where: { id_caja: idCaja } });
        }, { isolationLevel: 'Serializable' });

        if (!resultado) return res.status(409).json({ mensaje: 'La caja ya fue cerrada o no está disponible' });
        return res.json({
            mensaje: 'Caja cerrada',
            caja: resultado,
<<<<<<< HEAD
            nota: 'El total del sistema considera ventas en efectivo del usuario y movimientos registrados desde la apertura.'
=======
            nota: 'El total del sistema considera ventas en efectivo de la sucursal y movimientos registrados desde la apertura.'
>>>>>>> frontend
        });
    } catch (error) {
        console.error('Error al cerrar caja:', error);
        return res.status(500).json({ mensaje: 'No se pudo cerrar la caja' });
    }
});

export default router;
