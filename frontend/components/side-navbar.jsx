// CORRECCIÓN: enlaza la navegación lateral con los módulos conectados al backend.
import '../src/side-navbar.css';

const sections = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'empleados', label: 'Empleados' },
  { id: 'planillas', label: 'Planillas' },
  { id: 'productos', label: 'Productos' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'compras', label: 'Compras' },
  { id: 'cajas', label: 'Caja' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'sucursales', label: 'Sucursales' },
  { id: 'roles', label: 'Roles' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'modificadores', label: 'Modificadores' },
  { id: 'venta_detalle', label: 'Detalle de ventas' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'compra_detalle', label: 'Detalle de compras' },
  { id: 'pagos_compra', label: 'Pagos a proveedores' },
  { id: 'movimientos_caja', label: 'Movimientos de caja' },
  { id: 'movimientos_inventario', label: 'Movimientos de inventario' },
  { id: 'planilla_detalle', label: 'Detalle de planillas' },
  { id: 'mi_perfil', label: 'Mi perfil' },
  { id: 'mis_reservas', label: 'Mis reservas' },
  { id: 'mi_ficha', label: 'Mi ficha laboral' },
  { id: 'mi_planilla', label: 'Mi planilla' },
  { id: 'niveles_acceso', label: 'Niveles de acceso' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'nivel_permiso', label: 'Permisos por nivel' },
  { id: 'detalle_venta_modificadores', label: 'Modificadores aplicados' }
];

function SideNavbar({ active, onNavigate, modulosDisponibles = [] }) {
  const nombresDisponibles = new Set(modulosDisponibles.map(({ nombre }) => nombre));

  return (
    <aside className="side-navbar">
      <div className="side-navbar-brand">Orígenes SV</div>
      <nav aria-label="Navegación principal">
        <ul className="side-navbar-menu">
          {sections.filter(({ id }) => id === 'inicio' || nombresDisponibles.has(id)).map(({ id, label }) => (
            <li className="side-navbar-item" key={id}>
              <button
                className={`side-navbar-button${active === id ? ' is-active' : ''}`}
                type="button"
                aria-current={active === id ? 'page' : undefined}
                onClick={() => onNavigate(id)}
              >
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default SideNavbar;
