import { Router } from 'express';
import prisma from '../config/prisma.js';
import {
    ErrorInventario,
    ejecutarExplosion,
    revertirExplosion,
    normalizarProductosVenta
} from '../servicios/inventarioServicio.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/', async (req, res) => {
    const puedeVerVentas = req.auth.permisos.has('ver_ventas');
    const puedeVerCocina = req.auth.permisos.has('ver_pedidos_cocina');
    const puedeTomarPedidos = req.auth.permisos.has('tomar_pedidos');
    const puedeOperarCaja = req.auth.permisos.has('operar_caja');
    const consultaPendientes = req.query.pendientes === 'true';
    if (consultaPendientes
        ? !puedeTomarPedidos && !puedeVerCocina && !puedeOperarCaja
        : !puedeVerVentas && !puedeVerCocina) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar ventas' });
    }
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 25);
    if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 100) {
        return res.status(400).json({ mensaje: 'La paginación no es válida' });
    }

    try {
        const where = {
            ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {}),
            ...(consultaPendientes
                ? {
                    estado: { in: ['pendiente', 'parcial'] },
                    estado_pedido: { in: ['abierto', 'en_cocina', 'servido'] }
                }
                : !puedeVerVentas
                    ? { estado_pedido: { in: ['abierto', 'en_cocina', 'servido'] } }
                    : {})
        };
        const [total, ventas] = await prisma.$transaction([
            prisma.ventas.count({ where }),
            prisma.ventas.findMany({
                where,
                orderBy: { fecha_hora: 'desc' },
                skip: (pagina - 1) * limite,
                take: limite,
                include: {
                    clientes: { select: { id_cliente: true, nombre: true, apellido: true } },
                    mesas: { select: { mesaid: true, numero_mesa: true } },
                    pagos: true,
                    venta_detalle: {
                        include: {
                            productos: { select: { nombre: true, categoria: true } },
                            detalle_venta_modificadores: { include: { modificadores: true } }
                        }
                    }
                }
            })
        ]);
        return res.json({ pagina, limite, total, ventas });
    } catch (error) {
        console.error('Error al consultar ventas:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las ventas' });
    }
});

router.get('/:id', async (req, res) => {
    if (!req.auth.permisos.has('ver_ventas') && !req.auth.permisos.has('ver_pedidos_cocina')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para consultar ventas' });
    }
    const idVenta = Number(req.params.id);
    if (!Number.isInteger(idVenta) || idVenta <= 0) {
        return res.status(400).json({ mensaje: 'El id de venta no es válido' });
    }

    try {
        const venta = await prisma.ventas.findFirst({
            where: {
                id_venta: idVenta,
                ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
            },
            include: {
                clientes: true,
                mesas: { select: { mesaid: true, numero_mesa: true } },
                sucursales: { select: { sucursalid: true, nombre: true } },
                usuarios: { select: { id_usuario: true, nombre_completo: true } },
                pagos: true,
                venta_detalle: {
                    include: {
                        productos: { select: { id_producto: true, nombre: true, categoria: true } },
                        detalle_venta_modificadores: { include: { modificadores: true } }
                    }
                }
            }
        });
        if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
        return res.json(venta);
    } catch (error) {
        console.error('Error al consultar detalle de venta:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar la venta' });
    }
});

router.patch('/:id/estado-pedido', async (req, res) => {
    const puedeGestionarPedidos = req.auth.permisos.has('tomar_pedidos') ||
        req.auth.permisos.has('ver_pedidos_cocina');
    if (!puedeGestionarPedidos) {
        return res.status(403).json({ mensaje: 'No tienes permiso para actualizar pedidos' });
    }
    const idVenta = Number(req.params.id);
    const { estado_pedido } = req.body ?? {};
    if (!Number.isInteger(idVenta) || idVenta <= 0 ||
        !['en_cocina', 'servido', 'cancelado'].includes(estado_pedido)) {
        return res.status(400).json({ mensaje: 'Indica un id válido y un estado permitido' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findFirst({
                where: {
                    id_venta: idVenta,
                    ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
                },
                include: { venta_detalle: { select: { id_producto: true, cantidad: true } } }
            });
            if (!venta) {
                const error = new Error('Venta no encontrada');
                error.codigoHttp = 404;
                throw error;
            }
            const transiciones = {
                abierto: ['en_cocina', 'cancelado'],
                en_cocina: ['servido', 'cancelado']
            };
            if (!transiciones[venta.estado_pedido]?.includes(estado_pedido)) {
                const error = new Error('El pedido no puede cambiar a ese estado');
                error.codigoHttp = 409;
                throw error;
            }
            if (estado_pedido === 'cancelado') {
                const pagos = await tx.pagos.aggregate({
                    where: { id_venta: idVenta },
                    _sum: { monto: true }
                });
                if (Number(pagos._sum.monto ?? 0) > 0) {
                    const error = new Error('No se puede cancelar una venta que ya tiene pagos');
                    error.codigoHttp = 409;
                    throw error;
                }
                await revertirExplosion(tx, venta.venta_detalle, {
                    sucursalid: venta.sucursalid,
                    id_usuario: req.auth.usuario.id_usuario,
                    referencia: `cancelacion:${idVenta}`
                });
            }
            const actualizada = await tx.ventas.updateMany({
                where: { id_venta: idVenta, estado_pedido: venta.estado_pedido },
                data: {
                    estado_pedido,
                    ...(estado_pedido === 'cancelado' ? { estado: 'cancelada' } : {})
                }
            });
            if (actualizada.count !== 1) {
                const error = new Error('El pedido cambió mientras se procesaba la solicitud');
                error.codigoHttp = 409;
                throw error;
            }
        }, { isolationLevel: 'Serializable' });
        const ventaActualizada = await prisma.ventas.findUnique({ where: { id_venta: idVenta } });
        return res.json({ mensaje: 'Estado del pedido actualizado', venta: ventaActualizada });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        if (error instanceof ErrorInventario) {
            return res.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
        }
        console.error('Error al actualizar pedido:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el pedido' });
    }
});

router.post('/:id/pagos', async (req, res) => {
    if (!req.auth.permisos.has('operar_caja')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para registrar pagos de ventas' });
    }
    const idVenta = Number(req.params.id);
    const monto = Number(req.body?.monto);
    const metodoPago = req.body?.metodo_pago;
    const referencia = req.body?.referencia;
    if (!Number.isInteger(idVenta) || idVenta <= 0 || !Number.isFinite(monto) ||
        monto <= 0 || monto > 99999999.99 ||
        typeof metodoPago !== 'string' ||
        !['efectivo', 'tarjeta', 'transferencia', 'link de pago', 'wallet'].includes(metodoPago.trim().toLocaleLowerCase('es')) ||
        (referencia !== undefined && referencia !== null &&
            (typeof referencia !== 'string' || referencia.length > 100))) {
        return res.status(400).json({ mensaje: 'Revisa el monto y los datos del pago' });
    }
    const montoCentavos = Math.round((monto + Number.EPSILON) * 100);
    if (montoCentavos <= 0) {
        return res.status(400).json({ mensaje: 'El pago debe ser mayor que cero' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findFirst({
                where: {
                    id_venta: idVenta,
                    ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
                },
                select: { id_venta: true, total: true, estado: true, estado_pedido: true }
            });
            if (!venta) return { error: 404 };
            if (venta.estado === 'cancelada' || venta.estado_pedido === 'cancelado') {
                return { error: 409 };
            }
            const cajaAbierta = await tx.cajas.findFirst({
                where: { sucursalid: venta.sucursalid, estado: 'abierta' },
                select: { id_caja: true }
            });
            if (!cajaAbierta) return { error: 409 };
            const pagos = await tx.pagos.aggregate({
                where: { id_venta: idVenta },
                _sum: { monto: true }
            });
            const pagadoCentavos = Math.round(Number(pagos._sum.monto ?? 0) * 100);
            const totalCentavos = Math.round(Number(venta.total) * 100);
            if (pagadoCentavos + montoCentavos > totalCentavos) return { error: 409 };

            await tx.pagos.create({
                data: {
                    id_venta: idVenta,
                    metodo_pago: metodoPago.trim(),
                    monto: montoCentavos / 100,
                    referencia_transaccion: referencia?.trim() || null
                }
            });
            const quedoPagada = pagadoCentavos + montoCentavos === totalCentavos;
            const actualizada = await tx.ventas.updateMany({
                where: { id_venta: idVenta, estado: venta.estado, estado_pedido: venta.estado_pedido },
                data: {
                    estado: quedoPagada ? 'pagada' : 'parcial',
                    ...(quedoPagada ? { estado_pedido: 'pagado' } : {})
                }
            });
            if (actualizada.count !== 1) {
                const error = new Error('La venta cambió mientras se registraba el pago');
                error.codigoHttp = 409;
                throw error;
            }
            return { quedoPagada };
        }, { isolationLevel: 'Serializable' });

        if (resultado.error === 404) return res.status(404).json({ mensaje: 'Venta no encontrada' });
        if (resultado.error === 409) return res.status(409).json({ mensaje: 'Se requiere una caja abierta y el pago no puede superar el saldo' });
        const venta = await prisma.ventas.findUnique({
            where: { id_venta: idVenta },
            include: { pagos: { orderBy: { fecha_pago: 'desc' } } }
        });
        return res.status(201).json({ mensaje: 'Pago registrado', venta });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        console.error('Error al registrar pago de venta:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar el pago' });
    }
});

/*Función para calcular el IVA hacia atras (porque ya viene en el precio)*/
function calcularIVA(totalConIva){
//Redondeamosa  2 decimales para evitar problemas con decimales flotantes
const subtotal = Number((totalConIva / 1.13).toFixed(2));
const iva = Number((totalConIva - subtotal).toFixed(2));

return {subtotal, iva};
}

/*Función para generar el siguiente correlativo*/
async function generarCorrelativo(cliente, tipoDocumento){
//Buscamos la última venta de este tipo de documento
const ultimaVenta = await cliente.ventas.findFirst({
    where: {tipo_documento : tipoDocumento},
    orderBy : {id_venta: 'desc'},
    select: { correlativo: true }
});

if(!ultimaVenta){
    //si no hay ventas, empezamos en 1
    return tipoDocumento === 'CCF' ? 'CCF-0001' : 'F-0001';
}

const numeroAnterior = Number(ultimaVenta.correlativo.split('-').at(-1));
if (!Number.isSafeInteger(numeroAnterior) || numeroAnterior < 0) {
    throw new Error(`El correlativo existente no es válido: ${ultimaVenta.correlativo}`);
}
const numero = numeroAnterior + 1;
const numeroFormateado = numero.toString().padStart(4, '0');

return `${tipoDocumento === 'CCF' ? 'CCF' : 'F'}-${numeroFormateado}`;
}

/*Endpoint de ventas*/
router.post('/', requerirPermiso('tomar_pedidos'), async (req, res) => {
    try {
        const {
            tipoDocumento,
            productos,
            id_cliente,
            nombre_cliente,
            mesaid,
            sucursalid: sucursalSolicitada,
            notas_generales,
            pagoPendiente = true
        } = req.body ?? {};
        const id_usuario = req.auth.usuario.id_usuario;
        const sucursalid = req.auth.usuario.sucursalid ??
            (req.auth.permisos.has('gestionar_sucursales') ? Number(sucursalSolicitada) : null);

        if (typeof tipoDocumento !== 'string' || !tipoDocumento.trim() || tipoDocumento.length > 30) {
            return res.status(400).json({ mensaje: 'tipoDocumento es obligatorio y no debe exceder 30 caracteres' });
        }
        if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
            return res.status(400).json({ mensaje: 'id_usuario debe ser un entero positivo' });
        }
        if (typeof nombre_cliente !== 'string' || !nombre_cliente.trim() || nombre_cliente.trim().length > 150) {
            return res.status(400).json({ mensaje: 'El nombre del cliente es obligatorio y no debe exceder 150 caracteres' });
        }
        if ((id_cliente !== undefined && id_cliente !== null &&
                (!Number.isInteger(id_cliente) || id_cliente <= 0)) ||
            (mesaid !== undefined && mesaid !== null && (!Number.isInteger(mesaid) || mesaid <= 0)) ||
            pagoPendiente !== true ||
            !Number.isInteger(sucursalid) || sucursalid <= 0 ||
            (notas_generales !== undefined && notas_generales !== null &&
                (typeof notas_generales !== 'string' || notas_generales.length > 255))) {
            return res.status(400).json({ mensaje: 'Los datos del cliente, mesa o nota no son válidos' });
        }

        let productosNormalizados;
        try {
            productosNormalizados = normalizarProductosVenta(productos);
        } catch (error) {
            if (error instanceof ErrorInventario) {
                return res.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
            }
            throw error;
        }

        const { nuevaVenta, inventario } = await prisma.$transaction(async (tx) => {
            const usuario = await tx.usuarios.findFirst({
                where: { id_usuario, activo: true },
                select: { id_usuario: true }
            });
            if (!usuario) {
                const error = new Error('El usuario no existe o está inactivo');
                error.codigoHttp = 404;
                throw error;
            }
            if (!await tx.sucursales.findFirst({
                where: { sucursalid, activo: true },
                select: { sucursalid: true }
            })) {
                const error = new Error('La sucursal no existe o está inactiva');
                error.codigoHttp = 400;
                throw error;
            }

            const productosDB = await tx.productos.findMany({
                where: {
                    id_producto: { in: productosNormalizados.map((item) => item.id_producto) },
                    activo: true
                },
                select: { id_producto: true, precio_venta: true }
            });
            const productosPorId = new Map(productosDB.map((producto) => [producto.id_producto, producto]));
            const idsNoEncontrados = productosNormalizados
                .filter((item) => !productosPorId.has(item.id_producto))
                .map((item) => item.id_producto);
            if (idsNoEncontrados.length > 0) {
                const error = new Error(`Los productos con id ${idsNoEncontrados.join(', ')} no existen`);
                error.codigoHttp = 404;
                throw error;
            }

            const idsModificadores = Array.from(new Set(
                productosNormalizados.flatMap((producto) =>
                    producto.modificadores.map((modificador) => modificador.modificadorid))
            ));
            const modificadoresDB = idsModificadores.length > 0
                ? await tx.modificadores.findMany({
                    where: { modificadorid: { in: idsModificadores }, activo: true },
                    select: { modificadorid: true, precio: true }
                })
                : [];
            const modificadoresPorId = new Map(modificadoresDB.map((modificador) => [
                modificador.modificadorid, modificador
            ]));
            const idsModificadoresNoEncontrados = idsModificadores.filter(
                (id) => !modificadoresPorId.has(id)
            );
            if (idsModificadoresNoEncontrados.length > 0) {
                const error = new Error(
                    `Los modificadores con id ${idsModificadoresNoEncontrados.join(', ')} no existen o están inactivos`
                );
                error.codigoHttp = 404;
                throw error;
            }

            const detallesParaGuardar = productosNormalizados.map((item) => {
                const precioEnCentavos = Math.round(Number(productosPorId.get(item.id_producto).precio_venta) * 100);
                const modificadores = item.modificadores.map(({ modificadorid }) => ({
                    modificadorid,
                    precio_aplicado: Number(modificadoresPorId.get(modificadorid).precio)
                }));
                const precioModificadoresEnCentavos = modificadores.reduce(
                    (total, modificador) =>
                        total + Math.round(modificador.precio_aplicado * 100),
                    0
                );
                const subtotalEnCentavos =
                    (precioEnCentavos + precioModificadoresEnCentavos) * item.cantidad;
                return {
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    precio_unitario: precioEnCentavos / 100,
                    subtotal_linea: subtotalEnCentavos / 100,
                    detalle_venta_modificadores: {
                        create: modificadores
                    }
                };
            });
            const totalEnCentavos = detallesParaGuardar.reduce(
                (acumulado, detalle) => acumulado + Math.round(detalle.subtotal_linea * 100), 0
            );
            const totalBruto = totalEnCentavos / 100;
            const { subtotal, iva } = calcularIVA(totalBruto);
            if (totalBruto <= 0) {
                const error = new Error('El total de la venta debe ser mayor que cero');
                error.codigoHttp = 400;
                throw error;
            }
            const correlativo = await generarCorrelativo(tx, tipoDocumento.trim());
            if (id_cliente !== undefined && id_cliente !== null &&
                !await tx.clientes.findUnique({ where: { id_cliente }, select: { id_cliente: true } })) {
                const error = new Error('El cliente no existe');
                error.codigoHttp = 404;
                throw error;
            }
            if (mesaid !== undefined && mesaid !== null) {
                const mesa = await tx.mesas.findUnique({
                    where: { mesaid },
                    select: { sucursalid: true, estado: true }
                });
                if (!mesa || mesa.sucursalid !== sucursalid || mesa.estado === 'inactiva') {
                    const error = new Error('La mesa no existe o no pertenece a tu sucursal');
                    error.codigoHttp = 404;
                    throw error;
                }
            }

            const venta = await tx.ventas.create({
                data: {
                    id_cliente: id_cliente ?? null,
                    id_usuario,
                    sucursalid,
                    mesaid: mesaid ?? null,
                    nombre_cliente: nombre_cliente.trim(),
                    tipo_documento: tipoDocumento.trim(),
                    correlativo,
                    subtotal,
                    iva,
                    total: totalBruto,
                    estado: 'pendiente',
                    estado_pedido: 'abierto',
                    notas_generales: notas_generales?.trim() || null,
                    venta_detalle: { create: detallesParaGuardar }
                }
            });

            const resultadoInventario = await ejecutarExplosion(tx, productosNormalizados, {
                sucursalid,
                id_usuario,
                referencia: `venta:${venta.id_venta}`
            });
            return { nuevaVenta: venta, inventario: resultadoInventario };
        }, { isolationLevel: 'Serializable' });

        return res.status(201).json({
            mensaje: 'Venta registrada exitosamente',
            id_venta: nuevaVenta.id_venta,
            correlativo: nuevaVenta.correlativo,
            total: nuevaVenta.total,
            estado_pedido: nuevaVenta.estado_pedido,
            inventario
        });
    } catch (error) {
        if (error instanceof ErrorInventario) {
            return res.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
        }
        if (error.codigoHttp) {
            return res.status(error.codigoHttp).json({ mensaje: error.message });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ mensaje: 'El correlativo de la venta ya existe; intente de nuevo' });
        }
        console.error('Error al registrar venta:', error);
        return res.status(500).json({ mensaje: 'Error interno al registrar la venta' });
    }
});

router.post('/:id/productos', requerirPermiso('tomar_pedidos'), async (req, res) => {
    const idVenta = Number(req.params.id);
    if (!Number.isInteger(idVenta) || idVenta <= 0) {
        return res.status(400).json({ mensaje: 'El id de venta no es válido' });
    }

    let productosNormalizados;
    try {
        productosNormalizados = normalizarProductosVenta(req.body?.productos);
    } catch (error) {
        if (error instanceof ErrorInventario) {
            return res.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
        }
        throw error;
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findFirst({
                where: {
                    id_venta: idVenta,
                    ...(req.auth.usuario.sucursalid ? { sucursalid: req.auth.usuario.sucursalid } : {})
                },
                include: {
                    venta_detalle: {
                        include: { detalle_venta_modificadores: { select: { modificadorid: true, precio_aplicado: true } } }
                    }
                }
            });
            if (!venta) {
                const error = new Error('Pedido no encontrado');
                error.codigoHttp = 404;
                throw error;
            }
            if (!['pendiente', 'parcial'].includes(venta.estado) ||
                !['abierto', 'en_cocina', 'servido'].includes(venta.estado_pedido)) {
                const error = new Error('El pedido no admite cambios');
                error.codigoHttp = 409;
                throw error;
            }

            const idsProducto = productosNormalizados.map((item) => item.id_producto);
            const productosDb = await tx.productos.findMany({
                where: { id_producto: { in: idsProducto }, activo: true },
                select: { id_producto: true, precio_venta: true }
            });
            const productosPorId = new Map(productosDb.map((producto) => [producto.id_producto, producto]));
            if (productosPorId.size !== idsProducto.length) {
                const error = new Error('Uno o más productos no existen o están inactivos');
                error.codigoHttp = 404;
                throw error;
            }

            const idsModificador = [...new Set(productosNormalizados.flatMap((item) =>
                item.modificadores.map(({ modificadorid }) => modificadorid)))];
            const modificadoresDb = idsModificador.length > 0
                ? await tx.modificadores.findMany({
                    where: { modificadorid: { in: idsModificador }, activo: true },
                    select: { modificadorid: true, precio: true }
                })
                : [];
            const modificadoresPorId = new Map(modificadoresDb.map((item) => [item.modificadorid, item]));
            if (modificadoresPorId.size !== idsModificador.length) {
                const error = new Error('Uno o más modificadores no existen o están inactivos');
                error.codigoHttp = 400;
                throw error;
            }

            const detalleExistente = new Map(venta.venta_detalle.map((linea) => [linea.id_producto, linea]));
            let diferenciaCentavos = 0;
            for (const item of productosNormalizados) {
                const lineaExistente = detalleExistente.get(item.id_producto);
                const idsSolicitados = item.modificadores.map(({ modificadorid }) => modificadorid).sort((a, b) => a - b);
                let precioUnidadCentavos;
                let modificadoresLinea;

                if (lineaExistente) {
                    const idsExistentes = lineaExistente.detalle_venta_modificadores
                        .map(({ modificadorid }) => modificadorid).sort((a, b) => a - b);
                    if (idsExistentes.length !== idsSolicitados.length ||
                        idsExistentes.some((id, indice) => id !== idsSolicitados[indice])) {
                        const error = new Error('El producto ya está en el pedido con otros modificadores');
                        error.codigoHttp = 409;
                        throw error;
                    }
                    precioUnidadCentavos = Math.round(Number(lineaExistente.precio_unitario) * 100);
                    modificadoresLinea = lineaExistente.detalle_venta_modificadores.map((item) =>
                        Math.round(Number(item.precio_aplicado) * 100));
                    const nuevoSubtotalCentavos = (precioUnidadCentavos +
                        modificadoresLinea.reduce((total, precio) => total + precio, 0)) *
                        (lineaExistente.cantidad + item.cantidad);
                    diferenciaCentavos += nuevoSubtotalCentavos -
                        Math.round(Number(lineaExistente.subtotal_linea) * 100);
                    await tx.venta_detalle.update({
                        where: { id_venta_id_producto: { id_venta: idVenta, id_producto: item.id_producto } },
                        data: {
                            cantidad: { increment: item.cantidad },
                            subtotal_linea: nuevoSubtotalCentavos / 100
                        }
                    });
                    continue;
                }

                precioUnidadCentavos = Math.round(Number(productosPorId.get(item.id_producto).precio_venta) * 100);
                const modificadoresNuevos = item.modificadores.map(({ modificadorid }) => ({
                    modificadorid,
                    precio_aplicado: Number(modificadoresPorId.get(modificadorid).precio)
                }));
                modificadoresLinea = modificadoresNuevos.map(({ precio_aplicado }) =>
                    Math.round(precio_aplicado * 100));
                const subtotalLineaCentavos = (precioUnidadCentavos +
                    modificadoresLinea.reduce((total, precio) => total + precio, 0)) * item.cantidad;
                diferenciaCentavos += subtotalLineaCentavos;
                await tx.venta_detalle.create({
                    data: {
                        id_venta: idVenta,
                        id_producto: item.id_producto,
                        cantidad: item.cantidad,
                        precio_unitario: precioUnidadCentavos / 100,
                        subtotal_linea: subtotalLineaCentavos / 100,
                        detalle_venta_modificadores: { create: modificadoresNuevos }
                    }
                });
            }

            const totalCentavos = Math.round(Number(venta.total) * 100) + diferenciaCentavos;
            if (totalCentavos <= 0 || totalCentavos > 9999999999) {
                const error = new Error('El total excede el límite permitido');
                error.codigoHttp = 400;
                throw error;
            }
            const total = totalCentavos / 100;
            const { subtotal, iva } = calcularIVA(total);
            const pagos = await tx.pagos.aggregate({
                where: { id_venta: idVenta },
                _sum: { monto: true }
            });
            const estado = Number(pagos._sum.monto ?? 0) > 0 ? 'parcial' : 'pendiente';

            const inventario = await ejecutarExplosion(tx, productosNormalizados, {
                sucursalid: venta.sucursalid,
                id_usuario: req.auth.usuario.id_usuario,
                referencia: `pedido-adicional:${idVenta}`
            });
            await tx.ventas.update({
                where: { id_venta: idVenta },
                data: { subtotal, iva, total, estado }
            });
            return { total, inventario };
        }, { isolationLevel: 'Serializable' });

        return res.json({ mensaje: 'Productos agregados al pedido', total: resultado.total, inventario: resultado.inventario });
    } catch (error) {
        if (error.codigoHttp) return res.status(error.codigoHttp).json({ mensaje: error.message });
        if (error instanceof ErrorInventario) {
            return res.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
        }
        console.error('Error al agregar productos al pedido:', error);
        return res.status(500).json({ mensaje: 'No se pudieron agregar productos al pedido' });
    }
});

export default router;
