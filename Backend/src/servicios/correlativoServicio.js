/*Prefijos cortos por sucursal para identificar el origen del comprobante*/
const PREFIJOS_SUCURSAL = {
  escalon: 'ESC',
  'santa tecla': 'STC',
  'san miguel': 'SMG',
};

/*Prefijos por tipo de documento operativo o fiscal*/
const PREFIJOS_DOCUMENTO = {
  ticket: 'TKT',
  factura: 'FAC',
  ccf: 'CCF',
};

/*Normaliza un texto quitando tildes y pasándolo a minúsculas*/
function normalizarClave(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/*Formatea un número entero positivo con ceros a la izquierda (ej. 000001)*/
function formatearCorrelativo(numero, longitud = 6) {
  const entero = Math.max(1, Math.trunc(Number(numero) || 1));
  return String(entero).padStart(longitud, '0');
}

/*Calcula el siguiente correlativo formateado a partir del último número registrado*/
export function construirSiguienteCorrelativo({ sucursal, tipoDocumento = 'ticket', ultimoNumero = 0 }) {
  /*Valida que venga una sucursal válida*/
  if (!sucursal || typeof sucursal !== 'string' || !sucursal.trim()) {
    throw new Error('La sucursal es obligatoria para generar el correlativo.');
  }

  /*Obtiene la clave normalizada de la sucursal y arma el prefijo*/
  const claveSucursal = normalizarClave(sucursal);
  const prefijoSucursal =
    PREFIJOS_SUCURSAL[claveSucursal] ||
    claveSucursal.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase() ||
    'SUC';

  /*Obtiene el prefijo del tipo de documento*/
  const claveDoc = normalizarClave(tipoDocumento);
  const prefijoDoc = PREFIJOS_DOCUMENTO[claveDoc] || claveDoc.slice(0, 3).toUpperCase() || 'DOC';

  /*Calcula el siguiente número secuencial y lo formatea*/
  const siguienteNumero = Number(ultimoNumero || 0) + 1;
  const secuenciaFormateada = formatearCorrelativo(siguienteNumero, 6);

  /*Devuelve tanto el número secuencial como el código legible completo*/
  return {
    numero: siguienteNumero,
    codigo: `${prefijoSucursal}-${prefijoDoc}-${secuenciaFormateada}`,
  };
}

/*Obtiene y reserva el siguiente correlativo dentro de una transacción de Prisma*/
export async function reservarCorrelativoEnTransaccion(tx, { sucursal, tipoDocumento = 'ticket' }) {
  /*Valida que exista la transacción de Prisma*/
  if (!tx) {
    throw new Error('Se requiere una transacción activa para reservar el correlativo.');
  }

  /*Busca el último registro existente para la misma sucursal si existe tabla correlativos o ventas*/
  if (tx.correlativos) {
    /*Busca el registro de correlativo para sucursal y tipo de documento*/
    const actual = await tx.correlativos.findFirst({
      where: {
        sucursal,
        tipo_documento: tipoDocumento,
      },
    });

    /*Si ya existe un contador, lo incrementa de forma atómica*/
    if (actual) {
      const siguiente = Number(actual.ultimo_numero || 0) + 1;
      await tx.correlativos.update({
        where: { id_correlativo: actual.id_correlativo },
        data: { ultimo_numero: siguiente },
      });
      return construirSiguienteCorrelativo({
        sucursal,
        tipoDocumento,
        ultimoNumero: actual.ultimo_numero,
      });
    }

    /*Si no existe contador previo, crea el primero en 1*/
    await tx.correlativos.create({
      data: {
        sucursal,
        tipo_documento: tipoDocumento,
        ultimo_numero: 1,
      },
    });

    return construirSiguienteCorrelativo({
      sucursal,
      tipoDocumento,
      ultimoNumero: 0,
    });
  }

  /*Respaldo si aún no existe modelo correlativos en schema.prisma: cuenta ventas de la sucursal*/
  const totalVentasSucursal = await tx.ventas.count({
    where: { sucursal },
  });

  return construirSiguienteCorrelativo({
    sucursal,
    tipoDocumento,
    ultimoNumero: totalVentasSucursal,
  });
}