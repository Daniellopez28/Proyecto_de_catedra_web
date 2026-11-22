import { randomBytes, randomInt } from 'node:crypto';
import { Router } from 'express';
import prisma from '../config/prisma.js';
import { obtenerPermisosUsuario, requerirPermiso } from '../../auth/permisos.js';

// Crea la instancia del router de Express para agrupar los endpoints de gestión
const router = Router();

//Permite especificamente los recursos que se pueden gestionar en la aplicacion 
const recursos = {
  sucursales: { modelo: 'sucursales', id: 'sucursalid', crear: ['nombre', 'direccion', 'telefono'], editar: ['nombre', 'direccion', 'telefono', 'activo'] },
  roles: { modelo: 'roles', id: 'id_rol' },
  empleados: { modelo: 'empleados', id: 'id_empleado' },
  usuarios: { modelo: 'usuarios', id: 'id_usuario' },
  clientes: { modelo: 'clientes', id: 'id_cliente', crear: ['nombre', 'dui', 'nit', 'nrc', 'telefono', 'correo', 'direccion', 'giro', 'direccion_fiscal'], editar: ['nombre', 'dui', 'nit', 'nrc', 'telefono', 'correo', 'direccion', 'giro', 'direccion_fiscal'] },
  proveedores: { modelo: 'proveedores', id: 'id_proveedor', crear: ['nombre_empresa', 'contacto_nombre', 'nit', 'telefono', 'correo', 'direccion'], editar: ['nombre_empresa', 'contacto_nombre', 'nit', 'telefono', 'correo', 'direccion', 'activo'] },
  insumos: { modelo: 'insumos', id: 'id_insumo', crear: ['nombre', 'unidad_medida', 'costo_promedio', 'stock_minimo'], editar: ['nombre', 'unidad_medida', 'costo_promedio', 'stock_minimo', 'activo'] },
  productos: { modelo: 'productos', id: 'id_producto', crear: ['nombre', 'descripcion', 'precio_venta', 'categoria', 'es_reventa'], editar: ['nombre', 'descripcion', 'precio_venta', 'categoria', 'es_reventa', 'activo'] },
  recetas: { modelo: 'recetas_detalle', idCompuesto: ['id_producto', 'id_insumo'] },
  inventario: { modelo: 'inventario_sucursal', id: 'inventarioid' },
  movimientos_inventario: { modelo: 'movimientos_inventario', id: 'movimientoid', grande: true },
  mesas: { modelo: 'mesas', id: 'mesaid', crear: ['sucursalid', 'numero_mesa', 'capacidad'], editar: ['numero_mesa', 'capacidad', 'estado'] },
  modificadores: { modelo: 'modificadores', id: 'modificadorid', crear: ['nombre', 'precio'], editar: ['nombre', 'precio', 'activo'] },
  ventas: { modelo: 'ventas', id: 'id_venta' },
  venta_detalle: { modelo: 'venta_detalle', idCompuesto: ['id_venta', 'id_producto'] },
  pagos: { modelo: 'pagos', id: 'id_pagos' },
  compras: { modelo: 'compras', id: 'id_compra' },
  compra_detalle: { modelo: 'compra_detalle', idCompuesto: ['id_compra', 'id_insumo'] },
  pagos_compra: { modelo: 'pagos_compra', id: 'pagocompraid' },
  cajas: { modelo: 'cajas', id: 'id_caja' },
  movimientos_caja: { modelo: 'movimientos_caja', id: 'movimientocajaid', grande: true },
  planillas: { modelo: 'planillas', id: 'id_planilla' },
  planilla_detalle: { modelo: 'planilla_detalle', idCompuesto: ['id_planilla', 'id_empleado'] },
  niveles_acceso: { modelo: 'niveles_acceso', id: 'id_nivel' },
  permisos: { modelo: 'permisos', id: 'id_permiso' },
  nivel_permiso: { modelo: 'nivel_permiso', idCompuesto: ['id_nivel', 'id_permiso'] },
  detalle_venta_modificadores: { modelo: 'detalle_venta_modificadores', id: 'detalle_modificadoid' },
  reservas: { modelo: 'reservas', id: 'id_reserva', crear: ['mesaid', 'id_cliente', 'fecha_hora_inicio', 'duracion_minutos', 'cantidad_personas', 'notas'], editar: ['estado', 'notas'] }
};

//Permite obtener el permiso para leer los recursos 
const permisoLectura = {
  sucursales: 'gestionar_sucursales',
  roles: 'gestionar_roles_permisos',
  empleados: 'ver_empleados',
  usuarios: 'gestionar_usuarios',
  clientes: 'gestionar_reservas',
  proveedores: 'ver_proveedores',
  insumos: 'ver_inventario',
  productos: 'ver_menu',
  recetas: 'gestionar_productos',
  inventario: 'ver_inventario',
  movimientos_inventario: 'gestionar_inventario',
  mesas: 'ver_mesas',
  modificadores: 'ver_menu',
  ventas: 'ver_ventas',
  venta_detalle: 'ver_ventas',
  pagos: 'ver_ventas',
  compras: 'ver_compras',
  compra_detalle: 'ver_compras',
  pagos_compra: 'ver_compras',
  cajas: 'operar_caja',
  movimientos_caja: 'operar_caja',
  planillas: 'ver_planillas',
  planilla_detalle: 'ver_planillas',
  niveles_acceso: 'gestionar_roles_permisos',
  permisos: 'gestionar_roles_permisos',
  nivel_permiso: 'gestionar_roles_permisos',
  detalle_venta_modificadores: 'ver_ventas',
  reservas: 'ver_reservas'
};

//Permite obtener el permiso para escribir los recursos 
const permisoEscritura = {
  sucursales: 'gestionar_sucursales',
  empleados: 'registrar_empleados',
  clientes: 'gestionar_reservas',
  proveedores: 'registrar_compras',
  insumos: 'gestionar_inventario',
  productos: 'gestionar_productos',
  recetas: 'gestionar_productos',
  inventario: 'gestionar_inventario',
  movimientos_inventario: 'gestionar_inventario',
  mesas: 'gestionar_reservas',
  modificadores: 'gestionar_productos',
  ventas: 'operar_caja',
  compras: 'registrar_compras',
  cajas: 'operar_caja',
  movimientos_caja: 'operar_caja',
  planillas: 'generar_planillas',
  planilla_detalle: 'generar_planillas',
  reservas: 'gestionar_reservas'
};

// Lista los módulos personales y el permiso requerido para mostrarlos al usuario autenticado
const modulosPersonales = [
  { nombre: 'mi_perfil', permiso: 'ver_mi_perfil' },
  { nombre: 'mis_reservas', permiso: 'ver_mis_reservas' },
  { nombre: 'mi_ficha', permiso: 'ver_mi_ficha' },
  { nombre: 'mi_planilla', permiso: 'ver_mi_planilla' }
];

//Funcion para autorizar el recurso 
function autorizarRecurso(tipoPermiso) {
  return (req, res, next) => {
    const recurso = recursos[req.params.recurso];
    if (!recurso) return res.status(404).json({ mensaje: 'Módulo no encontrado' });
    if (tipoPermiso === 'escritura' && !recurso.crear && !recurso.editar) return next();

    const codigo = (tipoPermiso === 'lectura' ? permisoLectura : permisoEscritura)[req.params.recurso];
    if (!codigo) return res.status(403).json({ mensaje: 'No tiene permiso para realizar esta operación' });
    return requerirPermiso(codigo)(req, res, next);
  };
}

//Funcion para los valores de un objeto que no sean desonocidos 
function serializar(valor) {
  return JSON.parse(JSON.stringify(valor, (_clave, dato) =>
    typeof dato === 'bigint' ? dato.toString() : dato
  ));
}

//Funcion para filtrar los campos de un objeto 
function filtrarCampos(body, permitidos) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const desconocidos = Object.keys(body).filter((campo) => !permitidos.includes(campo));
  if (desconocidos.length) return null;
  return Object.fromEntries(Object.entries(body).filter(([, valor]) => valor !== undefined));
}

//Funcion para crear un id para los recursos
function crearId(recurso, valor) {
  if (recurso.grande) {
    try {
      return BigInt(valor);
    } catch {
      return null;
    }
  }
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

//Ruta para consultar el perfil y reservas de un usuario
router.get('/', async (req, res) => {
  try {
    const permisos = await obtenerPermisosUsuario(req.usuario.id_usuario);
    const modulos = Object.keys(recursos)
      .filter((nombre) => permisos.has(permisoLectura[nombre]))
      .map((nombre) => ({
        nombre,
        escritura: Boolean(permisoEscritura[nombre] && permisos.has(permisoEscritura[nombre]))
      }));
    modulos.push(...modulosPersonales
      .filter(({ permiso }) => permisos.has(permiso))
      .map(({ nombre }) => ({ nombre, escritura: false })));
    return res.json({ modulos });
  } catch (error) {
    console.error('Error al listar módulos disponibles:', error);
    return res.status(500).json({ mensaje: 'No se pudieron consultar los permisos del usuario' });
  }
});

//Ruta para consultar el perfil de un usuario con permiso para ver un recurso
router.get('/:recurso', autorizarRecurso('lectura'), async (req, res) => {
  const recurso = recursos[req.params.recurso];

  try {
    const registros = await prisma[recurso.modelo].findMany({
      take: 200,
      orderBy: recurso.id ? { [recurso.id]: 'desc' } : undefined
    });
    const seguros = req.params.recurso === 'usuarios'
      ? registros.map(({ password_hash, password_salt, ...usuario }) => usuario)
      : registros;
    return res.json({ total: seguros.length, registros: serializar(seguros) });
  } catch (error) {
    console.error(`Error al consultar el módulo ${req.params.recurso}:`, error);
    return res.status(500).json({ mensaje: `No se pudo consultar ${req.params.recurso}` });
  }
});

//Ruta para consultar el registro de un recurso
router.post('/empleados', requerirPermiso('registrar_empleados'), async (req, res) => {
  const body = req.body ?? {};
  const requiredText = ['nombres', 'apellido_paterno', 'nombre_completo', 'dui', 'cargo', 'correo', 'password_inicial'];
  const fechaNacimiento = new Date(`${body.fecha_nacimiento}T00:00:00.000Z`);
  const fechaIngreso = new Date(`${body.fecha_ingreso}T00:00:00.000Z`);
  const idRol = Number(body.id_rol);
  const sucursalid = body.sucursalid == null ? null : Number(body.sucursalid);
  const salario = Number(body.salario_base);
  const tipoPlanilla = typeof body.tipo_planilla === 'string' ? body.tipo_planilla.toLowerCase() : '';

  if (requiredText.some((key) => typeof body[key] !== 'string' || !body[key].trim()) ||
      !Number.isInteger(idRol) || idRol <= 0 ||
      (sucursalid !== null && (!Number.isInteger(sucursalid) || sucursalid <= 0)) ||
      !Number.isFinite(salario) || salario < 0 ||
      !['quincenal', 'mensual'].includes(tipoPlanilla) ||
      Number.isNaN(fechaNacimiento.getTime()) || Number.isNaN(fechaIngreso.getTime())) {
    return res.status(400).json({ mensaje: 'Datos de empleado incompletos o inválidos' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      let codigo;
      for (let intento = 0; intento < 10; intento += 1) {
        const candidato = String(randomInt(100000, 1000000));
        if (!await tx.empleados.findUnique({ where: { codigo_empleado: candidato }, select: { id_empleado: true } })) {
          codigo = candidato;
          break;
        }
      }
      if (!codigo) throw new Error('No se pudo reservar un código de empleado');

      const salt = randomBytes(16).toString('hex').toUpperCase();
      const [hash] = await tx.$queryRaw`
        SELECT dbo.fn_hash_password(${body.password_inicial}, ${salt}) AS hash
      `;
      const empleado = await tx.empleados.create({
        data: {
          codigo_empleado: codigo,
          sucursalid,
          id_rol: idRol,
          nombres: body.nombres.trim(),
          apellido_paterno: body.apellido_paterno.trim(),
          apellido_materno: body.apellido_materno?.trim() || null,
          nombre_completo: body.nombre_completo.trim(),
          dui: body.dui.trim(),
          fecha_nacimiento: fechaNacimiento,
          isss_numero: body.isss_numero?.trim() || null,
          afp_numero: body.afp_numero?.trim() || null,
          cargo: body.cargo.trim(),
          tipo_planilla: tipoPlanilla,
          salario_base: salario,
          fecha_ingreso: fechaIngreso,
          correo: body.correo.trim().toLowerCase(),
          tipo_contrato: body.tipo_contrato?.trim() || null,
          jornada: body.jornada?.trim() || null,
          forma_pago: body.forma_pago?.trim() || null
        }
      });
      await tx.usuarios.create({
        data: {
          id_rol: idRol,
          sucursalid,
          id_empleado: empleado.id_empleado,
          nombre_completo: empleado.nombre_completo.slice(0, 150),
          correo: body.correo.trim().toLowerCase(),
          password_hash: hash.hash,
          password_salt: salt,
          debe_cambiar_password: true
        }
      });
      return empleado;
    }, { isolationLevel: 'Serializable' });

    return res.status(201).json({ mensaje: 'Empleado y usuario registrados', empleado: serializar(resultado) });
  } catch (error) {
    console.error('Error al registrar empleado:', error);
    if (error?.code === 'P2002') return res.status(409).json({ mensaje: 'El DUI, correo o código ya está registrado' });
    return res.status(400).json({ mensaje: 'No se pudo registrar el empleado; verifique rol, sucursal y datos' });
  }
});

//Ruta para ver si el usuario tiene permiso 
router.post('/inventario', requerirPermiso('gestionar_inventario'), async (req, res) => {
  const sucursalid = Number(req.body?.sucursalid);
  const insumoid = Number(req.body?.insumoid);
  const stock_minimo = Number(req.body?.stock_minimo ?? 0);
  if (!Number.isInteger(sucursalid) || sucursalid <= 0 ||
      !Number.isInteger(insumoid) || insumoid <= 0 ||
      !Number.isFinite(stock_minimo) || stock_minimo < 0) {
    return res.status(400).json({ mensaje: 'Sucursal, insumo o stock mínimo inválidos' });
  }
  try {
    const registro = await prisma.inventario_sucursal.create({
      data: { sucursalid, insumoid, stock_actual: 0, stock_minimo }
    });
    return res.status(201).json({ registro });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ mensaje: 'El insumo ya está registrado en esa sucursal' });
    console.error('Error al asignar insumo a sucursal:', error);
    return res.status(400).json({ mensaje: 'No se pudo asignar el insumo a la sucursal' });
  }
});

//Ruta para consultar el perfil de un usuario para ver si tiene permiso 
router.post('/recetas', requerirPermiso('gestionar_productos'), async (req, res) => {
  const id_producto = Number(req.body?.id_producto);
  const id_insumo = Number(req.body?.id_insumo);
  const cantidad_requerida = Number(req.body?.cantidad_requerida);
  if (!Number.isInteger(id_producto) || id_producto <= 0 ||
      !Number.isInteger(id_insumo) || id_insumo <= 0 ||
      !Number.isFinite(cantidad_requerida) || cantidad_requerida <= 0) {
    return res.status(400).json({ mensaje: 'Producto, insumo o cantidad de receta inválidos' });
  }
  try {
    const receta = await prisma.recetas_detalle.create({
      data: { id_producto, id_insumo, cantidad_requerida }
    });
    return res.status(201).json({ receta });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ mensaje: 'Ese insumo ya está en la receta' });
    console.error('Error al guardar receta:', error);
    return res.status(400).json({ mensaje: 'No se pudo guardar la receta' });
  }
});

//Ruta para registrar un movimiento en el inventario 
router.post('/compras', requerirPermiso('registrar_compras'), async (req, res) => {
  const { id_proveedor, sucursalid, numero_factura_proveedor, lineas } = req.body ?? {};
  const proveedorId = Number(id_proveedor);
  const branchId = Number(sucursalid);
  if (!Number.isInteger(proveedorId) || proveedorId <= 0 ||
      !Number.isInteger(branchId) || branchId <= 0 ||
      typeof numero_factura_proveedor !== 'string' || !numero_factura_proveedor.trim() ||
      !Array.isArray(lineas) || !lineas.length) {
    return res.status(400).json({ mensaje: 'Datos de compra incompletos' });
  }

  const cantidades = new Map();
  for (const linea of lineas) {
    const insumoid = Number(linea?.id_insumo);
    const cantidad = Number(linea?.cantidad);
    const costo = Number(linea?.costo_unitario);
    if (!Number.isInteger(insumoid) || insumoid <= 0 ||
        !Number.isFinite(cantidad) || cantidad <= 0 ||
        !Number.isFinite(costo) || costo < 0) {
      return res.status(400).json({ mensaje: 'Una línea de compra tiene datos inválidos' });
    }
    const actual = cantidades.get(insumoid) ?? { cantidad: 0, costo_unitario: costo };
    if (actual.costo_unitario !== costo) {
      return res.status(400).json({ mensaje: 'No repita un insumo con costos unitarios distintos' });
    }
    actual.cantidad += cantidad;
    cantidades.set(insumoid, actual);
  }

  try {
    const compra = await prisma.$transaction(async (tx) => {
      const detalles = [...cantidades].map(([id_insumo, item]) => ({
        id_insumo,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario,
        subtotal: Math.round(item.cantidad * item.costo_unitario * 100) / 100
      }));
      const subtotal = Math.round(detalles.reduce((total, item) => total + item.subtotal, 0) * 100) / 100;
      const iva = Math.round(subtotal * 0.13 * 100) / 100;
      const nuevaCompra = await tx.compras.create({
        data: {
          id_proveedor: proveedorId,
          sucursalid: branchId,
          numero_factura_proveedor: numero_factura_proveedor.trim(),
          subtotal,
          iva,
          total_compra: subtotal + iva,
          estado_pago: 'pendiente',
          estado_documento: 'registrada',
          compra_detalle: { create: detalles }
        }
      });

      for (const detalle of detalles) {
        await tx.inventario_sucursal.upsert({
          where: { sucursalid_insumoid: { sucursalid: branchId, insumoid: detalle.id_insumo } },
          create: {
            sucursalid: branchId,
            insumoid: detalle.id_insumo,
            stock_actual: detalle.cantidad,
            stock_minimo: 0
          },
          update: { stock_actual: { increment: detalle.cantidad } }
        });
        await tx.movimientos_inventario.create({
          data: {
            sucursalid: branchId,
            insumoid: detalle.id_insumo,
            id_usuario: req.usuario.id_usuario,
            tipo_movimiento: 'entrada',
            cantidad: detalle.cantidad,
            referencia: nuevaCompra.numero_factura_proveedor
          }
        });
      }

      return tx.compras.findUnique({
        where: { id_compra: nuevaCompra.id_compra },
        include: { compra_detalle: true }
      });
    }, { isolationLevel: 'Serializable' });
    return res.status(201).json({ mensaje: 'Compra registrada e inventario actualizado', compra: serializar(compra) });
  } catch (error) {
    console.error('Error al registrar compra:', error);
    return res.status(400).json({ mensaje: 'No se pudo registrar la compra; revise proveedor, sucursal e insumos' });
  }
});

//Ruta para abrir una caja en una sucursal 
router.post('/cajas/abrir', requerirPermiso('operar_caja'), async (req, res) => {
  const sucursalid = Number(req.body?.sucursalid);
  const monto_apertura = Number(req.body?.monto_apertura);
  if (!Number.isInteger(sucursalid) || sucursalid <= 0 ||
      !Number.isFinite(monto_apertura) || monto_apertura < 0) {
    return res.status(400).json({ mensaje: 'Sucursal o monto de apertura inválidos' });
  }
  try {
    const caja = await prisma.cajas.create({
      data: {
        id_usuario: req.usuario.id_usuario,
        sucursalid,
        nombre_caja: typeof req.body.nombre_caja === 'string' ? req.body.nombre_caja : null,
        monto_apertura,
        estado: 'abierta'
      }
    });
    return res.status(201).json({ caja });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ mensaje: 'Ya existe una caja abierta en esa sucursal' });
    console.error('Error al abrir caja:', error);
    return res.status(400).json({ mensaje: 'No se pudo abrir la caja' });
  }
});

//Ruta para registrar un movimiento en caja (sea un retiro, ingreso o pago a proveedor)
router.post('/cajas/:id/movimientos', requerirPermiso('operar_caja'), async (req, res) => {
  const cajaid = Number(req.params.id);
  const monto = Number(req.body?.monto);
  const tipos = ['retiro', 'ingreso_extra', 'pago_proveedor'];
  if (!Number.isInteger(cajaid) || cajaid <= 0 || !Number.isFinite(monto) || monto <= 0 ||
      !tipos.includes(req.body?.tipo_movimiento)) {
    return res.status(400).json({ mensaje: 'Datos del movimiento de caja inválidos' });
  }
  try {
    const movimiento = await prisma.$transaction(async (tx) => {
      const caja = await tx.cajas.findUnique({ where: { id_caja: cajaid } });
      if (!caja || caja.estado !== 'abierta') return null;
      return tx.movimientos_caja.create({
        data: {
          cajaid,
          tipo_movimiento: req.body.tipo_movimiento,
          monto,
          motivo: typeof req.body.motivo === 'string' ? req.body.motivo : null
        }
      });
    });
    if (!movimiento) return res.status(404).json({ mensaje: 'Caja inexistente o cerrada' });
    return res.status(201).json({ movimiento: serializar(movimiento) });
  } catch (error) {
    console.error('Error al registrar movimiento de caja:', error);
    return res.status(400).json({ mensaje: 'No se pudo registrar el movimiento' });
  }
});

// Ruta para cerrar una caja que este abierta 
router.post('/cajas/:id/cerrar', requerirPermiso('operar_caja'), async (req, res) => {
  const id_caja = Number(req.params.id);
  const monto_cierre_fisico = Number(req.body?.monto_cierre_fisico);
  if (!Number.isInteger(id_caja) || id_caja <= 0 ||
      !Number.isFinite(monto_cierre_fisico) || monto_cierre_fisico < 0) {
    return res.status(400).json({ mensaje: 'Id de caja o monto físico inválidos' });
  }
  try {
    const cierre = await prisma.$transaction(async (tx) => {
      const caja = await tx.cajas.findUnique({ where: { id_caja } });
      if (!caja || caja.estado !== 'abierta') return null;
      const pagos = await tx.pagos.aggregate({
        where: {
          metodo_pago: 'Efectivo',
          ventas: {
            sucursalid: caja.sucursalid,
            fecha_hora: { gte: caja.fecha_apertura }
          }
        },
        _sum: { monto: true }
      });
      const movimientos = await tx.movimientos_caja.findMany({ where: { cajaid: id_caja } });
      const extra = movimientos.reduce((total, item) =>
        total + (item.tipo_movimiento === 'ingreso_extra' ? Number(item.monto) : -Number(item.monto)), 0);
      const monto_cierre_sistema = Math.max(
        0,
        Math.round((Number(caja.monto_apertura) + Number(pagos._sum.monto ?? 0) + extra) * 100) / 100
      );
      return tx.cajas.update({
        where: { id_caja },
        data: {
          fecha_cierre: new Date(),
          monto_cierre_sistema,
          monto_cierre_fisico,
          diferencia: Math.round((monto_cierre_fisico - monto_cierre_sistema) * 100) / 100,
          estado: 'cerrada',
          observaciones_cierre: typeof req.body.observaciones === 'string' ? req.body.observaciones : null
        }
      });
    }, { isolationLevel: 'Serializable' });
    if (!cierre) return res.status(404).json({ mensaje: 'Caja inexistente o ya cerrada' });
    return res.json({ mensaje: 'Caja cerrada', caja: serializar(cierre) });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    return res.status(500).json({ mensaje: 'No se pudo cerrar la caja' });
  }
});

// Ruta para crear un nuevo registro de un recurso
router.post('/:recurso', autorizarRecurso('escritura'), async (req, res) => {
  const recurso = recursos[req.params.recurso];
  if (!recurso?.crear) return res.status(405).json({ mensaje: 'Este módulo no permite crear registros por esta ruta' });
  const data = filtrarCampos(req.body, recurso.crear);
  if (!data || !Object.keys(data).length) {
    return res.status(400).json({ mensaje: 'Los datos contienen campos no permitidos o están vacíos' });
  }

  try {
    const registro = await prisma[recurso.modelo].create({ data });
    return res.status(201).json({ registro: serializar(registro) });
  } catch (error) {
    console.error(`Error al crear registro en ${req.params.recurso}:`, error);
    return res.status(400).json({ mensaje: 'No se pudo crear el registro; revise los datos y relaciones' });
  }
});

// Ruta para actualizar un registro existente
router.patch('/:recurso/:id', autorizarRecurso('escritura'), async (req, res) => {
  const recurso = recursos[req.params.recurso];
  if (!recurso?.editar || !recurso.id) {
    return res.status(405).json({ mensaje: 'Este módulo no permite modificar registros por esta ruta' });
  }
  const id = crearId(recurso, req.params.id);
  const data = filtrarCampos(req.body, recurso.editar);
  if (id === null || !data || !Object.keys(data).length) {
    return res.status(400).json({ mensaje: 'Identificador o campos de actualización inválidos' });
  }

  try {
    const registro = await prisma[recurso.modelo].update({
      where: { [recurso.id]: id },
      data
    });
    return res.json({ registro: serializar(registro) });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ mensaje: 'Registro no encontrado' });
    console.error(`Error al actualizar ${req.params.recurso}:`, error);
    return res.status(400).json({ mensaje: 'No se pudo actualizar el registro' });
  }
});

export default router;