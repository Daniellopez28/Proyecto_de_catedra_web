// CORRECCIÓN: muestra los módulos consultando la API y permite las operaciones habilitadas.
import { useEffect, useState } from 'react';
import { apiRequest } from '../src/api.js';

const modules = {
  sucursales: { title: 'Sucursales', endpoint: '/api/gestion/sucursales', fields: [['nombre', 'Nombre'], ['direccion', 'Dirección'], ['telefono', 'Teléfono']] },
  roles: { title: 'Roles', endpoint: '/api/gestion/roles' },
  usuarios: { title: 'Usuarios', endpoint: '/api/gestion/usuarios' },
  empleados: {
    title: 'Empleados',
    endpoint: '/api/gestion/empleados',
    accion: {
      endpoint: '/api/gestion/empleados',
      ejemplo: JSON.stringify({
        nombres: '', apellido_paterno: '', nombre_completo: '', dui: '',
        fecha_nacimiento: '1990-01-01', id_rol: 1, cargo: '',
        tipo_planilla: 'quincenal', salario_base: 0, fecha_ingreso: '2026-01-01',
        correo: '', password_inicial: ''
      }, null, 2)
    }
  },
  clientes: { title: 'Clientes', endpoint: '/api/gestion/clientes', fields: [['nombre', 'Nombre'], ['dui', 'DUI'], ['nit', 'NIT'], ['telefono', 'Teléfono'], ['correo', 'Correo'], ['direccion', 'Dirección']] },
  proveedores: { title: 'Proveedores', endpoint: '/api/gestion/proveedores', fields: [['nombre_empresa', 'Empresa'], ['contacto_nombre', 'Contacto'], ['nit', 'NIT'], ['telefono', 'Teléfono'], ['correo', 'Correo'], ['direccion', 'Dirección']] },
  productos: { title: 'Productos', endpoint: '/api/gestion/productos', fields: [['nombre', 'Nombre'], ['descripcion', 'Descripción'], ['precio_venta', 'Precio'], ['categoria', 'Categoría'], ['es_reventa', 'Reventa (true/false)']] },
  modificadores: { title: 'Modificadores', endpoint: '/api/gestion/modificadores', fields: [['nombre', 'Nombre'], ['precio', 'Precio']] },
  mesas: { title: 'Mesas', endpoint: '/api/gestion/mesas', fields: [['sucursalid', 'Sucursal'], ['numero_mesa', 'Número de mesa'], ['capacidad', 'Capacidad']] },
  inventario: {
    title: 'Inventario por sucursal',
    endpoint: '/api/inventario/insumos',
    accion: {
      endpoint: '/api/inventario/movimientos',
      ejemplo: JSON.stringify({ sucursalid: 1, insumoid: 1, tipo_movimiento: 'entrada', cantidad: 1, referencia: '' }, null, 2)
    }
  },
  recetas: {
    title: 'Recetas',
    endpoint: '/api/gestion/recetas',
    accion: {
      endpoint: '/api/gestion/recetas',
      ejemplo: JSON.stringify({ id_producto: 1, id_insumo: 1, cantidad_requerida: 1 }, null, 2)
    }
  },
  ventas: {
    title: 'Ventas',
    endpoint: '/api/gestion/ventas',
    accion: {
      endpoint: '/api/ventas',
      ejemplo: JSON.stringify({
        tipoDocumento: 'Factura', sucursalid: 1, productos: [{ id_producto: 1, cantidad: 1 }],
        metodoPago: 'Efectivo'
      }, null, 2)
    }
  },
  venta_detalle: { title: 'Detalle de ventas', endpoint: '/api/gestion/venta_detalle' },
  pagos: { title: 'Pagos', endpoint: '/api/gestion/pagos' },
  compras: {
    title: 'Compras',
    endpoint: '/api/gestion/compras',
    accion: {
      endpoint: '/api/gestion/compras',
      ejemplo: JSON.stringify({
        id_proveedor: 1, sucursalid: 1, numero_factura_proveedor: '',
        lineas: [{ id_insumo: 1, cantidad: 1, costo_unitario: 0 }]
      }, null, 2)
    }
  },
  compra_detalle: { title: 'Detalle de compras', endpoint: '/api/gestion/compra_detalle' },
  pagos_compra: { title: 'Pagos a proveedores', endpoint: '/api/gestion/pagos_compra' },
  cajas: {
    title: 'Cajas',
    endpoint: '/api/gestion/cajas',
    accion: {
      endpoint: '/api/gestion/cajas/abrir',
      ejemplo: JSON.stringify({ sucursalid: 1, monto_apertura: 0 }, null, 2)
    }
  },
  movimientos_caja: { title: 'Movimientos de caja', endpoint: '/api/gestion/movimientos_caja' },
  movimientos_inventario: { title: 'Movimientos de inventario', endpoint: '/api/gestion/movimientos_inventario' },
  planillas: {
    title: 'Planillas',
    endpoint: '/api/planillas',
    accion: {
      endpoint: '/api/planillas/generar',
      ejemplo: JSON.stringify({ periodo_inicio: '2026-11-01', periodo_fin: '2026-11-15' }, null, 2)
    }
  },
  planilla_detalle: { title: 'Detalle de planillas', endpoint: '/api/gestion/planilla_detalle' },
  mi_perfil: { title: 'Mi perfil', endpoint: '/api/cuenta/perfil' },
  mis_reservas: { title: 'Mis reservas', endpoint: '/api/cuenta/reservas' },
  mi_ficha: { title: 'Mi ficha laboral', endpoint: '/api/cuenta/ficha' },
  mi_planilla: { title: 'Mi planilla', endpoint: '/api/cuenta/planillas' },
  niveles_acceso: { title: 'Niveles de acceso', endpoint: '/api/gestion/niveles_acceso' },
  permisos: { title: 'Permisos', endpoint: '/api/gestion/permisos' },
  nivel_permiso: { title: 'Permisos por nivel', endpoint: '/api/gestion/nivel_permiso' },
  detalle_venta_modificadores: { title: 'Modificadores aplicados', endpoint: '/api/gestion/detalle_venta_modificadores' },
  reservas: {
    title: 'Reservas',
    endpoint: '/api/gestion/reservas',
    fields: [['mesaid', 'Mesa'], ['id_cliente', 'Cliente'], ['fecha_hora_inicio', 'Fecha y hora (ISO)'], ['duracion_minutos', 'Duración (minutos)'], ['cantidad_personas', 'Personas'], ['notas', 'Notas']]
  }
};

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function DataModule({ name, token, usuario, escritura = false }) {
  const module = modules[name];
  const endpoint = module?.endpoint;
  const [rows, setRows] = useState([]);
  const [sucursalid, setSucursalid] = useState(usuario.sucursalid ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [jsonPayload, setJsonPayload] = useState(module?.accion?.ejemplo ?? '{}');
  const [actionEndpoint, setActionEndpoint] = useState(module?.accion?.endpoint ?? '');
  const [actionMethod, setActionMethod] = useState('POST');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!endpoint) return;
      setLoading(true);
      setError('');
      try {
        const path = name === 'inventario'
          ? `${endpoint}?sucursalid=${encodeURIComponent(sucursalid)}`
          : endpoint;
        const result = await apiRequest(path, { token });
        if (cancelled) return;
        const records = Array.isArray(result)
          ? result
          : result.registros ?? result.insumos ?? result.recetas ?? result.planillas ??
            result.reservas ?? (result.perfil ? [result.perfil] : undefined) ??
            (result.ficha ? [result.ficha] : undefined) ?? [];
        setRows(records);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (name !== 'inventario' || sucursalid) load();
    return () => { cancelled = true; };
  }, [name, endpoint, sucursalid, token, refresh]);

  if (!module) return <p>Módulo no disponible.</p>;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  async function submitFields(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries([...formData].filter(([, value]) => value !== ''));
    for (const [key, value] of Object.entries(body)) {
      if ([
        'precio', 'precio_venta', 'sucursalid', 'mesaid', 'id_cliente', 'duracion_minutos',
        'cantidad_personas', 'capacidad', 'id_insumo', 'id_producto', 'id_rol'
      ].includes(key)) {
        body[key] = Number(value);
      }
      if (key === 'es_reventa') body[key] = value.toLowerCase() === 'true';
      if (key === 'fecha_hora_inicio') body[key] = new Date(value).toISOString();
    }
    if (await submitRequest(module.endpoint, body)) form.reset();
  }

  async function submitJson(event) {
    event.preventDefault();
    try {
      await submitRequest(actionEndpoint, JSON.parse(jsonPayload), actionMethod);
    } catch (requestError) {
      if (requestError instanceof SyntaxError) setFormError('El JSON del formulario no es válido');
      else setFormError(requestError.message);
    }
  }

  async function submitRequest(path, body, method = 'POST') {
    setFormError('');
    setFormMessage('');
    try {
      await apiRequest(path, { token, method, body: JSON.stringify(body) });
      setFormMessage('Registro guardado correctamente');
      setRefresh((value) => value + 1);
      return true;
    } catch (requestError) {
      setFormError(requestError.message);
      return false;
    }
  }

  return (
    <section>
      <h1>{module.title}</h1>
      {name === 'inventario' && !usuario.sucursalid && (
        <label>
          ID de sucursal
          <input
            type="number"
            min="1"
            value={sucursalid}
            onChange={(event) => setSucursalid(event.target.value)}
          />
        </label>
      )}
      <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
        {loading ? 'Cargando...' : 'Actualizar'}
      </button>
      {module.fields && escritura && (
        <form onSubmit={submitFields} style={{ margin: '20px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {module.fields.map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={name === 'fecha_hora_inicio' ? 'datetime-local' : name.includes('correo') ? 'email' : 'text'}
                required={['nombre', 'nombre_empresa', 'precio_venta'].includes(name)}
              />
            </label>
          ))}
          <button type="submit">Guardar</button>
        </form>
      )}
      {module.accion && escritura && (
        <form onSubmit={submitJson} style={{ margin: '20px 0' }}>
          <label htmlFor={`endpoint-${name}`}>Ruta de operación</label>
          <input
            id={`endpoint-${name}`}
            value={actionEndpoint}
            onChange={(event) => setActionEndpoint(event.target.value)}
            style={{ display: 'block', width: '100%', maxWidth: '700px' }}
          />
          <label htmlFor={`method-${name}`}>Método HTTP</label>
          <select id={`method-${name}`} value={actionMethod} onChange={(event) => setActionMethod(event.target.value)}>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
          </select>
          <label htmlFor={`payload-${name}`}>Cuerpo JSON</label>
          <textarea
            id={`payload-${name}`}
            value={jsonPayload}
            onChange={(event) => setJsonPayload(event.target.value)}
            rows={Math.min(14, jsonPayload.split('\n').length + 1)}
            style={{ display: 'block', width: '100%', maxWidth: '700px', fontFamily: 'monospace' }}
          />
          <button type="submit">Enviar operación</button>
        </form>
      )}
      {formError && <p role="alert">{formError}</p>}
      {formMessage && <p role="status">{formMessage}</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No hay registros para mostrar.</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-striped">
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? row.id_empleado ?? row.id_planilla ?? row.id_producto ?? index}>
                  {columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default DataModule;
