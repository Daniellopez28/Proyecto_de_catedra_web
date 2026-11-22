/*Vista agregada "Proveedores y cuentas por pagar"*/

/* (ARRIBA DEL ARCHIVO): Imports y datos de muestra */
import { useState } from 'react';
import '../src/ProveedoresView.css';

const KPI_TARJETAS = [
  { id: 'pendiente', titulo: 'Total pendiente', monto: '$244.93', detalle: '3 facturas con saldo' },
  { id: 'vencidas', titulo: 'Vencidas', monto: '$84.75', detalle: '1 factura · venció el 30 oct' },
  { id: 'proximas', titulo: 'Próximas · 7 días', monto: '$56.50', detalle: 'Servicios · vence el 10 nov' },
  { id: 'otros', titulo: 'Otros vencimientos', monto: '$103.68', detalle: 'Café de Origen · 18 nov' }
];

const PROVEEDORES_DATA = [
  {
    id: 1,
    nombre: 'Café de Origen, S.A. de C.V.',
    corto: 'Café de Origen',
    razonSocial: 'S.A. de C.V. · Proveedor activo',
    correo: 'ventas@origen.example',
    facturas: 1,
    saldoUsd: 103.68,
    proximoVence: '18 nov 2026',
    tipo: 'Costo',
    vencido: false,
    badgeEstado: 'Pago parcial',
    contactoResumen: 'Equipo comercial ventas@origen.example · Sucursal atendida: Escalón',
    compraCodigo: 'Compra CO-01842',
    fechaVencimiento: '3 nov / 18 nov',
    clasificacionDetalle: 'Costo · inventario',
    baseMasIva: '$136.00 + $17.68',
    totalFactura: '$153.68',
    abonoMuestra: '-$50.00',
    notaCompra: 'Misma compra del registro CO-01842, mostrada en una etapa posterior con un abono ilustrativo.',
    historialPago: '3 nov · Abono de $50.00 por transferencia · referencia DEMO-AB01. El saldo restante vence el 18 nov.'
  },
  {
    id: 2,
    nombre: 'Empaques del Valle',
    corto: 'Empaques del Valle',
    razonSocial: 'Proveedor activo',
    correo: 'pedidos@valle.example',
    facturas: 1,
    saldoUsd: 84.75,
    proximoVence: '30 oct 2026',
    tipo: 'Costo',
    vencido: true,
    badgeEstado: 'Factura vencida',
    contactoResumen: 'Ventas pedidos@valle.example · Sucursal atendida: Santa Tecla',
    compraCodigo: 'Compra EV-00715',
    fechaVencimiento: '15 oct / 30 oct',
    clasificacionDetalle: 'Costo · empaques',
    baseMasIva: '$75.00 + $9.75',
    totalFactura: '$84.75',
    abonoMuestra: '$0.00',
    notaCompra: 'Factura vencida correspondiente a insumos de empaque en Santa Tecla.',
    historialPago: 'Sin abonos registrados hasta la fecha. Vencimiento cumplido el 30 oct.'
  },
  {
    id: 3,
    nombre: 'Servicios Limpios',
    corto: 'Servicios Limpios',
    razonSocial: 'Proveedor activo',
    correo: 'contacto@limpios.example',
    facturas: 1,
    saldoUsd: 56.5,
    proximoVence: '10 nov 2026',
    tipo: 'Gasto',
    vencido: false,
    badgeEstado: 'Por vencer',
    contactoResumen: 'Operaciones contacto@limpios.example · Sucursal atendida: San Miguel',
    compraCodigo: 'Servicio SL-00318',
    fechaVencimiento: '3 nov / 10 nov',
    clasificacionDetalle: 'Gasto · limpieza',
    baseMasIva: '$50.00 + $6.50',
    totalFactura: '$56.50',
    abonoMuestra: '$0.00',
    notaCompra: 'Servicio operativo de limpieza sin entrada directa a inventario.',
    historialPago: 'Programado para revisión antes del vencimiento del 10 nov.'
  }
];

const FACTURAS_PENDIENTES_DATA = [
  {
    id: 'f-1',
    proveedorId: 1,
    facturaSucursal: 'CO-01842 · Escalón',
    clasificacion: 'Costo / Inventario',
    saldo: 103.68,
    estado: 'Parcial'
  },
  {
    id: 'f-2',
    proveedorId: 2,
    facturaSucursal: 'EV-00715 · Santa Tecla',
    clasificacion: 'Costo / empaques',
    saldo: 84.75,
    estado: 'Vencida'
  },
  {
    id: 'f-3',
    proveedorId: 3,
    facturaSucursal: 'SL-00318 · San Miguel',
    clasificacion: 'Gasto / limpieza',
    saldo: 56.5,
    estado: 'Por vencer'
  }
];

/* (CENTRO DEL ARCHIVO): Componente, filtros y selección */
export default function ProveedoresView({ onNuevoProveedor, onPrepararAbono }) {
  const [filtroTab, setFiltroTab] = useState('Todos');
  const [seleccionadoId, setSeleccionadoId] = useState(1);

  const proveedoresFiltrados = PROVEEDORES_DATA.filter((prov) => {
    if (filtroTab === 'Con saldo') return prov.saldoUsd > 0;
    if (filtroTab === 'Vencidos') return prov.vencido;
    return true;
  });

  const proveedorActivo =
    PROVEEDORES_DATA.find((p) => p.id === seleccionadoId) || PROVEEDORES_DATA[0];

  /* (DENTRO DEL RETURN): Topbar, KPIs, tablas, detalle y footer */
  return (
    <div className="pv-shell">
      {/* 1. Barra superior (Topbar) */}
      <header className="pv-topbar">
        <div className="pv-topbar-left">
          <button type="button" className="pv-brand-select">
            <span>Brasa Cocina</span>
            <span aria-hidden="true">⌄</span>
          </button>
          <span className="pv-topbar-divider" aria-hidden="true">|</span>
          <span className="pv-location-text">Todas las sucursales</span>
        </div>

        <div className="pv-topbar-right">
          <span className="pv-usd-pill">Operación en USD</span>
          <span className="pv-date-text">Mar, 3 nov 2026</span>
          <div className="pv-user-box">
            <span className="pv-avatar">AV</span>
            <div className="pv-user-meta">
              <span className="pv-user-name">Ana Villalobos</span>
              <span className="pv-user-role">Gerente de operaciones</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Contenido principal */}
      <main className="pv-content">
        {/* Encabezado y botón + Nuevo proveedor */}
        <div className="pv-heading-row">
          <div>
            <h1 className="pv-title">Proveedores y cuentas por pagar</h1>
            <p className="pv-subtitle">
              Control de obligaciones · Todas las sucursales · Al 3 de noviembre de 2026
            </p>
          </div>

          <button
            type="button"
            className="pv-btn-nuevo"
            onClick={() => {
              if (typeof onNuevoProveedor === 'function') onNuevoProveedor();
            }}
          >
            + Nuevo proveedor
          </button>
        </div>

        {/* 4 tarjetas KPI */}
        <section className="pv-kpi-grid" aria-label="Resumen de cuentas por pagar">
          {KPI_TARJETAS.map((kpi) => (
            <div key={kpi.id} className="pv-kpi-card">
              <span className="pv-kpi-label">{kpi.titulo}</span>
              <strong className="pv-kpi-value">{kpi.monto}</strong>
              <span className="pv-kpi-sub">{kpi.detalle}</span>
            </div>
          ))}
        </section>

        {/* Píldoras de filtro */}
        <div className="pv-filter-pills">
          <button
            type="button"
            className={`pv-pill ${filtroTab === 'Todos' ? 'active' : ''}`}
            onClick={() => setFiltroTab('Todos')}
          >
            Todos · {PROVEEDORES_DATA.length}
          </button>
          <button
            type="button"
            className={`pv-pill ${filtroTab === 'Con saldo' ? 'active' : ''}`}
            onClick={() => setFiltroTab('Con saldo')}
          >
            Con saldo · {PROVEEDORES_DATA.filter((p) => p.saldoUsd > 0).length}
          </button>
          <button
            type="button"
            className={`pv-pill ${filtroTab === 'Vencidos' ? 'active' : ''}`}
            onClick={() => setFiltroTab('Vencidos')}
          >
            Vencidos · {PROVEEDORES_DATA.filter((p) => p.vencido).length}
          </button>
        </div>

        {/* Grid principal: izquierda (Proveedores + Facturas pendientes) y derecha (Detalle) */}
        <div className="pv-main-grid">
          <div className="pv-left-stack">
            {/* Tarjeta de Proveedores */}
            <section className="pv-card">
              <div className="pv-card-header">
                <h2 className="pv-card-title">Proveedores</h2>
                <p className="pv-card-subtitle">Contactos de ejemplo · sin datos personales reales</p>
              </div>

              <div className="pv-table-scroll">
                <table className="pv-table">
                  <thead>
                    <tr>
                      <th>Proveedor / contacto</th>
                      <th>Facturas</th>
                      <th>Saldo USD</th>
                      <th>Próximo vence</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedoresFiltrados.map((prov) => {
                      const estaSeleccionado = prov.id === proveedorActivo.id;
                      return (
                        <tr
                          key={prov.id}
                          className={estaSeleccionado ? 'pv-row-selected' : ''}
                          onClick={() => setSeleccionadoId(prov.id)}
                        >
                          <td>
                            <div className="pv-prov-name">{prov.nombre}</div>
                            <div className="pv-prov-email">{prov.correo}</div>
                          </td>
                          <td className="pv-num">{prov.facturas}</td>
                          <td className="pv-num pv-bold">${prov.saldoUsd.toFixed(2)}</td>
                          <td>{prov.proximoVence}</td>
                          <td>{prov.tipo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="pv-card-footnote">
                Costo: insumos y mercadería. Gasto: servicios y operación sin entrada a inventario.
              </p>
            </section>

            {/* Tarjeta de Facturas pendientes */}
            <section className="pv-card">
              <div className="pv-card-header">
                <h2 className="pv-card-title">Facturas pendientes</h2>
                <p className="pv-card-subtitle">Saldos después de abonos</p>
              </div>

              <div className="pv-table-scroll">
                <table className="pv-table">
                  <thead>
                    <tr>
                      <th>Factura / sucursal</th>
                      <th>Clasificación</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FACTURAS_PENDIENTES_DATA.map((fac) => {
                      const esVencida = fac.estado === 'Vencida';
                      return (
                        <tr
                          key={fac.id}
                          onClick={() => setSeleccionadoId(fac.proveedorId)}
                        >
                          <td className="pv-bold">{fac.facturaSucursal}</td>
                          <td>{fac.clasificacion}</td>
                          <td className="pv-num pv-bold">${fac.saldo.toFixed(2)}</td>
                          <td>
                            <span className={esVencida ? 'pv-estado-vencida' : 'pv-estado-normal'}>
                              {fac.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Columna derecha: Detalle del proveedor y compra */}
          <aside className="pv-right-stack" aria-label="Detalle de proveedor y cuenta por pagar">
            <section className="pv-card pv-detail-card">
              <div className="pv-detail-top">
                <h2 className="pv-detail-title">{proveedorActivo.corto}</h2>
                <p className="pv-detail-sub">{proveedorActivo.razonSocial}</p>
                <span className="pv-badge-parcial">{proveedorActivo.badgeEstado}</span>
                <p className="pv-detail-contact">
                  Contacto: {proveedorActivo.contactoResumen}
                </p>
              </div>

              <div className="pv-detail-divider" />

              <div className="pv-compra-block">
                <h3 className="pv-compra-title">{proveedorActivo.compraCodigo}</h3>

                <div className="pv-kv-row">
                  <span>Fecha / vencimiento</span>
                  <strong>{proveedorActivo.fechaVencimiento}</strong>
                </div>
                <div className="pv-kv-row">
                  <span>Clasificación</span>
                  <strong>{proveedorActivo.clasificacionDetalle}</strong>
                </div>
                <div className="pv-kv-row">
                  <span>Base + IVA 13%</span>
                  <strong>{proveedorActivo.baseMasIva}</strong>
                </div>
                <div className="pv-kv-row">
                  <span>Total de factura</span>
                  <strong>{proveedorActivo.totalFactura}</strong>
                </div>
                <div className="pv-kv-row">
                  <span>Abono de muestra · 3 nov</span>
                  <strong>{proveedorActivo.abonoMuestra}</strong>
                </div>
              </div>

              <div className="pv-detail-divider" />

              <div className="pv-saldo-row">
                <span className="pv-saldo-label">Saldo pendiente</span>
                <strong className="pv-saldo-amount">${proveedorActivo.saldoUsd.toFixed(2)}</strong>
              </div>

              <button
                type="button"
                className="pv-btn-abono"
                onClick={() => {
                  if (typeof onPrepararAbono === 'function') onPrepararAbono(proveedorActivo);
                }}
              >
                <span aria-hidden="true">🧾</span>
                <span>Preparar abono</span>
              </button>

              <p className="pv-detail-note">{proveedorActivo.notaCompra}</p>
            </section>

            {/* Tarjeta inferior de Historial de pago */}
            <section className="pv-history-card">
              <div className="pv-history-title">
                <span aria-hidden="true">ⓘ</span>
                <span>Historial de pago</span>
              </div>
              <p className="pv-history-text">{proveedorActivo.historialPago}</p>
            </section>
          </aside>
        </div>

        {/* Pie inferior */}
        <footer className="pv-footer">
          <span>BRASA · Operación centralizada · El Salvador · USD</span>
          <span>Vista de muestra · Datos ilustrativos</span>
        </footer>
      </main>
    </div>
  );
}