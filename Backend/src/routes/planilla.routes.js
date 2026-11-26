import express from 'express';
import prisma from '../config/prisma.js';
import {
  calcular_planilla_empleado,
  normalizar_detalle_editable,
  redondear
} from '../services/planilla.service.js';
import { requerirAutenticacion, requerirPermiso } from '../middleware/autenticacion.js';

const router = express.Router();
const dia_en_ms = 24 * 60 * 60 * 1000;
router.use(requerirAutenticacion);

// convierte 'aaaa-mm-dd' en date, o null si no es valida
function convertir_fecha(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto ? null : fecha;
}

// post /api/planillas/generar
// body: { "periodo_inicio": "2026-11-01", "periodo_fin": "2026-11-15" }
router.post('/generar', requerirPermiso('generar_planillas'), async (req, res) => {
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
    if (error.code === 'P2002') {
      return res.status(409).json({ mensaje: 'ya existe una planilla para ese periodo' });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'error interno al generar la planilla' });
  }
});

// get /api/planillas
router.get('/', requerirPermiso('ver_planillas'), async (req, res) => {
  try {
    const planillas = await prisma.planillas.findMany({
      orderBy: { periodo_inicio: 'desc' },
    });
    res.json(planillas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'error interno al listar las planillas' });
  }
});

router.get('/mi', requerirPermiso('ver_mi_planilla'), async (req, res) => {
  const id_empleado = req.auth.usuario.id_empleado;
  if (!id_empleado) return res.status(404).json({ mensaje: 'La cuenta no tiene una ficha laboral' });
  try {
    const planillas = await prisma.planillas.findMany({
      where: { planilla_detalle: { some: { id_empleado } } },
      orderBy: { periodo_inicio: 'desc' },
      include: {
        planilla_detalle: {
          where: { id_empleado },
          select: {
            salario_bruto: true,
            descuento_isss: true,
            descuento_afp: true,
            descuento_renta: true,
            salario_neto: true
          }
        }
      }
    });
    return res.json({ total: planillas.length, planillas });
  } catch (error) {
    console.error('Error al consultar planilla propia:', error);
    return res.status(500).json({ mensaje: 'No se pudo consultar la planilla propia' });
  }
});

// get /api/planillas/:id
router.get('/:id', requerirPermiso('ver_planillas'), async (req, res) => {
  try {
    const id_planilla = Number(req.params.id);
    if (!Number.isInteger(id_planilla) || id_planilla <= 0) {
      return res.status(400).json({ mensaje: 'id de planilla invalido' });
    }

    const planilla = await prisma.planillas.findUnique({
      where: { id_planilla },
      include: {
        planilla_detalle: {
          include: {
            empleados: { select: { nombre_completo: true, dui: true, cargo: true } },
          },
        },
      },
    });

    if (!planilla) {
      return res.status(404).json({ mensaje: 'planilla no encontrada' });
    }

    res.json(planilla);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'error interno al consultar la planilla' });
  }
});

router.put('/:id/detalles/:id_empleado', requerirPermiso('editar_planillas'), async (req, res) => {
  const id_planilla = Number(req.params.id);
  const id_empleado = Number(req.params.id_empleado);
  if (!Number.isInteger(id_planilla) || id_planilla <= 0 ||
      !Number.isInteger(id_empleado) || id_empleado <= 0) {
    return res.status(400).json({ mensaje: 'id de planilla o empleado invalido' });
  }

  let detalleNormalizado;
  try {
    detalleNormalizado = normalizar_detalle_editable(req.body);
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const planilla = await tx.planillas.findUnique({
        where: { id_planilla },
        select: { estado: true }
      });
      if (!planilla) return { estado: 'no_encontrada' };
      if (planilla.estado === 'Pagada') return { estado: 'pagada' };

      const claveDetalle = { id_planilla_id_empleado: { id_planilla, id_empleado } };
      const detalle = await tx.planilla_detalle.findUnique({ where: claveDetalle });
      if (!detalle) return { estado: 'detalle_no_encontrado' };

      await tx.planilla_detalle.update({
        where: claveDetalle,
        data: detalleNormalizado
      });
      const agregado = await tx.planilla_detalle.aggregate({
        where: { id_planilla },
        _sum: { salario_neto: true }
      });
      await tx.planillas.update({
        where: { id_planilla },
        data: { total_pagar: agregado._sum.salario_neto ?? '0.00' }
      });
      return { estado: 'actualizada' };
    }, { isolationLevel: 'Serializable' });

    if (resultado.estado === 'no_encontrada') {
      return res.status(404).json({ mensaje: 'planilla no encontrada' });
    }
    if (resultado.estado === 'detalle_no_encontrado') {
      return res.status(404).json({ mensaje: 'empleado no encontrado en la planilla' });
    }
    if (resultado.estado === 'pagada') {
      return res.status(409).json({ mensaje: 'no se puede editar una planilla pagada' });
    }
    return res.json({ mensaje: 'detalle de planilla actualizado' });
  } catch (error) {
    if (error.code === 'P2034') {
      return res.status(409).json({ mensaje: 'la planilla cambio durante la edicion; vuelve a intentarlo' });
    }
    console.error('Error al editar detalle de planilla:', error);
    return res.status(500).json({ mensaje: 'no se pudo actualizar el detalle de la planilla' });
  }
});

// put /api/planillas/:id/pagar
router.put('/:id/pagar', requerirPermiso('generar_planillas'), async (req, res) => {
  try {
    const id_planilla = Number(req.params.id);
    if (!Number.isInteger(id_planilla) || id_planilla <= 0) {
      return res.status(400).json({ mensaje: 'id de planilla invalido' });
    }

    const planilla = await prisma.planillas.findUnique({ where: { id_planilla } });
    if (!planilla) {
      return res.status(404).json({ mensaje: 'planilla no encontrada' });
    }
    if (planilla.estado === 'Pagada') {
      return res.status(409).json({ mensaje: 'la planilla ya fue marcada como pagada' });
    }

    const actualizada = await prisma.planillas.updateMany({
      where: { id_planilla, estado: { not: 'Pagada' } },
      data: { estado: 'Pagada' },
    });
    if (actualizada.count !== 1) {
      return res.status(409).json({ mensaje: 'la planilla ya fue marcada como pagada' });
    }

    const planillaActualizada = await prisma.planillas.findUnique({ where: { id_planilla } });
    res.json({ mensaje: 'planilla marcada como pagada', planilla: planillaActualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'error interno al actualizar la planilla' });
  }
});

export default router;