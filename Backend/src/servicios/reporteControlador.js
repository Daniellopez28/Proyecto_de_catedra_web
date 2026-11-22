/*Servicio encargado de consolidar ventas multisucursal*/
import { obtenerReporteConsolidado } from '../servicios/reporteConsolidadoServicio.js';

/*Controlador HTTP para consultar el reporte consolidado de ventas*/
export async function reporteConsolidadoControlador(req, res) {
  try {
    /*Lee filtros opcionales desde query params (?sucursal=...&fechaInicio=...&fechaFin=...)*/
    const { sucursal, fechaInicio, fechaFin } = req.query || {};

    /*Calcula el reporte consolidado en USD*/
    const reporte = await obtenerReporteConsolidado({
      sucursal,
      fechaInicio,
      fechaFin,
    });

    /*Responde con estado 200 y la información consolidada*/
    return res.status(200).json({
      ok: true,
      ...reporte,
    });
  } catch (error) {
    /*Responde con error controlado si ocurre algún problema*/
    return res.status(500).json({
      ok: false,
      mensaje: error.message || 'No se pudo generar el reporte consolidado.',
    });
  }
}