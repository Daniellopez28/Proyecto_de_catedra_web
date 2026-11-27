import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

function enteroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function fechaValida(valor) {
    if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

router.get('/', requerirPermiso('ver_reservas'), async (req, res) => {
    try {
        const sucursalid = req.auth.usuario.sucursalid;
        const where = sucursalid
            ? { mesas: { sucursalid } }
            : {};
        const reservas = await prisma.reservas.findMany({
            where,
            orderBy: { fecha_hora_inicio: 'asc' },
            select: {
                id_reserva: true,
                fecha_hora_inicio: true,
                duracion_minutos: true,
                cantidad_personas: true,
                estado: true,
                notas: true,
                clientes: { select: { nombre: true, apellido: true, telefono: true } },
                mesas: {
                    select: {
                        numero_mesa: true,
                        sucursales: { select: { nombre: true } }
                    }
                }
            }
        });
        return res.json({ total: reservas.length, reservas });
    } catch (error) {
        console.error('Error al consultar reservas:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las reservas' });
    }
});

router.get('/disponibles', requerirPermiso('ver_reservas_disponibles'), async (req, res) => {
    const fechaHora = fechaValida(req.query.fecha_hora);
    const personas = enteroPositivo(req.query.personas);
    const duracion = req.query.duracion_minutos === undefined ? 90 : Number(req.query.duracion_minutos);
    const sucursalid = req.auth.usuario.sucursalid ?? enteroPositivo(req.query.sucursalid);

    if (!fechaHora || !personas || !Number.isInteger(duracion) || duracion < 30 || duracion > 480 ||
        !enteroPositivo(sucursalid)) {
        return res.status(400).json({
            mensaje: 'Indica fecha_hora válida, personas, duración entre 30 y 480 minutos y una sucursal'
        });
    }

    try {
        const sucursalActiva = await prisma.sucursales.findFirst({
            where: { sucursalid: Number(sucursalid), activo: true },
            select: { sucursalid: true }
        });
        if (!sucursalActiva) return res.status(404).json({ mensaje: 'Sucursal no encontrada o inactiva' });
        const mesas = await prisma.$queryRaw`
            SELECT mesaid, sucursalid, numero_mesa, capacidad
            FROM dbo.fn_mesas_disponibles(
                ${Number(sucursalid)},
                ${fechaHora},
                ${personas},
                ${duracion}
            )
            ORDER BY numero_mesa
        `;
        return res.json({ total: mesas.length, mesas });
    } catch (error) {
        console.error('Error al consultar mesas disponibles:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las mesas disponibles' });
    }
});

router.post('/', requerirPermiso('gestionar_reservas'), async (req, res) => {
    const mesaid = enteroPositivo(req.body?.mesaid);
    const fechaHora = fechaValida(req.body?.fecha_hora_inicio);
    const cantidadPersonas = enteroPositivo(req.body?.cantidad_personas);
    const nombre = req.body?.nombre;
    const apellido = req.body?.apellido;
    const telefono = req.body?.telefono;
    const duracion = 90;
    const notas = req.body?.notas;

    if (!mesaid || !fechaHora || !cantidadPersonas ||
        typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150 ||
        typeof apellido !== 'string' || !apellido.trim() || apellido.trim().length > 100 ||
        typeof telefono !== 'string' || !telefono.trim() || telefono.trim().length > 20 ||
        (notas !== undefined && notas !== null && (typeof notas !== 'string' || notas.length > 255))) {
        return res.status(400).json({ mensaje: 'Revisa la mesa, fecha, personas y datos de contacto del cliente' });
    }
    if (fechaHora <= new Date()) {
        return res.status(400).json({ mensaje: 'La fecha de reserva debe ser futura' });
    }

    try {
        const reserva = await prisma.$transaction(async (tx) => {
            const mesa = await tx.mesas.findUnique({
                where: { mesaid },
                select: { mesaid: true, sucursalid: true }
            });
            if (!mesa || (req.auth.usuario.sucursalid &&
                mesa.sucursalid !== req.auth.usuario.sucursalid)) {
                const error = new Error('La mesa no existe o no pertenece a tu sucursal');
                error.codigoHttp = 404;
                throw error;
            }
            const disponibles = await tx.$queryRaw`
                SELECT mesaid
                FROM dbo.fn_mesas_disponibles(
                    ${mesa.sucursalid},
                    ${fechaHora},
                    ${cantidadPersonas},
                    ${duracion}
                )
                WHERE mesaid = ${mesaid}
            `;
            if (disponibles.length === 0) {
                const error = new Error('La mesa no está disponible para ese horario o grupo');
                error.codigoHttp = 409;
                throw error;
            }

            const cliente = await tx.clientes.create({
                data: {
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim()
                },
                select: { id_cliente: true }
            });
            return tx.reservas.create({
                data: {
                    mesaid,
                    id_cliente: cliente.id_cliente,
                    fecha_hora_inicio: fechaHora,
                    duracion_minutos: duracion,
                    cantidad_personas: cantidadPersonas,
                    notas: notas?.trim() || null
                },
                include: {
                    clientes: { select: { nombre: true, apellido: true, telefono: true } },
                    mesas: { select: { numero_mesa: true } }
                }
            });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ mensaje: 'Reserva creada', reserva });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        console.error('Error al crear reserva:', error);
        return res.status(500).json({ mensaje: 'No se pudo crear la reserva' });
    }
});

router.patch('/:id/estado', requerirPermiso('gestionar_reservas'), async (req, res) => {
    const idReserva = enteroPositivo(req.params.id);
    const { estado } = req.body ?? {};
    if (!idReserva || !['confirmada', 'cancelada', 'completada'].includes(estado)) {
        return res.status(400).json({ mensaje: 'Indica un id válido y un estado permitido' });
    }

    try {
        const reserva = await prisma.reservas.findUnique({
            where: { id_reserva: idReserva },
            include: { mesas: { select: { sucursalid: true } } }
        });
        if (!reserva || (req.auth.usuario.sucursalid &&
            reserva.mesas.sucursalid !== req.auth.usuario.sucursalid)) {
            return res.status(404).json({ mensaje: 'Reserva no encontrada' });
        }
        const transiciones = {
            pendiente: ['confirmada', 'cancelada'],
            confirmada: ['completada', 'cancelada']
        };
        if (!transiciones[reserva.estado]?.includes(estado)) {
            return res.status(409).json({ mensaje: 'La reserva no puede cambiar a ese estado' });
        }

        const actualizada = await prisma.reservas.updateMany({
            where: { id_reserva: idReserva, estado: reserva.estado },
            data: { estado }
        });
        if (actualizada.count !== 1) {
            return res.status(409).json({ mensaje: 'La reserva cambió mientras se procesaba la solicitud' });
        }
        const reservaActualizada = await prisma.reservas.findUnique({
            where: { id_reserva: idReserva },
            include: {
                clientes: { select: { nombre: true, apellido: true, telefono: true } },
                mesas: { select: { numero_mesa: true } }
            }
        });
        return res.json({ mensaje: 'Estado de reserva actualizado', reserva: reservaActualizada });
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar la reserva' });
    }
});

export default router;
