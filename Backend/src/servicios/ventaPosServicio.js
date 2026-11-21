/*Instancia de Prisma conectada a SQL Server*/
import prisma from '../config/prisma.js';

/*Impuesto a la Transferencia de Bienes Muebles y a la
Prestación de Servicios (13% en El Salvador)*/
const TASA_IVA_SV = 0.13;

/*Redondea montos monetarios en USD a dos decimales de forma segura*/
function redondearUsd(valor) {
  /*Evita errores de coma flotante en moneda*/
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

/*Registra una venta POS de forma atómica: valida stock,
calcula IVA y descuenta insumos por receta*/
export async function registrarVentaPos({ sucursal, items }) {
  /*1. Valida que existan sucursal e ítems en la venta*/
  if (!sucursal || typeof sucursal !== 'string') {
    /*Rechaza ventas sin sucursal válida*/
    throw new Error('La sucursal es obligatoria para registrar la venta.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    /*Evita ventas vacías*/
    throw new Error('La venta debe contener al menos un producto.');
  }

  /*2. Ejecuta toda la operación dentro de una transacción de
  base de datos*/
  return prisma.$transaction(async (tx) => {
    /*Mapa id_insumo -> { insumo, cantidadTotal }*/
    const consumosAcumulados = new Map();
    /*Suma de precios unitarios por cantidad antes de impuestos*/
    let subtotalBruto = 0;

    /*3. Recorre cada producto vendido para validar existencia
    y calcular consumo de insumos*/
    for (const item of items) {
      /*Cantidad de unidades solicitadas del producto*/
      const cantidadVendida = Number(item.cantidad);
      if (!Number.isFinite(cantidadVendida) || cantidadVendida <= 0) {
        /*Valida cantidad positiva*/
        throw new Error('La cantidad de cada producto debe ser mayor a cero.');
      }

      /*Busca el producto y su receta asociada en la base de datos*/
      const producto = await tx.productos.findUnique({
        /*Localiza el producto por su ID*/
        where: { id_producto: item.id_producto },
        include: {
          recetas_detalle: {
            /*Incluye datos actuales del insumo
            (stock_actual, unidad_medida, nombre)*/
            include: {
              insumos: true,
            },
          },
        },
      });

      if (!producto) {
        /*Falla si el producto no existe*/
        throw new Error(`Producto no encontrado (ID: ${item.id_producto}).`);
      }

      /*Acumula el importe del ítem en USD*/
      subtotalBruto += Number(producto.precio_venta) * cantidadVendida;

      /*Verifica que el producto tenga receta definida para descontar
      inventario*/
      if (!producto.recetas_detalle || producto.recetas_detalle.length === 0) {
        /*Exige receta o vínculo de reventa*/
        throw new Error(`El producto "${producto.nombre}" no tiene receta configurada.`);
      }

      /*4. Calcula cuánto de cada insumo requiere este ítem
      (explosión de receta)*/
      for (const detalle of producto.recetas_detalle) {
        /*Insumo total necesario según cantidad vendida*/
        const requerimientoTotal = Number(detalle.cantidad_requerida) * cantidadVendida;
        /*Revisa si ya se acumuló este insumo en el pedido*/
        const actual = consumosAcumulados.get(detalle.id_insumo);

        if (actual) {
          /*Suma si varios productos usan el mismo insumo*/
          actual.cantidadTotal += requerimientoTotal;
        } else {
          /*Inicializa consumo acumulado para el insumo*/
          consumosAcumulados.set(detalle.id_insumo, {
            insumo: detalle.insumos,
            cantidadTotal: requerimientoTotal,
          });
        }
      }
    }

    /*5. Verifica stock suficiente para todos los insumos
    acumulados antes de descontar*/
    for (const [idInsumo, entrada] of consumosAcumulados.entries()) {
      /*Existencia actual en inventario*/
      const stockDisponible = Number(entrada.insumo.stock_actual);
      if (stockDisponible < entrada.cantidadTotal) {
        /*Cancela la transacción completa si falta algún insumo*/
        throw new Error(
          `Stock insuficiente de "${entrada.insumo.nombre}": se requieren ${entrada.cantidadTotal} ${entrada.insumo.unidad_medida} y hay ${stockDisponible}.`
        );
      }
    }

    /*6. Descuenta de forma atómica cada insumo en la tabla insumos*/
    for (const [idInsumo, entrada] of consumosAcumulados.entries()) {
      await tx.insumos.update({
        /*Actualiza el insumo correspondiente*/
        where: { id_insumo: idInsumo },
        data: {
          stock_actual: {
            /*Resta exactamente la cantidad consumida por la venta*/
            decrement: entrada.cantidadTotal,
          },
        },
      });
    }

    /*7. Calcula subtotal, IVA del 13% y total en USD*/
    /*Subtotal redondeado en USD*/
    const subtotal = redondearUsd(subtotalBruto);
    /*IVA 13% sobre el subtotal*/
    const iva = redondearUsd(subtotal * TASA_IVA_SV);
    /*Total final a cobrar en USD*/
    const total = redondearUsd(subtotal + iva);

    /*8. Registra la cabecera de la venta y el detalle de
    productos vendidos*/
    const ventaCreada = await tx.ventas.create({
      data: {
        /*Sucursal donde se realizó la venta (Escalón, Santa Tecla, San Miguel)*/
        sucursal,
        /*Monto sin IVA en USD*/
        subtotal,
        /*Monto del IVA 13% en USD*/
        iva,
        /*Total final en USD*/
        total,
        detalles: {
          create: items.map((item) => ({
            /*Producto vendido*/
            id_producto: item.id_producto,
            /*Unidades vendidas*/
            cantidad: Number(item.cantidad),
          })),
        },
      },
      include: {
        /*Retorna también las líneas de detalle creadas*/
        detalles: true,
      },
    });

    /*9. Devuelve el resumen completo de la venta registrada*/
    return {
      /*Registro guardado en la tabla ventas*/
      venta: ventaCreada,
      resumenCobro: {
        /*Moneda oficial de la operación*/
        moneda: 'USD',
        /*Subtotal en USD*/
        subtotal,
        /*Porcentaje de IVA aplicado*/
        ivaPorcentaje: 13,
        /*IVA en USD*/
        iva,
        /*Total final en USD*/
        total,
      },
    };
  });
}