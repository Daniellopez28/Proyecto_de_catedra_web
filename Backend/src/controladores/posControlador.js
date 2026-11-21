/*Servicio de consulta de stock en tiempo real*/
import { consultarDisponibilidadStockPos } from '../servicios/stockConcurrenciaServicio.js';
/*Servicio transaccional de registro de ventas con IVA 13% y explosión de recetas*/
import { registrarVentaPos } from '../servicios/ventaPosServicio.js';

/*Controlador para validar disponibilidad de insumos antes de cobrar en el POS*/
export async function validarStockPosControlador(req, res) {
  try {
    /*Obtiene los ítems enviados desde el cuerpo de la petición*/
    const { items } = req.body || {};

    /*Evalúa si hay stock suficiente para todos los productos solicitados*/
    const resultado = await consultarDisponibilidadStockPos(items);

    /*Responde con el estado de disponibilidad y los faltantes si existen*/
    return res.status(200).json({
      ok: true,
      ...resultado,
    });
  } catch (error) {
    /*Devuelve error controlado si ocurre un fallo inesperado*/
    return res.status(400).json({
      ok: false,
      mensaje: error.message || 'No se pudo validar el stock del POS.',
    });
  }
}

/*Controlador para registrar una venta en el POS de forma atómica*/
export async function crearVentaPosControlador(req, res) {
  try {
    /*Extrae sucursal y productos vendidos desde el cuerpo de la petición*/
    const { sucursal, items } = req.body || {};

    /*Ejecuta la transacción completa de venta, descuento de insumos y cálculo de IVA*/
    const resultadoVenta = await registrarVentaPos({ sucursal, items });

    /*Responde con estado 201 indicando que la venta fue creada*/
    return res.status(201).json({
      ok: true,
      mensaje: 'Venta registrada correctamente en el POS.',
      ...resultadoVenta,
    });
  } catch (error) {
    /*Responde con error 400 cuando faltan datos, hay falta de stock o falla validación*/
    return res.status(400).json({
      ok: false,
      mensaje: error.message || 'No se pudo registrar la venta en el POS.',
    });
  }
}