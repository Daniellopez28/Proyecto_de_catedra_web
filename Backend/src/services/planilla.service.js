//Archivo que contiene las funiciones para calcular la planilla de un empleado, su salario bruto y sus deducciones de ISSS, AFP y Renta

// Constante que define la tasa de cotización del ISSS (3%) aplicada al salario cotizable
const tasaIsss = 0.03;
// Constante que define la tasa de cotización de AFP (7.25%) aplicada sobre el salario bruto
const tasaAfp = 0.0725;
// Constante que establece el tope salarial quincenal ($500) para el cálculo del ISSS
const techoIsssQuincenal = 500;

// Constante que define los tramos de retención de renta quincenal con límite superior, exceso, porcentaje y cuota fija
const tramosRentaQuincenal = [
  { hasta: 275, exceso_sobre: 0, porcentaje: 0, cuota_fija: 0 },
  { hasta: 447.62, exceso_sobre: 275, porcentaje: 0.1, cuota_fija: 8.83 },
  { hasta: 1019.05, exceso_sobre: 447.62, porcentaje: 0.2, cuota_fija: 30 },
  { hasta: null, exceso_sobre: 1019.05, porcentaje: 0.3, cuota_fija: 144.28 }
];

//export para redondear el valor de un numero a dos decimales 
export function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

//Export para calcular la renta quincenar a partir de la base gravada osea el salario bruto menos sus deducciones
export function calcularRentaQuincenal(baseGravada) {
  const tramo = tramosRentaQuincenal.find((item) => item.hasta === null || baseGravada <= item.hasta);
  if (!tramo || tramo.porcentaje === 0) return 0;
  return redondear(tramo.cuota_fija + (baseGravada - tramo.exceso_sobre) * tramo.porcentaje);
}

//export para calcular su salario mensual
export function calcularPlanillaEmpleado(salarioBaseMensual) {
  const bruto = redondear(Number(salarioBaseMensual) / 2);
  const isss = redondear(Math.min(bruto, techoIsssQuincenal) * tasaIsss);
  const afp = redondear(bruto * tasaAfp);
  const renta = calcularRentaQuincenal(redondear(bruto - isss - afp));
  return {
    salario_bruto: bruto,
    descuento_isss: isss,
    descuento_afp: afp,
    descuento_renta: renta,
    salario_neto: redondear(bruto - isss - afp - renta)
  };
}

// Constante exportada con alias en snake_case que apunta a calcularPlanillaEmpleado para compatibilidad de nombres
export const calcular_planilla_empleado = calcularPlanillaEmpleado;