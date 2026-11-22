//routa encargada de manejas las peticiones de planilla
import { Router } from 'express'; //importamos el express para que se cree la ruta 
import prisma from '../config/prisma.js'; //importamos la configuracion de la base de datos 
import { calcular_planilla_empleado, redondear } from '../services/planilla.service.js'; //importamos los servicios de la planilla
import { requerirPermiso } from '../../auth/permisos.js'; //importa la funcion de requerir permisos para que solo usuarios con permiso puedan acceder 

//Plantea la ruta de planilla 
const router = Router();
const diaEnMs = 24 * 60 * 60 * 1000;

//funcion para convertir la fecha de texto a una fecha valida
function convertirFecha(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) return null;
  return fecha;
}

//funcion para convertir un texto a un id positivo
function idPositivo(texto) {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

//Ruta que maneja la generacion de planilla, si ya existe devuelve un 409, si no hay empleados devuelve un 404 y si es invalido devuelve un 400
router.post('/generar', requerirPermiso('generar_planillas'), async (req, res) => {
  const inicio = convertirFecha(req.body?.periodo_inicio);
  const fin = convertirFecha(req.body?.periodo_fin);
  if (!inicio || !fin || fin < inicio || (fin - inicio) / diaEnMs + 1 > 16) {
    return res.status(400).json({ mensaje: 'Envíe un periodo válido de hasta 16 días' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const existente = await tx.planillas.findFirst({
        where: { tipo_planilla: 'quincenal', periodo_inicio: inicio, periodo_fin: fin }
      });
      if (existente) throw Object.assign(new Error('Ya existe una planilla para ese periodo'), { status: 409 });

      const empleados = await tx.empleados.findMany({
        where: { activo: true, tipo_planilla: 'quincenal' }
      });
      if (!empleados.length) throw Object.assign(new Error('No hay empleados quincenales activos'), { status: 404 });

      const detalles = empleados.map((empleado) => ({
        id_empleado: empleado.id_empleado,
        ...calcular_planilla_empleado(empleado.salario_base)
      }));
      const total_pagar = redondear(detalles.reduce((total, detalle) => total + detalle.salario_neto, 0));

      return tx.planillas.create({
        data: {
          periodo_inicio: inicio,
          periodo_fin: fin,
          tipo_planilla: 'quincenal',
          total_pagar,
          estado: 'generada',
          planilla_detalle: { create: detalles }
        },
        include: { planilla_detalle: true }
      });
    }, { isolationLevel: 'Serializable' });

    return res.status(201).json({ mensaje: 'Planilla generada exitosamente', planilla: resultado });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    if (error?.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe una planilla para ese periodo' });
    console.error('Error al generar planilla:', error);
    return res.status(500).json({ mensaje: 'Error interno al generar la planilla' });
  }
});

//Ruta para listar las planillas que se hayan generado, si no devuelve un 500
router.get('/', requerirPermiso('ver_planillas'), async (_req, res) => {
  try {
    const planillas = await prisma.planillas.findMany({ orderBy: { periodo_inicio: 'desc' } });
    return res.json(planillas);
  } catch (error) {
    console.error('Error al listar planillas:', error);
    return res.status(500).json({ mensaje: 'Error interno al listar las planillas' });
  }
});

//Ruta para obtener una planilla en especifico, buscando por su id
router.get('/:id', requerirPermiso('ver_planillas'), async (req, res) => {
  const id_planilla = idPositivo(req.params.id);
  if (!id_planilla) return res.status(400).json({ mensaje: 'Id de planilla inválido' });
  try {
    const planilla = await prisma.planillas.findUnique({
      where: { id_planilla },
      include: {
        planilla_detalle: {
          include: { empleados: { select: { nombre_completo: true, dui: true, cargo: true } } }
        }
      }
    });
    if (!planilla) return res.status(404).json({ mensaje: 'Planilla no encontrada' });
    return res.json(planilla);
  } catch (error) {
    console.error('Error al consultar planilla:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar la planilla' });
  }
});

//Ruta para marcar una planilla como pagada, para los empleados que ya se les haya pagado su salario.
router.put('/:id/pagar', requerirPermiso('generar_planillas'), async (req, res) => {
  const id_planilla = idPositivo(req.params.id);
  if (!id_planilla) return res.status(400).json({ mensaje: 'Id de planilla inválido' });
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const planilla = await tx.planillas.findUnique({ where: { id_planilla } });
      if (!planilla) return { status: 404 };
      if (planilla.estado === 'pagada') return { status: 409 };
      const actualizada = await tx.planillas.update({
        where: { id_planilla },
        data: { estado: 'pagada' }
      });
      return { status: 200, planilla: actualizada };
    });
    if (resultado.status === 404) return res.status(404).json({ mensaje: 'Planilla no encontrada' });
    if (resultado.status === 409) return res.status(409).json({ mensaje: 'La planilla ya está pagada' });
    return res.json({ mensaje: 'Planilla marcada como pagada', planilla: resultado.planilla });
  } catch (error) {
    console.error('Error al marcar planilla pagada:', error);
    return res.status(500).json({ mensaje: 'Error interno al actualizar la planilla' });
  }
});

export default router;
