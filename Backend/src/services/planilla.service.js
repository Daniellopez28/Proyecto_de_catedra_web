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