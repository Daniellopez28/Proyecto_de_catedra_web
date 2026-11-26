import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();
const maximoDinero = 99999999.99;

function enteroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function redondear(valor, decimales = 2) {
    const factor = 10 ** decimales;
    return Math.round((valor + Number.EPSILON) * factor) / factor;
}

function fechaSql(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor ? null : fecha;
}

function leerSucursal(req, valor) {
    if (req.auth.usuario.sucursalid) return req.auth.usuario.sucursalid;
    if (req.auth.permisos.has('gestionar_sucursales')) return enteroPositivo(valor);
    return null;
}

function filtrarSucursal(req, sucursalid) {
    if (req.auth.usuario.sucursalid) return { sucursalid: req.auth.usuario.sucursalid };
    if (req.auth.permisos.has('gestionar_sucursales') && sucursalid) return { sucursalid };
    return {};
}

async function registrarEgresoCaja(tx, req, sucursalid, metodoPago, monto, motivo) {
    if (metodoPago.trim().toLowerCase() !== 'efectivo') return;
    const caja = await tx.cajas.findFirst({
        where: {
            id_usuario: req.auth.usuario.id_usuario,
            sucursalid,
            estado: 'abierta'
        },
        select: { id_caja: true }
    });
    if (!caja) {
        const error = new Error('Abre una caja en la sucursal antes de registrar un pago en efectivo');
        error.codigoHttp = 409;
        throw error;
    }
    await tx.movimientos_caja.create({
        data: {
            cajaid: caja.id_caja,
            tipo_movimiento: 'pago_proveedor',
            monto,
            motivo,
            empleado_autoriza_id: req.auth.usuario.id_empleado ?? null
        }
    });
}

router.get('/', requerirPermiso('ver_compras'), async (req, res) => {
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 25);
    const sucursalid = req.query.sucursalid ? enteroPositivo(req.query.sucursalid) : null;
    if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 100 ||
        (req.query.sucursalid && !sucursalid)) {
        return res.status(400).json({ mensaje: 'Revisa la paginación y la sucursal' });
    }

    try {
        const where = filtrarSucursal(req, sucursalid);
        const [total, compras] = await prisma.$transaction([
            prisma.compras.count({ where }),
            prisma.compras.findMany({
                where,
                orderBy: { fecha_compra: 'desc' },
                skip: (pagina - 1) * limite,
                take: limite,
                include: {
                    proveedores: { select: { id_proveedor: true, nombre_empresa: true } },
                    compra_detalle: {
                        include: { insumos: { select: { id_insumo: true, nombre: true, unidad_medida: true } } }
                    },
                    pagos_compra: true
                }
            })
        ]);
        return res.json({ pagina, limite, total, compras });
    } catch (error) {
        console.error('Error al consultar compras:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las compras' });
    }
});

router.get('/:id', requerirPermiso('ver_compras'), async (req, res) => {
    const idCompra = enteroPositivo(req.params.id);
    if (!idCompra) return res.status(400).json({ mensaje: 'El id de compra no es válido' });

    try {
        const compra = await prisma.compras.findFirst({
            where: {
                id_compra: idCompra,
                ...filtrarSucursal(req, req.auth.usuario.sucursalid)
            },
            include: {
                proveedores: true,
                sucursales: { select: { sucursalid: true, nombre: true } },
                compra_detalle: { include: { insumos: true } },
                pagos_compra: { orderBy: { fecha: 'desc' } }
            }
        });
        if (!compra) return res.status(404).json({ mensaje: 'Compra no encontrada' });
        return res.json(compra);
    } catch (error) {
        console.error('Error al consultar compra:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar la compra' });
    }
});

router.post('/', requerirPermiso('registrar_compras'), async (req, res) => {
    const {
        id_proveedor,
        sucursalid: sucursalSolicitada,
        numero_factura_proveedor,
        detalles,
        iva = 0,
        fecha_vencimiento,
        condicion_pago,
        clasificacion,
        metodo_pago,
        referencia_pago,
        monto_pagado = 0
    } = req.body ?? {};
    const idProveedor = enteroPositivo(id_proveedor);
    const sucursal = leerSucursal(req, sucursalSolicitada);
    const impuestoEntrada = Number(iva);
    const impuesto = redondear(impuestoEntrada);
    const pagoInicial = Number(monto_pagado);

    if (!idProveedor || !enteroPositivo(sucursal) ||
        typeof numero_factura_proveedor !== 'string' || !numero_factura_proveedor.trim() ||
        numero_factura_proveedor.length > 50 || !Array.isArray(detalles) || detalles.length === 0 ||
        detalles.length > 100 || !Number.isFinite(impuestoEntrada) || impuestoEntrada < 0 ||
        impuestoEntrada > maximoDinero ||
        !Number.isFinite(pagoInicial) || pagoInicial < 0 ||
        (condicion_pago !== undefined && condicion_pago !== null &&
            (typeof condicion_pago !== 'string' || condicion_pago.length > 50)) ||
        (clasificacion !== undefined && clasificacion !== null &&
            (typeof clasificacion !== 'string' || clasificacion.length > 50)) ||
        (fecha_vencimiento !== undefined && fecha_vencimiento !== null &&
            !fechaSql(fecha_vencimiento))) {
        return res.status(400).json({ mensaje: 'Revisa los datos generales de la compra' });
    }
    if (pagoInicial > 0 &&
        (typeof metodo_pago !== 'string' || !metodo_pago.trim() || metodo_pago.length > 30 ||
            (referencia_pago !== undefined && referencia_pago !== null &&
                (typeof referencia_pago !== 'string' || referencia_pago.length > 50)))) {
        return res.status(400).json({ mensaje: 'Revisa los datos del pago inicial' });
    }

    const insumosPorId = new Map();
    for (const [indice, detalle] of detalles.entries()) {
        const idInsumo = enteroPositivo(detalle?.id_insumo);
        const cantidad = Number(detalle?.cantidad);
        const costoUnitario = Number(detalle?.costo_unitario);
        if (!idInsumo || !Number.isFinite(cantidad) || cantidad <= 0 || redondear(cantidad) <= 0 ||
            !Number.isFinite(costoUnitario) || costoUnitario < 0 ||
            cantidad > 99999999.99 || costoUnitario > 999999.9999 ||
            insumosPorId.has(idInsumo)) {
            return res.status(400).json({ mensaje: `El detalle ${indice + 1} no es válido o está duplicado` });
        }
        insumosPorId.set(idInsumo, {
            id_insumo: idInsumo,
            cantidad: redondear(cantidad),
            costo_unitario: redondear(costoUnitario, 4)
        });
    }

    const detallesNormalizados = Array.from(insumosPorId.values()).map((detalle) => ({
        ...detalle,
        subtotal: redondear(detalle.cantidad * detalle.costo_unitario)
    }));
    const subtotal = redondear(detallesNormalizados.reduce((total, detalle) => total + detalle.subtotal, 0));
    const total = redondear(subtotal + impuesto);
    if (subtotal > maximoDinero || impuesto > maximoDinero || total > maximoDinero) {
        return res.status(400).json({ mensaje: 'Los montos de la compra están fuera del rango permitido' });
    }
    const pagoRedondeado = redondear(pagoInicial);
    if (pagoInicial > 0 && pagoRedondeado <= 0) {
        return res.status(400).json({ mensaje: 'El pago inicial debe ser de al menos 0.01' });
    }
    if (pagoRedondeado > total) {
        return res.status(400).json({ mensaje: 'El pago inicial no puede superar el total de la compra' });
    }

    try {
        const compra = await prisma.$transaction(async (tx) => {
            const [proveedor, sucursalActiva, insumos] = await Promise.all([
                tx.proveedores.findFirst({
                    where: { id_proveedor: idProveedor, activo: true },
                    select: { id_proveedor: true }
                }),
                tx.sucursales.findFirst({
                    where: { sucursalid: Number(sucursal), activo: true },
                    select: { sucursalid: true }
                }),
                tx.insumos.findMany({
                    where: { id_insumo: { in: detallesNormalizados.map((item) => item.id_insumo) }, activo: true },
                    select: { id_insumo: true, nombre: true, stock_actual: true, costo_promedio: true }
                })
            ]);
            if (!proveedor) {
                const error = new Error('El proveedor no existe o está inactivo');
                error.codigoHttp = 404;
                throw error;
            }
            if (!sucursalActiva) {
                const error = new Error('La sucursal no existe o está inactiva');
                error.codigoHttp = 400;
                throw error;
            }
            if (insumos.length !== detallesNormalizados.length) {
                const error = new Error('Uno o más insumos no existen o están inactivos');
                error.codigoHttp = 400;
                throw error;
            }

            const creada = await tx.compras.create({
                data: {
                    id_proveedor: idProveedor,
                    sucursalid: Number(sucursal),
                    numero_factura_proveedor: numero_factura_proveedor.trim(),
                    subtotal,
                    iva: impuesto,
                    total_compra: total,
                    estado_pago: total === 0 || pagoRedondeado >= total
                        ? 'pagado'
                        : pagoRedondeado === 0 ? 'pendiente' : 'parcial',
                    fecha_vencimiento: fecha_vencimiento ? fechaSql(fecha_vencimiento) : null,
                    condicion_pago: condicion_pago?.trim() || null,
                    clasificacion: clasificacion?.trim() || null,
                    compra_detalle: { create: detallesNormalizados }
                }
            });

            for (const detalle of detallesNormalizados) {
                await tx.inventario_sucursal.upsert({
                    where: {
                        sucursalid_insumoid: {
                            sucursalid: Number(sucursal),
                            insumoid: detalle.id_insumo
                        }
                    },
                    create: {
                        sucursalid: Number(sucursal),
                        insumoid: detalle.id_insumo,
                        stock_actual: detalle.cantidad,
                        stock_minimo: 0
                    },
                    update: { stock_actual: { increment: detalle.cantidad } }
                });
                const insumo = insumos.find((item) => item.id_insumo === detalle.id_insumo);
                const stockGlobalAnterior = Number(insumo.stock_actual ?? 0);
                const costoAnterior = Number(insumo.costo_promedio ?? 0);
                const stockGlobalNuevo = redondear(stockGlobalAnterior + detalle.cantidad);
                const costoPromedio = stockGlobalNuevo === 0 ? detalle.costo_unitario :
                    redondear(
                        (stockGlobalAnterior * costoAnterior +
                            detalle.cantidad * detalle.costo_unitario) / stockGlobalNuevo,
                        4
                    );
                await tx.insumos.update({
                    where: { id_insumo: detalle.id_insumo },
                    data: {
                        stock_actual: { increment: detalle.cantidad },
                        costo_promedio: costoPromedio
                    }
                });
                await tx.movimientos_inventario.create({
                    data: {
                        sucursalid: Number(sucursal),
                        insumoid: detalle.id_insumo,
                        tipo_movimiento: 'entrada',
                        cantidad: detalle.cantidad,
                        referencia: `compra:${creada.id_compra}`,
                        id_usuario: req.auth.usuario.id_usuario
                    }
                });
            }

            if (pagoRedondeado > 0) {
                await tx.pagos_compra.create({
                    data: {
                        id_compra: creada.id_compra,
                        monto: pagoRedondeado,
                        metodo_pago: metodo_pago.trim(),
                        referencia: referencia_pago?.trim() || null,
                        id_usuario: req.auth.usuario.id_usuario
                    }
                });
                await registrarEgresoCaja(
                    tx,
                    req,
                    Number(sucursal),
                    metodo_pago,
                    pagoRedondeado,
                    `Pago de compra ${creada.id_compra}`
                );
            }

            return tx.compras.findUnique({
                where: { id_compra: creada.id_compra },
                include: {
                    proveedores: { select: { id_proveedor: true, nombre_empresa: true } },
                    compra_detalle: { include: { insumos: true } },
                    pagos_compra: true
                }
            });
        }, { isolationLevel: 'Serializable' });

        return res.status(201).json({ mensaje: 'Compra registrada e inventario actualizado', compra });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        console.error('Error al registrar compra:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar la compra' });
    }
});

router.post('/:id/pagos', requerirPermiso('registrar_compras'), async (req, res) => {
    const idCompra = enteroPositivo(req.params.id);
    const monto = Number(req.body?.monto);
    const metodoPago = req.body?.metodo_pago;
    const referencia = req.body?.referencia;
    const nuevoPago = redondear(monto);
    if (!idCompra || !Number.isFinite(monto) || monto <= 0 || monto > maximoDinero ||
        nuevoPago <= 0 ||
        typeof metodoPago !== 'string' || !metodoPago.trim() || metodoPago.length > 30 ||
        (referencia !== undefined && referencia !== null &&
            (typeof referencia !== 'string' || referencia.length > 50))) {
        return res.status(400).json({ mensaje: 'Revisa el monto y los datos del pago' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const compra = await tx.compras.findFirst({
                where: {
                    id_compra: idCompra,
                    ...filtrarSucursal(req, req.auth.usuario.sucursalid)
                }
            });
            if (!compra) return { error: 404 };
            const agregado = await tx.pagos_compra.aggregate({
                where: { id_compra: idCompra },
                _sum: { monto: true }
            });
            const pagado = Number(agregado._sum.monto ?? 0);
            if (pagado + nuevoPago > Number(compra.total_compra)) return { error: 409 };

            await tx.pagos_compra.create({
                data: {
                    id_compra: idCompra,
                    monto: nuevoPago,
                    metodo_pago: metodoPago.trim(),
                    referencia: referencia?.trim() || null,
                    id_usuario: req.auth.usuario.id_usuario
                }
            });
            await registrarEgresoCaja(
                tx,
                req,
                compra.sucursalid,
                metodoPago,
                nuevoPago,
                `Abono a compra ${compra.id_compra}`
            );
            const totalPagado = redondear(pagado + nuevoPago);
            const actualizada = await tx.compras.update({
                where: { id_compra: idCompra },
                data: { estado_pago: totalPagado >= Number(compra.total_compra) ? 'pagado' : 'parcial' },
                include: { pagos_compra: { orderBy: { fecha: 'desc' } } }
            });
            return { compra: actualizada };
        }, { isolationLevel: 'Serializable' });

        if (resultado.error === 404) return res.status(404).json({ mensaje: 'Compra no encontrada' });
        if (resultado.error === 409) return res.status(409).json({ mensaje: 'El pago supera el saldo pendiente' });
        return res.status(201).json({ mensaje: 'Pago registrado', ...resultado });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        console.error('Error al registrar pago de compra:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar el pago' });
    }
});

export default router;
