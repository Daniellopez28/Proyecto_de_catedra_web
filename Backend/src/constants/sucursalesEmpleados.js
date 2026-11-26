//archivo para  definir las sucursales de empleados y sus nombres base, para poder usarlas en el backend y en el frontend de manera consistente.
export const sucursalesEmpleados = Object.freeze([
    { nombreBase: 'escalon', nombre: 'Escalon' },
    { nombreBase: 'mejicanos', nombre: 'Mejicanos' },
    { nombreBase: 'santa elena', nombre: 'Santa Elena' }
]);

export const nombresBaseSucursalesEmpleados = Object.freeze(
    sucursalesEmpleados.map((sucursal) => sucursal.nombreBase)
);

export function etiquetaSucursalEmpleado(nombreBase) {
    const nombreNormalizado = String(nombreBase).trim().toLocaleLowerCase('es-SV');
    return sucursalesEmpleados.find((sucursal) => sucursal.nombreBase === nombreNormalizado)?.nombre ??
        nombreBase;
}
