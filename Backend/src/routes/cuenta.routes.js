//Ruta para consultar el perfil, reservas, etc. cuando dice ususario autenticado se refiere a que el ussuario esta logueado y tiene el token valido 
import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../../auth/permisos.js';

//plantea la ruta 
const router = Router();

//Ruta para consultar el perfil de un usuario autenticado
router.get('/perfil', requerirPermiso('ver_mi_perfil'), async (req, res) => {
  try {
    const perfil = await prisma.usuarios.findUnique({
      where: { id_usuario: req.usuario.id_usuario },
      select: {
        id_usuario: true,
        nombre_completo: true,
        correo: true,
        debe_cambiar_password: true,
        roles: { select: { nombre_rol: true } },
        sucursales: { select: { nombre: true } },
        clientes: {
          select: { nombre: true, telefono: true, direccion: true }
        },
        empleados: {
          select: { codigo_empleado: true, cargo: true, tipo_planilla: true }
        }
      }
    });
    if (!perfil) return res.status(404).json({ mensaje: 'Perfil no encontrado' });
    return res.json({ perfil });
  } catch (error) {
    console.error('Error al consultar el perfil propio:', error);
    return res.status(500).json({ mensaje: 'No se pudo consultar el perfil' });
  }
});

//Ruta para consultar las reservas de un usuario autenticado
router.get('/reservas', requerirPermiso('ver_mis_reservas'), async (req, res) => {
  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id_usuario: req.usuario.id_usuario },
      select: { id_cliente: true }
    });
    if (!usuario?.id_cliente) {
      return res.status(404).json({ mensaje: 'La cuenta no está vinculada a un cliente' });
    }

    const reservas = await prisma.reservas.findMany({
      where: { id_cliente: usuario.id_cliente },
      include: { mesas: { select: { numero_mesa: true, sucursalid: true } } },
      orderBy: { fecha_hora_inicio: 'desc' }
    });
    return res.json({ reservas });
  } catch (error) {
    console.error('Error al consultar las reservas propias:', error);
    return res.status(500).json({ mensaje: 'No se pudieron consultar las reservas' });
  }
});

//Ruta para la ficha de un usuario autenticado 
router.get('/ficha', requerirPermiso('ver_mi_ficha'), async (req, res) => {
  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id_usuario: req.usuario.id_usuario },
      select: {
        empleados: {
          select: {
            codigo_empleado: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            nombre_completo: true,
            dui: true,
            fecha_nacimiento: true,
            isss_numero: true,
            afp_numero: true,
            cargo: true,
            tipo_planilla: true,
            salario_base: true,
            fecha_ingreso: true,
            tipo_contrato: true,
            jornada: true,
            forma_pago: true,
            sucursales: { select: { nombre: true } }
          }
        }
      }
    });
    if (!usuario?.empleados) return res.status(404).json({ mensaje: 'La cuenta no está vinculada a un empleado' });
    return res.json({ ficha: usuario.empleados });
  } catch (error) {
    console.error('Error al consultar la ficha propia:', error);
    return res.status(500).json({ mensaje: 'No se pudo consultar la ficha' });
  }
});

//Ruta para las planillas de un usuario autenticado
router.get('/planillas', requerirPermiso('ver_mi_planilla'), async (req, res) => {
  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id_usuario: req.usuario.id_usuario },
      select: { id_empleado: true }
    });
    if (!usuario?.id_empleado) {
      return res.status(404).json({ mensaje: 'La cuenta no está vinculada a un empleado' });
    }

    const detalles = await prisma.planilla_detalle.findMany({
      where: { id_empleado: usuario.id_empleado },
      include: {
        planillas: {
          select: { periodo_inicio: true, periodo_fin: true, tipo_planilla: true, estado: true }
        }
      }
    });
    detalles.sort((a, b) => b.planillas.periodo_inicio - a.planillas.periodo_inicio);
    return res.json({ planillas: detalles });
  } catch (error) {
    console.error('Error al consultar las planillas propias:', error);
    return res.status(500).json({ mensaje: 'No se pudieron consultar las planillas' });
  }
});

export default router;
