import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../../auth/permisos.js';

// Crea la instancia del router de Express para las rutas de inventario por sucursal
const router = Router();

//funcion para validad que el valor sea entero positivo 
function enteroPositivo(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Ruta que lista los insumos activos de una sucursal con su stock y estado (AGOTADO, STOCK_BAJO o NORMAL)
router.get('/insumos', requerirPermiso('ver_inventario'), async (req, res) => {
  const sucursalid = enteroPositivo(req.query.sucursalid);
  if (!sucursalid) {
    return res.status(400).json({ mensaje: 'Debe indicar un sucursalid válido' });
  }

  try {
    const filas = await prisma.inventario_sucursal.findMany({
      where: { sucursalid, insumos: { is: { activo: true } } },
      include: { insumos: true },
      orderBy: { inventarioid: 'asc' }
    });
    const insumos = filas.map(({ insumos, stock_actual, stock_minimo }) => ({
      id_insumo: insumos.id_insumo,
      nombre: insumos.nombre,
      unidad_medida: insumos.unidad_medida,
      stock_actual: Number(stock_actual),
      stock_minimo: Number(stock_minimo),
      costo_promedio: Number(insumos.costo_promedio ?? 0),
      estado: Number(stock_actual) <= 0
        ? 'AGOTADO'
        : Number(stock_actual) <= Number(stock_minimo) ? 'STOCK_BAJO' : 'NORMAL'
    }));
    return res.json({ total: insumos.length, insumos });
  } catch (error) {
    console.error('Error al listar el inventario de sucursal:', error);
    return res.status(500).json({ mensaje: 'No se pudo consultar el inventario' });
  }
});

// Ruta que consulta los insumos activos en stock bajo o agotado de una sucursal ordenando agotados primero
router.get('/alertas', requerirPermiso('ver_inventario'), async (req, res) => {
  const sucursalid = enteroPositivo(req.query.sucursalid);
  if (!sucursalid) {
    return res.status(400).json({ mensaje: 'Debe indicar un sucursalid válido' });
  }

  try {
    const filas = await prisma.inventario_sucursal.findMany({
      where: { sucursalid, insumos: { is: { activo: true } } },
      include: { insumos: true }
    });
    const alertas = filas
      .filter(({ stock_actual, stock_minimo }) => Number(stock_actual) <= Number(stock_minimo))
      .map(({ insumos, stock_actual, stock_minimo }) => ({
        id_insumo: insumos.id_insumo,
        nombre: insumos.nombre,
        unidad_medida: insumos.unidad_medida,
        stock_actual: Number(stock_actual),
        stock_minimo: Number(stock_minimo),
        nivel: Number(stock_actual) <= 0 ? 'AGOTADO' : 'STOCK_BAJO'
      }))
      .sort((a, b) => (a.nivel === 'AGOTADO' ? 0 : 1) - (b.nivel === 'AGOTADO' ? 0 : 1));
    return res.json({ total: alertas.length, alertas });
  } catch (error) {
    console.error('Error al consultar alertas de inventario:', error);
    return res.status(500).json({ mensaje: 'No se pudieron consultar las alertas' });
  }
});

// Ruta que registra de forma atómica una entrada, salida o ajuste y actualiza el stock de la sucursal
router.post('/movimientos', requerirPermiso('gestionar_inventario'), async (req, res) => {
  const sucursalid = enteroPositivo(req.body?.sucursalid);
  const insumoid = enteroPositivo(req.body?.insumoid);
  const id_usuario = req.usuario.id_usuario;
  const cantidad = Number(req.body?.cantidad);
  const tipo_movimiento = req.body?.tipo_movimiento;
  const tipos = ['entrada', 'salida', 'ajuste'];

  if (!sucursalid || !insumoid || !id_usuario || !Number.isFinite(cantidad) ||
      cantidad === 0 || !tipos.includes(tipo_movimiento)) {
    return res.status(400).json({
      mensaje: 'Envíe sucursalid, insumoid, id_usuario, tipo_movimiento y una cantidad válida distinta de cero'
    });
  }
  if ((tipo_movimiento === 'entrada' && cantidad < 0) ||
      (tipo_movimiento === 'salida' && cantidad < 0)) {
    return res.status(400).json({ mensaje: 'La cantidad de entradas y salidas debe ser positiva' });
  }

  const magnitud = Math.abs(cantidad);
  try {
    const movimiento = await prisma.$transaction(async (tx) => {
      const actual = await tx.inventario_sucursal.findUnique({
        where: { sucursalid_insumoid: { sucursalid, insumoid } }
      });
      if (!actual) {
        return null;
      }

      const decrementa = tipo_movimiento === 'salida' || (tipo_movimiento === 'ajuste' && cantidad < 0);
      const resultado = await tx.inventario_sucursal.updateMany({
        where: {
          sucursalid,
          insumoid,
          ...(decrementa ? { stock_actual: { gte: magnitud } } : {})
        },
        data: {
          stock_actual: decrementa ? { decrement: magnitud } : { increment: magnitud }
        }
      });
      if (!resultado.count) {
        throw Object.assign(new Error('Stock insuficiente para realizar el movimiento'), { status: 409 });
      }

      return tx.movimientos_inventario.create({
        data: {
          sucursalid,
          insumoid,
          id_usuario,
          tipo_movimiento,
          cantidad: magnitud,
          referencia: typeof req.body.referencia === 'string' ? req.body.referencia : null
        }
      });
    }, { isolationLevel: 'Serializable' });

    if (!movimiento) return res.status(404).json({ mensaje: 'No existe inventario para ese insumo y sucursal' });
    return res.status(201).json({ mensaje: 'Movimiento registrado', movimiento });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    console.error('Error al registrar movimiento de inventario:', error);
    return res.status(500).json({ mensaje: 'No se pudo registrar el movimiento' });
  }
});

export default router;