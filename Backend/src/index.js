import { timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from './config/prisma.js';
import planillaRoutes from './routes/planilla.routes.js';
import inventoryRoutes from './routes/inventario.routes.js';
import managementRoutes from './routes/gestion.routes.js';
import accountRoutes from './routes/cuenta.routes.js';
import { crearToken, requerirSesion } from '../auth/session.js';
import { requerirPermiso } from '../auth/permisos.js';

//Creamos el servidor en express
const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',').map((origin) => origin.trim()) ?? 'http://localhost:5173'
}));
app.use(express.json({ limit: '1mb' }));

//Enpoints para el programa
//primer endpoint encargado de verificar la conexion a la base de datos
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return res.json({ estado: 'ok', base_datos: 'conectada' });
  } catch (error) {
    console.error('Falló la prueba de conexión a SQL Server:', error);
    return res.status(503).json({ estado: 'error', base_datos: 'no disponible' });
  }
});

app.use('/api/planillas', requerirSesion, planillaRoutes);
app.use('/api/inventario', requerirSesion, inventoryRoutes);
app.use('/api/gestion', requerirSesion, managementRoutes);
app.use('/api/cuenta', requerirSesion, accountRoutes);

//segundo enpoint encargado de iniciar secion y generar un token de sesion
app.post('/api/login', async (req, res) => {
  const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'El correo y la contraseña son obligatorios' });
  }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { correo },
      include: {
        roles: { select: { nombre_rol: true, pantalla_inicio: true } },
        sucursales: { select: { sucursalid: true, nombre: true } }
      }
    });

    if (!usuario || !usuario.activo || !usuario.password_salt) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }
    const [passwordDb] = await prisma.$queryRaw`
      SELECT dbo.fn_hash_password(${password}, ${usuario.password_salt}) AS hash
    `;
    const hashRecibido = Buffer.from(passwordDb?.hash ?? '', 'utf8');
    const hashEsperado = Buffer.from(usuario.password_hash, 'utf8');
    if (hashRecibido.length !== hashEsperado.length || !timingSafeEqual(hashRecibido, hashEsperado)) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    await prisma.usuarios.update({
      where: { id_usuario: usuario.id_usuario },
      data: { ultimo_acceso: new Date() }
    });

    const { password_hash, password_salt, ...usuarioSeguro } = usuario;
    return res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuarioSeguro,
      token: crearToken(usuario)
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ mensaje: 'No se pudo completar el inicio de sesión' });
  }
});

//Funcion encargada de tomar los productos enviados y verificar que sean validos, verifica que sea unico para evitar duplicidad y cantidades positivas 
function normalizarProductos(productos) {
  if (!Array.isArray(productos) || productos.length === 0) {
    throw Object.assign(new Error('Debe enviar al menos un producto'), { status: 400 });
  }

  const cantidades = new Map();
  for (const item of productos) {
    if (!Number.isInteger(item?.id_producto) || item.id_producto <= 0 ||
        !Number.isInteger(item?.cantidad) || item.cantidad <= 0) {
      throw Object.assign(new Error('Cada producto debe tener id_producto y cantidad válidos'), { status: 400 });
    }
    cantidades.set(item.id_producto, (cantidades.get(item.id_producto) ?? 0) + item.cantidad);
  }
  return [...cantidades].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
}

//Tercer endpoint, encargado de registrar las ventas, actualizar el inventario y generar los movimientos de el inventario
app.post('/api/ventas', requerirSesion, requerirPermiso('operar_caja'), async (req, res) => {
  let productos;
  try {
    productos = normalizarProductos(req.body?.productos);
  } catch (error) {
    return res.status(error.status ?? 400).json({ mensaje: error.message });
  }

  const { tipoDocumento, sucursalid, id_cliente, mesaid, metodoPago, referenciaPago } = req.body;
  const id_usuario = req.usuario.id_usuario;
  if (!['Factura', 'CCF'].includes(tipoDocumento) ||
      !Number.isInteger(id_usuario) || id_usuario <= 0 ||
      !Number.isInteger(sucursalid) || sucursalid <= 0 ||
      typeof metodoPago !== 'string' || !metodoPago.trim()) {
    return res.status(400).json({ mensaje: 'Faltan datos válidos de documento, usuario, sucursal o pago' });
  }

  try {
    const venta = await prisma.$transaction(async (tx) => {
      const productosDb = await tx.productos.findMany({
        where: { id_producto: { in: productos.map((item) => item.id_producto) }, activo: true }
      });
      if (productosDb.length !== productos.length) {
        throw Object.assign(new Error('Uno o más productos no existen o están inactivos'), { status: 404 });
      }

      const precioPorId = new Map(productosDb.map((producto) => [
        producto.id_producto,
        Math.round(Number(producto.precio_venta) * 100)
      ]));
      const totalCentavos = productos.reduce(
        (total, item) => total + precioPorId.get(item.id_producto) * item.cantidad, 0
      );
      if (totalCentavos <= 0) throw Object.assign(new Error('El total de la venta debe ser mayor que cero'), { status: 400 });

      const detalles = productos.map((item) => {
        const unitario = precioPorId.get(item.id_producto);
        return {
          ...item,
          precio_unitario: unitario / 100,
          subtotal_linea: unitario * item.cantidad / 100
        };
      });
      const subtotalCentavos = Math.round(totalCentavos / 1.13);
      const tipoPrefijo = tipoDocumento === 'CCF' ? 'CCF' : 'F';
      const ultimaVenta = await tx.ventas.findFirst({
        where: { tipo_documento: tipoDocumento },
        orderBy: { id_venta: 'desc' },
        select: { correlativo: true }
      });
      const ultimoNumero = Number(ultimaVenta?.correlativo.split('-').at(-1)) || 0;
      const correlativo = `${tipoPrefijo}-${String(ultimoNumero + 1).padStart(4, '0')}`;

      const recetas = await tx.recetas_detalle.findMany({
        where: { id_producto: { in: productos.map((item) => item.id_producto) } }
      });
      const cantidadVendida = new Map(productos.map((item) => [item.id_producto, item.cantidad]));
      const consumos = new Map();
      for (const receta of recetas) {
        const cantidad = Number(receta.cantidad_requerida) * cantidadVendida.get(receta.id_producto);
        consumos.set(receta.id_insumo, (consumos.get(receta.id_insumo) ?? 0) + cantidad);
      }

      for (const [insumoid, cantidad] of [...consumos].sort(([a], [b]) => a - b)) {
        const stock = await tx.inventario_sucursal.findUnique({
          where: { sucursalid_insumoid: { sucursalid, insumoid } },
          select: { stock_actual: true }
        });
        if (!stock || Number(stock.stock_actual) < cantidad) {
          throw Object.assign(new Error(`Inventario insuficiente para el insumo ${insumoid}`), { status: 409 });
        }
        const actualizado = await tx.inventario_sucursal.updateMany({
          where: {
            sucursalid,
            insumoid,
            stock_actual: { gte: cantidad }
          },
          data: { stock_actual: { decrement: cantidad } }
        });
        if (!actualizado.count) {
          throw Object.assign(new Error(`El stock del insumo ${insumoid} cambió; intente de nuevo`), { status: 409 });
        }
      }

      const nuevaVenta = await tx.ventas.create({
        data: {
          id_usuario,
          id_cliente: Number.isInteger(id_cliente) ? id_cliente : null,
          sucursalid,
          mesaid: Number.isInteger(mesaid) ? mesaid : null,
          tipo_documento: tipoDocumento,
          correlativo,
          subtotal: subtotalCentavos / 100,
          iva: (totalCentavos - subtotalCentavos) / 100,
          total: totalCentavos / 100,
          estado: 'pagada',
          estado_pedido: 'pagado',
          venta_detalle: { create: detalles },
          pagos: {
            create: {
              metodo_pago: metodoPago.trim(),
              monto: totalCentavos / 100,
              referencia_transaccion: typeof referenciaPago === 'string' ? referenciaPago : null
            }
          }
        }
      });

      for (const [insumoid, cantidad] of consumos) {
        await tx.movimientos_inventario.create({
          data: {
            sucursalid,
            insumoid,
            tipo_movimiento: 'salida',
            cantidad,
            referencia: correlativo,
            id_usuario
          }
        });
      }
      return nuevaVenta;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return res.status(201).json({
      mensaje: 'Venta registrada exitosamente',
      correlativo: venta.correlativo,
      total: venta.total
    });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ mensaje: error.message });
    if (error?.code === 'P2002') {
      return res.status(409).json({ mensaje: 'Conflicto al generar el correlativo; vuelva a intentar' });
    }
    console.error('Error al registrar venta:', error);
    return res.status(500).json({ mensaje: 'Error interno al registrar la venta' });
  }
});

app.use((error, _req, res, _next) => {
  console.error('Error no controlado en la API:', error);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  await prisma.$connect();
  app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
}
