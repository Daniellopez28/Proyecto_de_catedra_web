/*Instancia de Prisma conectada a SQL Server*/
import prisma from '../config/prisma.js';

/*Sucursales oficiales del restaurante en El Salvador*/
const SUCURSALES_OFICIALES = ['Escalón', 'Santa Tecla', 'Mejicanos'];

/*Redondea montos monetarios en USD a dos decimales*/
function redondearUsd(valor) {
  /*Evita imprecisiones de punto flotante en cálculos financieros*/
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

/*Normaliza un texto quitando tildes y pasándolo a minúsculas*/
function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/*Construye el filtro de fechas opcional para consultar ventas*/
function construirFiltroFechas({ fechaInicio, fechaFin }) {
  /*Filtro de Prisma para el campo de fecha de creación de la venta*/
  const filtroFecha = {};

  if (fechaInicio) {
    /*Convierte fecha inicial al inicio del día*/
    const inicio = new Date(fechaInicio);
    if (!Number.isNaN(inicio.getTime())) {
      inicio.setHours(0, 0, 0, 0);
      filtroFecha.gte = inicio;
    }
  }

  if (fechaFin) {
    /*Convierte fecha final al cierre del día*/
    const fin = new Date(fechaFin);
    if (!Number.isNaN(fin.getTime())) {
      fin.setHours(23, 59, 59, 999);
      filtroFecha.lte = fin;
    }
  }

  /*Retorna el objeto solo si tiene al menos un límite válido*/
  return Object.keys(filtroFecha).length > 0 ? filtroFecha : undefined;
}

/*Obtiene el reporte consolidado de ventas por sucursal y el total general en USD*/
export async function obtenerReporteConsolidado({ fechaInicio, fechaFin, sucursal } = {}) {
  /*Construye el filtro de fechas si se enviaron parámetros*/
  const rangoFecha = construirFiltroFechas({ fechaInicio, fechaFin });

  /*Arma la cláusula where para consultar la tabla ventas*/
  const where = {};
  if (rangoFecha) {
    /*Filtra ventas dentro del rango de fechas solicitado*/
    where.created_at = rangoFecha;
  }

  /*Consulta todas las ventas que cumplan con el filtro*/
  const ventas = await prisma.ventas.findMany({
    where,
    orderBy: {
      id_venta: 'desc',
    },
  });

  /*Inicializa acumuladores por cada sucursal oficial*/
  const mapaSucursales = new Map();
  for (const nombreSucursal of SUCURSALES_OFICIALES) {
    /*Prepara estructura base en USD para cada sucursal*/
    mapaSucursales.set(normalizarTexto(nombreSucursal), {
      sucursal: nombreSucursal,
      cantidadVentas: 0,
      subtotalUsd: 0,
      ivaUsd: 0,
      totalUsd: 0,
    });
  }

  /*Acumula cada venta en su sucursal correspondiente*/
  for (const venta of ventas) {
    /*Normaliza el nombre de sucursal guardado en la venta*/
    const clave = normalizarTexto(venta.sucursal);

    /*Si llega una sucursal adicional no listada antes, la agrega dinámicamente*/
    if (!mapaSucursales.has(clave)) {
      mapaSucursales.set(clave, {
        sucursal: venta.sucursal || 'Sin sucursal',
        cantidadVentas: 0,
        subtotalUsd: 0,
        ivaUsd: 0,
        totalUsd: 0,
      });
    }

    /*Obtiene el acumulador de la sucursal y suma valores*/
    const resumen = mapaSucursales.get(clave);
    resumen.cantidadVentas += 1;
    resumen.subtotalUsd = redondearUsd(resumen.subtotalUsd + Number(venta.subtotal || 0));
    resumen.ivaUsd = redondearUsd(resumen.ivaUsd + Number(venta.iva || 0));
    resumen.totalUsd = redondearUsd(resumen.totalUsd + Number(venta.total || 0));
  }

  /*Convierte el mapa en arreglo y aplica filtro opcional por sucursal*/
  let porSucursal = Array.from(mapaSucursales.values());
  if (sucursal && String(sucursal).trim() !== '' && normalizarTexto(sucursal) !== 'todas') {
    const claveFiltro = normalizarTexto(sucursal);
    porSucursal = porSucursal.filter((item) => normalizarTexto(item.sucursal) === claveFiltro);
  }

  /*Calcula el consolidado general sumando las sucursales mostradas*/
  const consolidadoGeneral = porSucursal.reduce(
    (acc, item) => {
      acc.cantidadVentas += item.cantidadVentas;
      acc.subtotalUsd = redondearUsd(acc.subtotalUsd + item.subtotalUsd);
      acc.ivaUsd = redondearUsd(acc.ivaUsd + item.ivaUsd);
      acc.totalUsd = redondearUsd(acc.totalUsd + item.totalUsd);
      return acc;
    },
    {
      moneda: 'USD',
      cantidadVentas: 0,
      subtotalUsd: 0,
      ivaUsd: 0,
      totalUsd: 0,
    }
  );

  /*Retorna el desglose por sucursal y el consolidado global*/
  return {
    moneda: 'USD',
    filtrosAplicados: {
      sucursal: sucursal || 'Todas',
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
    },
    porSucursal,
    consolidadoGeneral,
  };
}