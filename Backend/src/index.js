import enrutadorInventario from './rutas/inventarioRutas.js';
import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';
import planilla_routes from './routes/planilla.routes.js';
import {
    ErrorInventario,
    ejecutarExplosion,
    revertirExplosion,
    normalizarProductosVenta
} from './servicios/inventarioServicio.js';
import empleadosRoutes from './routes/empleados.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import cajaRoutes from './routes/caja.routes.js';
import productosRoutes from './routes/productos.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import comprasRoutes from './routes/compras.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import mesasRoutes from './routes/mesas.routes.js';
import modificadoresRoutes from './routes/modificadores.routes.js';
import administracionRoutes from './routes/administracion.routes.js';
import {
    etiquetaSucursalEmpleado,
    nombresBaseSucursalesEmpleados,
    sucursalesEmpleados
} from './constants/sucursalesEmpleados.js';
import {
    cerrarSesion,
    crearSesion,
    requerirAutenticacion,
    requerirPermiso
} from './middleware/autenticacion.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/planillas', planilla_routes);
app.use('/api/empleados', requerirAutenticacion, empleadosRoutes);
app.use('/api/reservas', requerirAutenticacion, reservasRoutes);
app.use('/api/caja', requerirAutenticacion, cajaRoutes);
app.use('/api/productos', requerirAutenticacion, productosRoutes);
app.use('/api/compras', requerirAutenticacion, comprasRoutes);
app.use('/api/proveedores', requerirAutenticacion, proveedoresRoutes);
app.use('/api/reportes', requerirAutenticacion, reportesRoutes);
app.use('/api/usuarios', requerirAutenticacion, usuariosRoutes);
app.use('/api/mesas', requerirAutenticacion, mesasRoutes);
app.use('/api/modificadores', requerirAutenticacion, modificadoresRoutes);
app.use('/api/administracion', requerirAutenticacion, administracionRoutes);

app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1 AS disponible`;
        return res.status(200).json({ estado: 'ok', base_datos: 'conectada' });
    } catch (error) {
        console.error('No se pudo consultar la base de datos:', error);
        return res.status(503).json({ estado: 'error', base_datos: 'no disponible' });
    }
});

app.get('/api/sucursales', async (_req, res) => {
    try {
        const sucursales = await prisma.sucursales.findMany({
            where: {
                activo: true,
                nombre: { in: nombresBaseSucursalesEmpleados }
            },
            select: { sucursalid: true, nombre: true }
        });
        const porNombre = new Map(sucursales.map((sucursal) => [
            sucursal.nombre.trim().toLocaleLowerCase('es-SV'),
            sucursal
        ]));
        return res.json({
            sucursales: sucursalesEmpleados.flatMap((sucursal) => {
                const encontrada = porNombre.get(sucursal.nombreBase);
                return encontrada
                    ? [{
                        sucursalid: encontrada.sucursalid,
                        nombre: etiquetaSucursalEmpleado(encontrada.nombre)
                    }]
                    : [];
            })
        });
    } catch (error) {
        console.error('Error al consultar sucursales para iniciar sesión:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las sucursales' });
    }
});

//Rutas de ventas
app.get('/', (req, res) =>{
    res.send('API del Restaurante Orígenes SV - Módulo de Ventas funcionando');
});

app.get('/api/ventas', requerirAutenticacion, async (req, res) => {
    const puedeVerVentas = req.auth.permisos.has('ver_ventas');
    const puedeVerCocina = req.auth.permisos.has('ver_pedidos_cocina');
    if (!puedeVerVentas && !puedeVerCocina) {
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
            ...(!puedeVerVentas ? { estado_pedido: { in: ['abierto', 'en_cocina', 'servido'] } } : {})
        };
        const [total, ventas] = await prisma.$transaction([
            prisma.ventas.count({ where }),
            prisma.ventas.findMany({
                where,
                orderBy: { fecha_hora: 'desc' },
                skip: (pagina - 1) * limite,
                take: limite,
                include: {
                    clientes: { select: { id_cliente: true, nombre: true } },
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

app.get('/api/ventas/:id', requerirAutenticacion, async (req, res) => {
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

app.patch('/api/ventas/:id/estado-pedido', requerirAutenticacion, async (req, res) => {
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

app.post('/api/ventas/:id/pagos', requerirAutenticacion, async (req, res) => {
    if (!req.auth.permisos.has('tomar_pedidos') && !req.auth.permisos.has('operar_caja')) {
        return res.status(403).json({ mensaje: 'No tienes permiso para registrar pagos de ventas' });
    }
    const idVenta = Number(req.params.id);
    const monto = Number(req.body?.monto);
    const metodoPago = req.body?.metodo_pago;
    const referencia = req.body?.referencia;
    if (!Number.isInteger(idVenta) || idVenta <= 0 || !Number.isFinite(monto) ||
        monto <= 0 || monto > 99999999.99 ||
        typeof metodoPago !== 'string' || !metodoPago.trim() || metodoPago.length > 50 ||
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
        if (resultado.error === 409) return res.status(409).json({ mensaje: 'El pago supera el saldo o la venta no acepta pagos' });
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

// Módulo Inventario y Recetas (Carlos)
app.use('/api/inventario', requerirAutenticacion, enrutadorInventario);

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
app.post('/api/ventas', requerirAutenticacion, requerirPermiso('tomar_pedidos'), async (req, res) => {
    try {
        const {
            tipoDocumento,
            productos,
            metodoPago,
            referenciaPago,
            id_cliente,
            mesaid,
            sucursalid: sucursalSolicitada,
            notas_generales,
            pagoPendiente = false
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
        if (metodoPago !== undefined && (typeof metodoPago !== 'string' || metodoPago.length > 50)) {
            return res.status(400).json({ mensaje: 'metodoPago debe ser texto de hasta 50 caracteres' });
        }
        if (referenciaPago !== undefined && referenciaPago !== null &&
            (typeof referenciaPago !== 'string' || referenciaPago.length > 100)) {
            return res.status(400).json({ mensaje: 'referenciaPago debe ser texto de hasta 100 caracteres' });
        }
        if ((id_cliente !== undefined && id_cliente !== null &&
                (!Number.isInteger(id_cliente) || id_cliente <= 0)) ||
            (mesaid !== undefined && mesaid !== null && (!Number.isInteger(mesaid) || mesaid <= 0)) ||
            typeof pagoPendiente !== 'boolean' ||
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
                    tipo_documento: tipoDocumento.trim(),
                    correlativo,
                    subtotal,
                    iva,
                    total: totalBruto,
                    estado: pagoPendiente ? 'pendiente' : 'pagada',
                    estado_pedido: pagoPendiente ? 'abierto' : 'pagado',
                    notas_generales: notas_generales?.trim() || null,
                    venta_detalle: { create: detallesParaGuardar }
                }
            });

            if (!pagoPendiente) {
                await tx.pagos.create({
                    data: {
                        id_venta: venta.id_venta,
                        metodo_pago: metodoPago?.trim() || 'Efectivo',
                        monto: totalBruto,
                        referencia_transaccion: referenciaPago?.trim() || null
                    }
                });
            }

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

/*Endpoint para iniciar sesión*/
app.post('/api/login', async (req,res) => {
    try{
        /*1. Recibir el correo y la contraseña que manda React*/
        const {correo, password, sucursalid }= req.body ?? {};
        const idSucursal = Number(sucursalid);

        /*2.Validamos que no venga vacío*/
        if(typeof correo !== 'string' || !correo.trim() || typeof password !== 'string' || !password ||
            !Number.isInteger(idSucursal) || idSucursal <= 0){
            return res.status(400).json({mensaje: 'El usuario, la contraseña y una sucursal válida son obligatorios'});
        }

        const sucursalSeleccionada = await prisma.sucursales.findFirst({
            where: {
                sucursalid: idSucursal,
                activo: true,
                nombre: { in: nombresBaseSucursalesEmpleados }
            },
            select: { sucursalid: true }
        });
        if (!sucursalSeleccionada) {
            return res.status(400).json({ mensaje: 'Selecciona una de las sucursales disponibles' });
        }

        /*3. El procedimiento valida el hash con salt y registra el ultimo acceso*/
        let [usuarioEncontrado] = await prisma.$queryRaw`
            EXEC dbo.sp_login_empleado
                @identificador = ${correo.trim()},
                @password = ${password},
                @sucursalid = ${sucursalSeleccionada.sucursalid}
        `;

        const cuentaEmpleado = !usuarioEncontrado && correo.includes('@')
            ? await prisma.usuarios.findFirst({
                where: { correo: correo.trim(), id_empleado: { not: null } },
                select: { id_usuario: true }
            })
            : null;
        if (!usuarioEncontrado && !cuentaEmpleado && correo.includes('@')) {
            [usuarioEncontrado] = await prisma.$queryRaw`
                EXEC dbo.sp_login_cliente @correo = ${correo.trim()}, @password = ${password}
            `;
        }

        if(!usuarioEncontrado){
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas o usuario no registrado en esta sucursal'
            });
        }

        const filasPermisos = await prisma.$queryRaw`
            EXEC dbo.sp_permisos_usuario @id_usuario = ${usuarioEncontrado.id_usuario}
        `;
        const permisos = filasPermisos.map((permiso) => permiso.codigo);
        const token = crearSesion(usuarioEncontrado, permisos);

        res.status(200).json({
          mensaje: "Inicio de sesión exitoso",
          token,
          usuario: { ...usuarioEncontrado, permisos }
        });
    }catch(error){
        console.error(error);
        res.status(500).json({mensaje: "Error interno del servidor"});
    }
});

app.post('/api/logout', requerirAutenticacion, (req, res) => {
    cerrarSesion(req.auth.token);
    return res.json({ mensaje: 'Sesión cerrada' });
});

app.post('/api/clientes/registro', async (req, res) => {
    const { nombre, correo, password, telefono } = req.body ?? {};
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150 ||
        typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
        correo.trim().length > 150 ||
        typeof password !== 'string' || password.length < 8 || password.length > 100 ||
        (telefono !== undefined && telefono !== null &&
            (typeof telefono !== 'string' || telefono.length > 20))) {
        return res.status(400).json({ mensaje: 'Revisa nombre, correo, contraseña y teléfono' });
    }

    try {
        const [usuario] = await prisma.$queryRaw`
            EXEC dbo.sp_registrar_cliente_usuario
                @nombre = ${nombre.trim()},
                @correo = ${correo.trim()},
                @password = ${password},
                @telefono = ${telefono?.trim() || null}
        `;
        const filasPermisos = await prisma.$queryRaw`
            EXEC dbo.sp_permisos_usuario @id_usuario = ${usuario.id_usuario}
        `;
        const permisos = filasPermisos.map((permiso) => permiso.codigo);
        const token = crearSesion(usuario, permisos);
        return res.status(201).json({
            mensaje: 'Cuenta creada',
            token,
            usuario: { ...usuario, permisos }
        });
    } catch (error) {
        const numeroError = error.originalError?.info?.number ?? error.number;
        if (numeroError === 50025 || error.code === 'P2002' ||
            [2601, 2627].includes(numeroError)) {
            return res.status(409).json({ mensaje: 'El correo ya está registrado' });
        }
        if ([50020, 50021, 50022, 50023, 50024].includes(numeroError)) {
            return res.status(400).json({ mensaje: error.message });
        }
        console.error('Error al registrar cliente:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar la cuenta' });
    }
});

app.use('/api/clientes', requerirAutenticacion, clientesRoutes);

app.get('/api/session', requerirAutenticacion, (req, res) => {
    return res.json({
        token: req.auth.token,
        usuario: { ...req.auth.usuario, permisos: [...req.auth.permisos] }
    });
});

app.post('/api/cambiar-password', requerirAutenticacion, async (req, res) => {
    const { password_actual, password_nueva } = req.body ?? {};
    if (typeof password_actual !== 'string' || !password_actual ||
        typeof password_nueva !== 'string' || password_nueva.length < 8 || password_nueva.length > 100) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe tener entre 8 y 100 caracteres' });
    }

    try {
        await prisma.$queryRaw`
            EXEC dbo.sp_cambiar_password
                @id_usuario = ${req.auth.usuario.id_usuario},
                @password_actual = ${password_actual},
                @password_nueva = ${password_nueva}
        `;
        req.auth.usuario.debe_cambiar_password = false;
        return res.json({ mensaje: 'Contraseña actualizada' });
    } catch (error) {
        const numeroError = error.originalError?.info?.number ?? error.number;
        if (numeroError === 50011) {
            return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });
        }
        console.error('Error al cambiar contraseña:', error);
        return res.status(500).json({ mensaje: 'No se pudo cambiar la contraseña' });
    }
});

app.use((req, res) => {
    return res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la solicitud debe ser JSON válido' });
    }
    console.error('Error no controlado en la API:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535');
}

async function iniciarServidor() {
    await prisma.$connect();
    app.listen(PORT, () => {
        console.log(`Servidor POS corriendo en http://localhost:${PORT}`);
    });
}

iniciarServidor().catch(async (error) => {
    console.error('No se pudo iniciar el servidor o conectar con la base de datos:', error);
    await prisma.$disconnect();
    process.exitCode = 1;
});