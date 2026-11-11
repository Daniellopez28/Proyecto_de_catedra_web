import express from 'express';
import prisma from '../config/prisma.js';
import { calcular_planilla_empleado, redondear } from '../services/planilla.service.js';

const router = express.Router();
const dia_en_ms = 24 * 60 * 60 * 1000;

// convierte 'aaaa-mm-dd' en date, o null si no es valida
function convertir_fecha(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// post /api/planillas/generar
// body: { "periodo_inicio": "2026-11-01", "periodo_fin": "2026-11-15" }
router.post('/generar', async (req, res) => {
  try {
    const { periodo_inicio, periodo_fin } = req.body;

    const inicio = convertir_fecha(periodo_inicio);
    const fin = convertir_fecha(periodo_fin);

    if (!inicio || !fin) {
      return res.status(400).json({ mensaje: 'las fechas deben tener formato aaaa-mm-dd' });
    }
    if (fin < inicio) {
      return res.status(400).json({ mensaje: 'la fecha fin no puede ser menor a la fecha inicio' });
    }
    if ((fin - inicio) / dia_en_ms + 1 > 16) {
      return res.status(400).json({ mensaje: 'una quincena no puede exceder 16 dias' });
    }

    // evita generar dos veces la misma quincena
    const existente = await prisma.planillas.findFirst({
      where: { tipo_planilla: 'Quincenal', periodo_inicio: inicio, periodo_fin: fin },
    });
    if (existente) {
      return res.status(409).json({ mensaje: 'ya existe una planilla para ese periodo' });
    }

    const empleados = await prisma.empleados.findMany({
      where: { activo: true, tipo_planilla: 'Quincenal' },
    });
    if (empleados.length === 0) {
      return res.status(404).json({ mensaje: 'no hay empleados activos con planilla quincenal' });
    }

    const detalles = empleados.map((empleado) => ({
      id_empleado: empleado.id_empleado,
      ...calcular_planilla_empleado(empleado.salario_base),
    }));

    const total_pagar = redondear(
      detalles.reduce((acumulado, detalle) => acumulado + detalle.salario_neto, 0)
    );

    // se guarda la planilla y su detalle en una sola operacion
    const planilla = await prisma.planillas.create({
      data: {
        periodo_inicio: inicio,
        periodo_fin: fin,
        tipo_planilla: 'Quincenal',
        total_pagar,
        estado: 'Generada',
        planilla_detalle: { create: detalles },
      },
      include: { planilla_detalle: true },
    });

    res.status(201).json({ mensaje: 'planilla generada exitosamente', planilla });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'error interno al generar la planilla' });
  }
});

export default router;