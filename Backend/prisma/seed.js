// Backend/prisma/seed.js
import prisma from '../src/config/prisma.js'; // Instancia de Prisma configurada para SQL Server

// Catálogo base de roles operativos y administrativos del sistema
const ROLES_INICIALES = [
  { nombre_rol: 'Administrador', descripcion: 'Administracion del sistema' }, // Rol administrativo
  { nombre_rol: 'Cajero', descripcion: 'Ventas y operaciones de caja' }, // Rol de caja y POS
  { nombre_rol: 'Mesero', descripcion: 'Pedidos y atencion en salon' }, // Rol de atención en salón
  { nombre_rol: 'Cocinero', descripcion: 'Consulta y preparacion de pedidos' }, // Rol de cocina
  { nombre_rol: 'RRHH', descripcion: 'Personal y planillas' }, // Rol de recursos humanos
];

// Inventario inicial de materias primas, empaques y artículos de reventa
const INSUMOS_INICIALES = [
  { nombre: 'Café en grano', unidad_medida: 'g', stock_actual: 5000, stock_minimo: 500, costo_promedio: 0.02 }, // Base para espresso y latte
  { nombre: 'Leche entera', unidad_medida: 'ml', stock_actual: 20000, stock_minimo: 2000, costo_promedio: 0.0015 }, // Base para bebidas lácteas
  { nombre: 'Vaso 16oz', unidad_medida: 'unidad', stock_actual: 1000, stock_minimo: 100, costo_promedio: 0.05 }, // Vaso desechable de 16 oz
  { nombre: 'Tapadera 16oz', unidad_medida: 'unidad', stock_actual: 1000, stock_minimo: 100, costo_promedio: 0.03 }, // Tapadera para vaso de 16 oz
  { nombre: 'Viñeta', unidad_medida: 'unidad', stock_actual: 2000, stock_minimo: 200, costo_promedio: 0.01 }, // Etiqueta o viñeta de bebida
  { nombre: 'Galleta de Chocolate (reventa)', unidad_medida: 'unidad', stock_actual: 60, stock_minimo: 10, costo_promedio: 0.6 }, // Insumo de producto de reventa
];

// Productos iniciales del menú (bebida elaborada y producto de reventa)
const PRODUCTOS_INICIALES = [
  { nombre: 'Latte Grande', descripcion: 'Cafe con leche', precio_venta: 3.5, categoria: 'Bebida Caliente', es_reventa: false }, // Bebida elaborada
  { nombre: 'Galleta de Chocolate', descripcion: 'Producto empacado de reventa', precio_venta: 1.25, categoria: 'Reventa', es_reventa: true }, // Producto de reventa
];


// Cantidades de insumos requeridas por cada unidad vendida de un producto
const RECETAS_INICIALES = [
  { producto: 'Latte Grande', insumo: 'Café en grano', cantidad_requerida: 18 }, // 18 g de café por Latte Grande
  { producto: 'Latte Grande', insumo: 'Leche entera', cantidad_requerida: 250 }, // 250 ml de leche por Latte Grande
  { producto: 'Latte Grande', insumo: 'Vaso 16oz', cantidad_requerida: 1 }, // 1 vaso de 16 oz por unidad vendida
  { producto: 'Latte Grande', insumo: 'Tapadera 16oz', cantidad_requerida: 1 }, // 1 tapadera de 16 oz por unidad vendida
  { producto: 'Latte Grande', insumo: 'Viñeta', cantidad_requerida: 1 }, // 1 viñeta por unidad vendida
  { producto: 'Galleta de Chocolate', insumo: 'Galleta de Chocolate (reventa)', cantidad_requerida: 1 }, // 1 unidad descontada por galleta vendida
];

// Función principal que inserta o actualiza los datos iniciales sin duplicar registros
async function main() {
    // 1. Inserta o actualiza los roles usando nombre_rol (campo único)
  for (const rol of ROLES_INICIALES) {
    await prisma.roles.upsert({
      where: { nombre_rol: rol.nombre_rol }, // Busca por nombre de rol único
      update: { descripcion: rol.descripcion }, // Actualiza descripción si ya existe
      create: rol, // Inserta el rol si aún no existe
    });
  }

  // 2. Inserta o actualiza los insumos usando nombre (campo único)
  for (const insumo of INSUMOS_INICIALES) {
    await prisma.insumos.upsert({
      where: { nombre: insumo.nombre }, // Busca por nombre de insumo único
      update: {
        unidad_medida: insumo.unidad_medida,
        stock_minimo: insumo.stock_minimo,
        costo_promedio: insumo.costo_promedio,
      }, // Actualiza parámetros sin alterar stock_actual
      create: insumo, // Inserta el insumo si aún no existe
    });
  }

  // 3. Crea cada producto únicamente si aún no existe uno con ese nombre
  for (const prod of PRODUCTOS_INICIALES) {
    const existente = await prisma.productos.findFirst({
      where: { nombre: prod.nombre }, // Verifica si el producto ya está registrado
    });
    if (!existente) {
      await prisma.productos.create({ data: prod }); // Crea el producto solo si no existe
    }
  }

  // 4. Vincula productos con insumos en recetas_detalle usando sus IDs reales
  for (const item of RECETAS_INICIALES) {
    const producto = await prisma.productos.findFirst({ where: { nombre: item.producto } }); // Obtiene el producto
    const insumo = await prisma.insumos.findUnique({ where: { nombre: item.insumo } }); // Obtiene el insumo

    if (producto && insumo) {
      await prisma.recetas_detalle.upsert({
        where: {
          id_producto_id_insumo: {
            id_producto: producto.id_producto,
            id_insumo: insumo.id_insumo,
          }, // Clave compuesta producto + insumo
        },
        update: { cantidad_requerida: item.cantidad_requerida }, // Actualiza la cantidad requerida
        create: {
          id_producto: producto.id_producto,
          id_insumo: insumo.id_insumo,
          cantidad_requerida: item.cantidad_requerida,
        }, // Crea el vínculo de receta
      });
    }
  }

  console.log('Seed inicial de Orígenes SV completado.'); // Confirma ejecución exitosa
}

// Ejecuta el seed, captura errores con código de salida no cero y cierra la conexión
main()
  .catch((err) => {
    console.error('Error ejecutando seed:', err); // Muestra el error en consola
    process.exitCode = 1; // Marca salida con error para procesos o pipelines
  })
  .finally(async () => {
    await prisma.$disconnect(); // Cierra la conexión de Prisma al terminar
  });