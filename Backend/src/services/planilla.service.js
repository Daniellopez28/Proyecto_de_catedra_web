// constantes legales de el salvador para planilla quincenal
const tasa_isss = 0.03;
const tasa_afp = 0.0725;
const techo_isss_quincenal = 500; // techo mensual de 1000 entre 2

// tabla de retencion de renta quincenal (decreto ejecutivo no. 10, 2025)
const tramos_renta_quincenal = [
  { hasta: 275.0, exceso_sobre: 0, porcentaje: 0, cuota_fija: 0 },
  { hasta: 447.62, exceso_sobre: 275.0, porcentaje: 0.1, cuota_fija: 8.83 },
  { hasta: 1019.05, exceso_sobre: 447.62, porcentaje: 0.2, cuota_fija: 30.0 },
  { hasta: null, exceso_sobre: 1019.05, porcentaje: 0.3, cuota_fija: 144.28 },
];

// redondea a 2 decimales evitando errores de punto flotante
export function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// recibe la base gravada (bruto - isss - afp) y devuelve la renta a retener
export function calcular_renta_quincenal(base_gravada) {
  const tramo = tramos_renta_quincenal.find(
    (t) => t.hasta === null || base_gravada <= t.hasta
  );

  if (tramo.porcentaje === 0) return 0;

  const exceso = base_gravada - tramo.exceso_sobre;
  return redondear(tramo.cuota_fija + exceso * tramo.porcentaje);
}

// calcula todos los descuentos de un empleado para una quincena
export function calcular_planilla_empleado(salario_base_mensual) {
  const salario_bruto = redondear(Number(salario_base_mensual) / 2);
  const descuento_isss = redondear(
    Math.min(salario_bruto, techo_isss_quincenal) * tasa_isss
  );
  const descuento_afp = redondear(salario_bruto * tasa_afp);

  // la renta se calcula despues de restar isss y afp
  const base_gravada = redondear(salario_bruto - descuento_isss - descuento_afp);
  const descuento_renta = calcular_renta_quincenal(base_gravada);

  const salario_neto = redondear(
    salario_bruto - descuento_isss - descuento_afp - descuento_renta
  );

  return { salario_bruto, descuento_isss, descuento_afp, descuento_renta, salario_neto };
}

function convertir_a_centavos(valor) {
  if ((typeof valor !== 'number' && typeof valor !== 'string') ||
      (typeof valor === 'number' && !Number.isFinite(valor))) {
    return null;
  }

  const texto = String(valor);
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;
  const [unidades, fraccion = ''] = texto.split('.');
  const centavos = Number(unidades) * 100 + Number(fraccion.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos > 9_999_999_999) return null;
  return centavos;
}

function desde_centavos(centavos) {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

export function normalizar_detalle_editable(detalle) {
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) {
    throw new TypeError('Los montos de la planilla son obligatorios');
  }

  const montos = {
    salario_bruto: convertir_a_centavos(detalle.salario_bruto),
    descuento_isss: convertir_a_centavos(detalle.descuento_isss),
    descuento_afp: convertir_a_centavos(detalle.descuento_afp),
    descuento_renta: convertir_a_centavos(detalle.descuento_renta)
  };
  if (Object.values(montos).some((monto) => monto === null)) {
    throw new TypeError('Los montos deben ser positivos y tener hasta dos decimales');
  }

  const descuentos = montos.descuento_isss + montos.descuento_afp + montos.descuento_renta;
  if (descuentos > montos.salario_bruto) {
    throw new RangeError('Los descuentos no pueden superar el salario bruto');
  }

  return {
    salario_bruto: desde_centavos(montos.salario_bruto),
    descuento_isss: desde_centavos(montos.descuento_isss),
    descuento_afp: desde_centavos(montos.descuento_afp),
    descuento_renta: desde_centavos(montos.descuento_renta),
    salario_neto: desde_centavos(montos.salario_bruto - descuentos)
  };
}
