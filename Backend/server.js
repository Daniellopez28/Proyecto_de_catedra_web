import express from 'express';
import cors from 'cors';
import prisma from './src/config/prisma.js';

const app = express();

// Middlewares
app.use(cors()); // Permite que React (Vite) se conecte sin problemas de CORS
app.use(express.json()); // Permite recibir JSON en el body de las peticiones

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API del Restaurante Orígenes SV funcionando correctamente.' });
});

// 1. Productos (Para que el POS  cargue el menú)
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await prisma.productos.findMany();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// 2. Insumos (Para que cargue la tabla de inventario)
app.get('/api/insumos', async (req, res) => {
  try {
    const insumos = await prisma.insumos.findMany();
    res.json(insumos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener insumos' });
  }
});

// 3. Ventas (Para que el POS envíe la venta)
app.post('/api/ventas', async (req, res) => {
  const { id_cliente, id_usuario, tipo_documento, correlativo, subtotal, iva, total, detalles } = req.body;

  try {
    // Solo guardamos lo que el frontend/backend calculó
    const nuevaVenta = await prisma.ventas.create({
      data: {
        id_cliente: id_cliente || null,
        id_usuario: id_usuario,
        tipo_documento: tipo_documento,
        correlativo: correlativo,
        subtotal: subtotal,
        iva: iva,
        total: total,
        venta_detalle: {
          create: detalles.map(item => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal_linea: item.subtotal_linea
          }))
        }
      }
    });

    res.status(201).json({ mensaje: 'Venta registrada', venta: nuevaVenta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar la venta en la base de datos' });
  }
});

// 4. Compras (Para que Lily envíe la compra y tú la guardes)
app.post('/api/compras', async (req, res) => {
  const { id_proveedor, numero_factura_proveedor, total_compra, detalles } = req.body;

  try {
    const nuevaCompra = await prisma.compras.create({
      data: {
        id_proveedor: id_proveedor,
        numero_factura_proveedor: numero_factura_proveedor,
        total_compra: total_compra,
        compra_detalle: {
          create: detalles.map(item => ({
            id_insumo: item.id_insumo,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            subtotal: item.subtotal
          }))
        }
      }
    });

    res.status(201).json({ mensaje: 'Compra registrada', compra: nuevaCompra });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar la compra en la base de datos' });
  }
});

// INICIO DEL SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});