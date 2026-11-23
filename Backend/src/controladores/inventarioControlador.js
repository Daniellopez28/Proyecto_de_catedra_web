//importamos el cliente de prisma y configuracion de los servicios de inventario
import prisma from '../config/prisma.js';
import {
    ErrorInventario,
    resolverSucursalInventario,
    normalizarProductosVenta,
    ejecutarExplosion,
    simularExplosion,
    obtenerAlertasStock,
    listarInsumos,
    obtenerRecetas
} from '../servicios/inventarioServicio.js';

//funcion para redondear valores a un numero especifico de decimales, en este caso 2
function redondear(valor, decimales = 2) {
    const factor = 10 ** decimales;
    return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
}

//Funcion de manejo de errores para el modulo de inventario.
function manejarError(error, respuesta) {
    if (error instanceof ErrorInventario) {
        return respuesta.status(error.codigoHttp).json({ mensaje: error.message, detalle: error.detalle });
    }
    console.error('Error inesperado en el módulo de inventario:', error);
    return respuesta.status(500).json({ mensaje: 'Error interno del servidor', detalle: null });
}

//export que devuelve el inventario de insumos y productos, sus cantidades y precios
export async function explotarMateriales(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.body?.sucursalid);
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        // tx: si algún insumo falla, no se descuenta ninguno (todo o nada).
        const resultado = await prisma.$transaction((tx) => ejecutarExplosion(tx, productosVenta, {
            sucursalid: Number(sucursalid),
            id_usuario: peticion.auth.usuario.id_usuario,
            referencia: 'explosion-manual'
        }));
        return respuesta.status(200).json({ mensaje: 'Inventario descontado correctamente', ...resultado });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que devuelve las alertas de stock de insumos y productos.
export async function simularExplosionMateriales(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.body?.sucursalid);
        const productosVenta = normalizarProductosVenta(peticion.body?.productos);
        return respuesta.status(200).json(await simularExplosion(prisma, productosVenta, {
            sucursalid: Number(sucursalid)
        }));
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Export que devuelve la alerta si el stock es bajo 
export async function consultarAlertasStock(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.query.sucursalid);
        const alertas = await obtenerAlertasStock(prisma, sucursalid);
        return respuesta.status(200).json({ total: alertas.length, alertas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Devuelve el inventario y stock
export async function consultarInsumos(peticion, respuesta) {
    try {
        const sucursalid = await resolverSucursal(peticion, peticion.query.sucursalid);
        const insumos = await listarInsumos(prisma, sucursalid);
        return respuesta.status(200).json({ total: insumos.length, insumos });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Devuelve el catalogo de insumos activos, sin importar la sucursal
export async function consultarCatalogoInsumos(_peticion, respuesta) {
    try {
        const insumos = await prisma.insumos.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            select: { id_insumo: true, nombre: true, unidad_medida: true }
        });
        return respuesta.status(200).json({ total: insumos.length, insumos });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Devuelve el catalogo de las recetas activas
export async function consultarRecetas(peticion, respuesta) {
    try {
        const recetas = await obtenerRecetas(prisma);
        return respuesta.status(200).json({ total: recetas.length, recetas });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Devuelve la receta de un producto especifico
export async function consultarRecetaDeProducto(peticion, respuesta) {
    try {
        const idProducto = Number(peticion.params.id_producto);
        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            throw new ErrorInventario('El id_producto de la dirección debe ser un entero positivo', 400);
        }
        const [receta] = await obtenerRecetas(prisma, idProducto);
        return respuesta.status(200).json(receta);
    } catch (error) {
        return manejarError(error, respuesta);
    }
}

//Funcion para validar que un valor sea un entero positivo, devuelve null si no lo es
function enteroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

//Funcion para resolver la sucursal activa del usuario, valida que exista y este activa
async function resolverSucursal(peticion, valor) {
    const sucursalid = resolverSucursalInventario(
        peticion.auth.usuario,
        peticion.auth.permisos,
        valor
    );
    const sucursalActiva = await prisma.sucursales.findFirst({
        where: { sucursalid, activo: true },
        select: { sucursalid: true }
    });
    if (!sucursalActiva) throw new ErrorInventario('La sucursal no existe o está inactiva', 404);
    return sucursalActiva.sucursalid;
}

//Export que registra un insumo en todas las sucursales activas
export async function registrarInsumo(peticion, respuesta) {
    const { nombre, unidad_medida, stock_minimo = 0, costo_promedio = 0 } = peticion.body ?? {};
    const minimo = redondear(stock_minimo);
    const costo = redondear(costo_promedio, 4);
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100 ||
        typeof unidad_medida !== 'string' || !unidad_medida.trim() || unidad_medida.length > 20 ||
        !Number.isFinite(minimo) || minimo < 0 || minimo > 99999999.99 ||
        !Number.isFinite(costo) || costo < 0 || costo > 999999.9999) {
        return respuesta.status(400).json({ mensaje: 'Revisa el nombre, unidad, mínimo y costo del insumo' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const sucursales = await tx.sucursales.findMany({
                where: { activo: true },
                select: { sucursalid: true }
            });
            if (sucursales.length === 0) {
                const error = new Error('No hay sucursales activas para crear el inventario');
                error.codigoHttp = 409;
                throw error;
            }
            const insumo = await tx.insumos.create({
                data: {
                    nombre: nombre.trim(),
                    unidad_medida: unidad_medida.trim(),
                    stock_actual: 0,
                    stock_minimo: minimo,
                    costo_promedio: costo
                }
            });
            await tx.inventario_sucursal.createMany({
                data: sucursales.map(({ sucursalid }) => ({
                    sucursalid,
                    insumoid: insumo.id_insumo,
                    stock_actual: 0,
                    stock_minimo: minimo
                }))
            });
            return insumo;
        });
        return respuesta.status(201).json({ mensaje: 'Insumo creado en las sucursales activas', insumo: resultado });
    } catch (error) {
        if (error.codigoHttp) return respuesta.status(error.codigoHttp).json({ mensaje: error.message });
        if (error.code === 'P2002') return respuesta.status(409).json({ mensaje: 'Ya existe un insumo con ese nombre' });
        return manejarError(error, respuesta);
    }
}

//export que actualiza los datos de un insumo.
export async function actualizarInsumo(peticion, respuesta) {
    const idInsumo = enteroPositivo(peticion.params.id);
    const { nombre, unidad_medida, stock_minimo, costo_promedio, activo } = peticion.body ?? {};
    if (!idInsumo ||
        [nombre, unidad_medida, stock_minimo, costo_promedio, activo].every((valor) => valor === undefined) ||
        (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100)) ||
        (unidad_medida !== undefined &&
            (typeof unidad_medida !== 'string' || !unidad_medida.trim() || unidad_medida.length > 20)) ||
        (stock_minimo !== undefined &&
            (!Number.isFinite(Number(stock_minimo)) || Number(stock_minimo) < 0 || Number(stock_minimo) > 99999999.99)) ||
        (costo_promedio !== undefined &&
            (!Number.isFinite(Number(costo_promedio)) || Number(costo_promedio) < 0 ||
                Number(costo_promedio) > 999999.9999)) ||
        (activo !== undefined && typeof activo !== 'boolean')) {
        return respuesta.status(400).json({ mensaje: 'Revisa el id y los campos del insumo' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const insumo = await tx.insumos.update({
                where: { id_insumo: idInsumo },
                data: {
                    ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
                    ...(unidad_medida !== undefined ? { unidad_medida: unidad_medida.trim() } : {}),
                    ...(stock_minimo !== undefined ? { stock_minimo: Number(stock_minimo) } : {}),
                    ...(costo_promedio !== undefined ? { costo_promedio: Number(costo_promedio) } : {}),
                    ...(activo !== undefined ? { activo } : {})
                }
            });
            if (stock_minimo !== undefined) {
                await tx.inventario_sucursal.updateMany({
                    where: { insumoid: idInsumo },
                    data: { stock_minimo: Number(stock_minimo) }
                });
            }
            return insumo;
        });
        return respuesta.json({ mensaje: 'Insumo actualizado', insumo: resultado });
    } catch (error) {
        if (error.code === 'P2025') return respuesta.status(404).json({ mensaje: 'Insumo no encontrado' });
        if (error.code === 'P2002') return respuesta.status(409).json({ mensaje: 'Ya existe un insumo con ese nombre' });
        return manejarError(error, respuesta);
    }
}

//Export que ajusta el inventario de un insumo en una sucursal
export async function ajustarInventario(peticion, respuesta) {
    const { id_insumo, tipo_movimiento, cantidad, stock_nuevo, stock_minimo, referencia, sucursalid } =
        peticion.body ?? {};
    const idInsumo = enteroPositivo(id_insumo);
    let sucursal;
    try {
        sucursal = await resolverSucursal(peticion, sucursalid);
    } catch (error) {
        return manejarError(error, respuesta);
    }
    const cantidadMovimiento = redondear(cantidad);
    const stockNuevoSolicitado = redondear(stock_nuevo);
    const minimoSolicitado = stock_minimo === undefined ? undefined : redondear(stock_minimo);
    if (!idInsumo || !enteroPositivo(sucursal) ||
        !['entrada', 'salida', 'ajuste'].includes(tipo_movimiento) ||
        (tipo_movimiento === 'ajuste'
            ? !Number.isFinite(stockNuevoSolicitado) || stockNuevoSolicitado < 0
            : !Number.isFinite(cantidadMovimiento) || cantidadMovimiento <= 0) ||
        (stock_minimo !== undefined &&
            (!Number.isFinite(Number(stock_minimo)) || minimoSolicitado < 0 ||
                minimoSolicitado > 99999999.99)) ||
        (referencia !== undefined && referencia !== null &&
            (typeof referencia !== 'string' || referencia.length > 100))) {
        return respuesta.status(400).json({ mensaje: 'Revisa los datos del ajuste de inventario' });
    }

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const [sucursalActiva, insumo] = await Promise.all([
                tx.sucursales.findFirst({
                    where: { sucursalid: Number(sucursal), activo: true },
                    select: { sucursalid: true }
                }),
                tx.insumos.findFirst({
                    where: { id_insumo: idInsumo, activo: true },
                    select: { id_insumo: true, nombre: true, stock_actual: true, stock_minimo: true }
                })
            ]);
            if (!sucursalActiva || !insumo) {
                const error = new Error(!insumo ? 'El insumo no existe o está inactivo' : 'La sucursal no está activa');
                error.codigoHttp = 404;
                throw error;
            }

            const actual = await tx.inventario_sucursal.findUnique({
                where: {
                    sucursalid_insumoid: {
                        sucursalid: Number(sucursal),
                        insumoid: idInsumo
                    }
                }
            });
            const stockAnterior = Number(actual?.stock_actual ?? 0);
            const stockNuevo = tipo_movimiento === 'entrada'
                ? stockAnterior + cantidadMovimiento
                : tipo_movimiento === 'salida'
                    ? stockAnterior - cantidadMovimiento
                    : stockNuevoSolicitado;
            if (stockNuevo < 0 || stockNuevo > 99999999.99) {
                const error = new Error(stockNuevo < 0
                    ? 'La salida supera el inventario disponible'
                    : 'El stock supera el máximo permitido');
                error.codigoHttp = 409;
                throw error;
            }

            if (!actual) {
                if (tipo_movimiento === 'salida') {
                    const error = new Error('No existe inventario para esa sucursal e insumo');
                    error.codigoHttp = 409;
                    throw error;
                }
                await tx.inventario_sucursal.create({
                    data: {
                        sucursalid: Number(sucursal),
                        insumoid: idInsumo,
                        stock_actual: stockNuevo,
                        stock_minimo: minimoSolicitado ?? Number(insumo.stock_minimo ?? 0)
                    }
                });
            } else {
                const data = { stock_actual: stockNuevo };
                if (stock_minimo !== undefined) data.stock_minimo = minimoSolicitado;
                const actualizado = await tx.inventario_sucursal.updateMany({
                    where: {
                        sucursalid: Number(sucursal),
                        insumoid: idInsumo,
                        ...(tipo_movimiento === 'salida' ? { stock_actual: { gte: cantidadMovimiento } } : {})
                    },
                    data
                });
                if (actualizado.count !== 1) {
                    const error = new Error('El inventario cambió mientras se procesaba el ajuste');
                    error.codigoHttp = 409;
                    throw error;
                }
            }

            const diferencia = Math.abs(stockNuevo - stockAnterior);
            if (diferencia === 0) {
                const error = new Error('El ajuste no modifica el inventario');
                error.codigoHttp = 400;
                throw error;
            }
            const agregado = await tx.inventario_sucursal.aggregate({
                where: { insumoid: idInsumo },
                _sum: { stock_actual: true }
            });
            await tx.insumos.update({
                where: { id_insumo: idInsumo },
                data: { stock_actual: Number(agregado._sum.stock_actual ?? 0) }
            });
            await tx.movimientos_inventario.create({
                data: {
                    sucursalid: Number(sucursal),
                    insumoid: idInsumo,
                    tipo_movimiento,
                    cantidad: diferencia,
                    referencia: referencia?.trim() || 'ajuste manual',
                    id_usuario: peticion.auth.usuario.id_usuario
                }
            });
            return tx.inventario_sucursal.findUnique({
                where: {
                    sucursalid_insumoid: {
                        sucursalid: Number(sucursal),
                        insumoid: idInsumo
                    }
                },
                include: { insumos: { select: { nombre: true, unidad_medida: true } } }
            });
        }, { isolationLevel: 'Serializable' });
        return respuesta.json({ mensaje: 'Inventario actualizado', inventario: resultado });
    } catch (error) {
        if (error.codigoHttp) return respuesta.status(error.codigoHttp).json({ mensaje: error.message });
        return manejarError(error, respuesta);
    }
}

//export que devuelve los movimientos de inventario de una sucursal
export async function consultarMovimientosInventario(peticion, respuesta) {
    const idInsumo = peticion.query.id_insumo === undefined
        ? null
        : enteroPositivo(peticion.query.id_insumo);
    const limite = Number(peticion.query.limite ?? 50);
    if ((peticion.query.id_insumo !== undefined && !idInsumo) ||
        !Number.isInteger(limite) || limite < 1 || limite > 200) {
        return respuesta.status(400).json({ mensaje: 'Revisa el filtro y el límite de resultados' });
    }

    try {
        const sucursal = await resolverSucursal(peticion, peticion.query.sucursalid);
        const movimientos = await prisma.movimientos_inventario.findMany({
            where: {
                sucursalid: Number(sucursal),
                ...(idInsumo ? { insumoid: idInsumo } : {})
            },
            orderBy: { fecha: 'desc' },
            take: limite,
            include: {
                insumos: { select: { nombre: true, unidad_medida: true } },
                sucursales: { select: { nombre: true } },
                usuarios: { select: { nombre_completo: true } }
            }
        });
        return respuesta.json({
            total: movimientos.length,
            movimientos: movimientos.map((movimiento) => ({
                ...movimiento,
                movimientoid: String(movimiento.movimientoid)
            }))
        });
    } catch (error) {
        return manejarError(error, respuesta);
    }
}