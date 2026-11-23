import forkKnifeIcon from './assets/fork-knife.svg';
import receiptIcon from './assets/receipt.svg';
import boxesIcon from './assets/boxes.svg';
import calculatorIcon from './assets/calculator.svg';
import peopleIcon from './assets/people.svg';
import walletIcon from './assets/wallet2.svg';
import resumeIcon from './assets/columns-gap.svg';
import truckIcon from './assets/truck.svg';
import menuIcon from './assets/card-text.svg';
import userIcon from './assets/person.svg';
import reportIcon from './assets/briefcase.svg';

const modulos = [
    { id: 'inicio', name: 'Inicio', icon: resumeIcon },
    { id: 'ventas', name: 'Ventas y pedidos', icon: forkKnifeIcon, permisos: ['tomar_pedidos', 'ver_ventas', 'ver_pedidos_cocina'] },
    { id: 'reservas', name: 'Reservas y mesas', icon: receiptIcon, permisos: ['ver_reservas', 'gestionar_reservas', 'ver_mis_reservas', 'ver_reservas_disponibles'] },
    { id: 'caja', name: 'Caja', icon: walletIcon, permisos: ['operar_caja'] },
    { id: 'inventario', name: 'Inventario', icon: boxesIcon, permisos: ['ver_inventario', 'gestionar_inventario'] },
    { id: 'compras', name: 'Compras y proveedores', icon: truckIcon, permisos: ['ver_compras', 'registrar_compras', 'ver_proveedores'] },
    { id: 'productos', name: 'Menú y productos', icon: menuIcon, permisos: ['ver_menu', 'gestionar_productos'] },
    { id: 'empleados', name: 'Empleados', icon: peopleIcon, permisos: ['ver_empleados', 'registrar_empleados', 'ver_mi_ficha'] },
    { id: 'planillas', name: 'Planillas', icon: calculatorIcon, permisos: ['ver_planillas', 'generar_planillas', 'ver_mi_planilla'] },
    { id: 'usuarios', name: 'Usuarios', icon: userIcon, permisos: ['gestionar_usuarios'] },
    { id: 'administracion', name: 'Administración', icon: menuIcon, permisos: ['gestionar_roles_permisos', 'gestionar_sucursales'] },
    { id: 'reportes', name: 'Reportes', icon: reportIcon, permisos: ['ver_reportes'] },
    { id: 'perfil', name: 'Mi perfil', icon: userIcon, permisos: ['ver_mi_perfil'] }
];

export function modulosPermitidos(permisos = []) {
    const conjunto = new Set(permisos);
    return modulos.filter((modulo) =>
        !modulo.permisos || modulo.permisos.some((permiso) => conjunto.has(permiso))
    );
}
