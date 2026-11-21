/*Instancia de Prisma conectada a SQL Server*/
import prisma from '../config/prisma.js';

/*Consulta en tiempo real el stock disponible de los insumos
requeridos por una lista de productos y cantidades*/
export async function consultarDisponibilidadStockPos(items) {
  /*Valida que la lista de ítems sea un arreglo válido*/
  if (!Array.isArray(items) || items.length === 0) {
    /*Retorna disponible sin requerimiento si no hay ítems*/
    return { disponible: true, faltantes: [] };
  }

  /*Mapa id_insumo -> { id_insumo, nombre, unidad_medida, stock_actual, requerido }*/
  const requerimientos = new Map();

  /*Recorre cada ítem del carrito para acumular sus insumos*/
  for (const item of items) {
    /*Cantidad solicitada convertida a número*/
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      /*Ignora o rechaza cantidades no válidas*/
      continue;
    }

    /*Busca el producto con su receta e insumos actuales*/
    const producto = await prisma.productos.findUnique({
      /*Filtra por identificador del producto*/
      where: { id_producto: item.id_producto },
      include: {
        recetas_detalle: {
          /*Trae los datos del insumo vinculado*/
          include: {
            insumos: true,
          },
        },
      },
    });

    if (!producto || !producto.recetas_detalle) {
      /*Continúa si el producto no existe o no tiene receta*/
      continue;
    }

    /*Acumula el insumo requerido por cada línea de receta*/
    for (const detalle of producto.recetas_detalle) {
      /*Total necesario de este insumo para el ítem actual*/
      const necesario = Number(detalle.cantidad_requerida) * cantidad;
      /*Busca si el insumo ya fue agregado al mapa*/
      const actual = requerimientos.get(detalle.id_insumo);

      if (actual) {
        /*Suma el requerimiento adicional al acumulado*/
        actual.requerido += necesario;
      } else {
        /*Crea la entrada inicial del insumo en el mapa*/
        requerimientos.set(detalle.id_insumo, {
          id_insumo: detalle.id_insumo,
          nombre: detalle.insumos.nombre,
          unidad_medida: detalle.insumos.unidad_medida,
          stock_actual: Number(detalle.insumos.stock_actual),
          requerido: necesario,
        });
      }
    }
  }

  /*Lista de insumos cuyo stock actual no cubre lo requerido*/
  const faltantes = [];

  /*Compara stock disponible contra el consumo acumulado*/
  for (const entrada of requerimientos.values()) {
    if (entrada.stock_actual < entrada.requerido) {
      /*Registra el detalle del faltante para mostrarlo en el POS*/
      faltantes.push({
        id_insumo: entrada.id_insumo,
        nombre: entrada.nombre,
        unidad_medida: entrada.unidad_medida,
        stock_actual: entrada.stock_actual,
        requerido: entrada.requerido,
        faltante: Number((entrada.requerido - entrada.stock_actual).toFixed(4)),
      });
    }
  }

  /*Devuelve si todo alcanza y qué insumos faltan si no*/
  return {
    disponible: faltantes.length === 0,
    faltantes,
  };
}

/*Descuenta de forma segura dentro de una transacción verificando
que el stock siga siendo suficiente al momento de actualizar*/
export async function descontarStockSeguroEnTransaccion(tx, consumosAcumulados) {
  /*Recorre cada insumo acumulado en la venta*/
  for (const [idInsumo, entrada] of consumosAcumulados.entries()) {
    /*Cantidad exacta a descontar de stock_actual*/
    const cantidadDescontar = Number(entrada.cantidadTotal);

    /*Actualización condicional: solo descuenta si stock_actual >= cantidadDescontar*/
    const resultado = await tx.insumos.updateMany({
      where: {
        id_insumo: idInsumo,
        stock_actual: {
          gte: cantidadDescontar,
        },
      },
      data: {
        stock_actual: {
          decrement: cantidadDescontar,
        },
      },
    });

    /*Si no se actualizó ninguna fila, otro proceso consumió el stock antes*/
    if (resultado.count === 0) {
      /*Lanza error para abortar toda la transacción de venta*/
      throw new Error(
        `Conflicto de stock en tiempo real para "${entrada.insumo.nombre}": no hay existencias suficientes para completar la venta.`
      );
    }
  }
}