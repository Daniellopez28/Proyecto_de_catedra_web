
import { useState } from 'react';
import '../src/MenuProductosView.css'; // Ajustado a tu estructura en src/

/*Datos de muestra de los 14 productos (precios en USD antes de IVA 13%)*/
const CATALOGO_PRODUCTOS = [
  { id: 1, producto: 'Hamburguesa Brasa', categoria: 'Principales', precioUsd: 14.5, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 2, producto: 'Pizza margarita', categoria: 'Principales', precioUsd: 12.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 3, producto: 'Bowl mediterráneo', categoria: 'Principales', precioUsd: 11.5, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 4, producto: 'Rigatoni al pesto', categoria: 'Principales', precioUsd: 13.5, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 5, producto: 'Patatas de la casa', categoria: 'Entrantes', precioUsd: 5.5, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 6, producto: 'Brownie de chocolate', categoria: 'Postres', precioUsd: 6.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 7, producto: 'Limonada casera', categoria: 'Bebidas', precioUsd: 4.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 8, producto: 'Latte Grande', categoria: 'Café', precioUsd: 4.5, tipo: 'Elaborado', disponibilidad: 'Stock bajo', receta: 'Editar receta →', stockBajo: true },
  { id: 9, producto: 'Espresso', categoria: 'Café', precioUsd: 2.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 10, producto: 'Cappuccino', categoria: 'Café', precioUsd: 3.75, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 11, producto: 'Cold Brew', categoria: 'Café', precioUsd: 4.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 12, producto: 'Croissant de jamón', categoria: 'Panadería', precioUsd: 5.0, tipo: 'Elaborado', disponibilidad: 'Disponible', receta: 'Ver receta →' },
  { id: 13, producto: 'Café en bolsa · 340 g', categoria: 'Empacados', precioUsd: 12.0, tipo: 'Reventa', disponibilidad: 'Disponible', receta: 'No aplica' },
  { id: 14, producto: 'Agua embotellada · 600 ml', categoria: 'Empacados', precioUsd: 1.5, tipo: 'Reventa', disponibilidad: 'Disponible', receta: 'No aplica' }
];

const SUCURSALES = ['Escalón', 'Santa Tecla', 'Mejicanos'];

/* ==========================================================================
   PARTE B (CENTRO DEL ARCHIVO): Componente, estados, filtros y handlers
   Va justo después de SUCURSALES y antes del return (...)
   ========================================================================== */
export default function MenuProductosView({ onNuevoProducto, onAbrirReceta }) {
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [sucursal, setSucursal] = useState('Escalón');
  const [productoSeleccionado, setProductoSeleccionado] = useState(
    CATALOGO_PRODUCTOS.find((p) => p.producto === 'Latte Grande')
  );

  const totalElaborados = CATALOGO_PRODUCTOS.filter((p) => p.tipo === 'Elaborado').length;
  const totalReventa = CATALOGO_PRODUCTOS.filter((p) => p.tipo === 'Reventa').length;

  const productosFiltrados = CATALOGO_PRODUCTOS.filter((item) => {
    const cumpleTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo;
    const texto = busqueda.trim().toLowerCase();
    const cumpleBusqueda =
      !texto ||
      item.producto.toLowerCase().includes(texto) ||
      item.categoria.toLowerCase().includes(texto) ||
      String(item.id).includes(texto);
    return cumpleTipo && cumpleBusqueda;
  });

  const handleReceta = (e, item) => {
    e.stopPropagation();
    if (item.receta === 'No aplica') return;
    setProductoSeleccionado(item);
    if (typeof onAbrirReceta === 'function') {
      onAbrirReceta(item);
    }
  };

  /* ========================================================================
     PARTE C (DENTRO DEL RETURN): Topbar, cabecera, filtros, tabla y footer
     Va dentro del return (...) de MenuProductosView
     ======================================================================== */
  return (
    <div className="mp-shell">
      {/* 1. Barra superior (Topbar): marca/ubicación a la izquierda, USD/fecha/usuario a la derecha */}
      <header className="mp-topbar">
        <div className="mp-topbar-left">
          <button type="button" className="mp-brand-select">
            <span>Brasa Cocina</span>
            <span aria-hidden="true">⌄</span>
          </button>
          <span className="mp-topbar-divider" aria-hidden="true">|</span>
          <span className="mp-location-text">San Salvador · {sucursal}</span>
        </div>

        <div className="mp-topbar-right">
          <span className="mp-usd-pill">Operación en USD</span>
          <span className="mp-date-text">Mar, 3 nov 2026</span>
          <div className="mp-user-box">
            <span className="mp-avatar">AV</span>
            <div className="mp-user-meta">
              <span className="mp-user-name">Ana Villalobos</span>
              <span className="mp-user-role">Gerente de operaciones</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Contenido principal: título, botón + Nuevo producto, filtros, tabla y pie */}
      <main className="mp-content">
        <div className="mp-heading-row">
          <div>
            <h1 className="mp-title">Menú y productos</h1>
            <p className="mp-subtitle">
              {CATALOGO_PRODUCTOS.length} productos · {totalElaborados} elaborados con receta y {totalReventa} empacados de reventa · Precios antes de IVA 13%
            </p>
          </div>

          <button
            type="button"
            className="mp-btn-nuevo"
            onClick={() => {
              if (typeof onNuevoProducto === 'function') onNuevoProducto();
            }}
          >
            + Nuevo producto
          </button>
        </div>

        {/* Filtros por tipo, buscador y sucursal */}
        <div className="mp-controls-row">
          <div className="mp-pills">
            <button
              type="button"
              className={`mp-pill ${filtroTipo === 'Todos' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('Todos')}
            >
              Todos · {CATALOGO_PRODUCTOS.length}
            </button>
            <button
              type="button"
              className={`mp-pill ${filtroTipo === 'Elaborado' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('Elaborado')}
            >
              Elaborados · {totalElaborados}
            </button>
            <button
              type="button"
              className={`mp-pill ${filtroTipo === 'Reventa' ? 'active' : ''}`}
              onClick={() => setFiltroTipo('Reventa')}
            >
              Reventa · {totalReventa}
            </button>
          </div>

          <div className="mp-search-and-branch">
            <div className="mp-search-col">
              <label htmlFor="mp-buscar" className="mp-search-label">Buscar producto</label>
              <div className="mp-search-box">
                <input
                  id="mp-buscar"
                  type="text"
                  placeholder="Nombre, categoría o código"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <span className="mp-search-lupa" aria-hidden="true">⌕</span>
              </div>
            </div>

            <div className="mp-branch-col">
              <select
                aria-label="Seleccionar sucursal"
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
              >
                {SUCURSALES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tarjeta de tabla */}
        <section className="mp-table-card">
          <div className="mp-table-scroll">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio USD</th>
                  <th>Tipo</th>
                  <th>Disponibilidad</th>
                  <th>Receta</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((item) => {
                  const esStockBajo = item.disponibilidad === 'Stock bajo';
                  return (
                    <tr
                      key={item.id}
                      className={esStockBajo ? 'mp-row-alert' : ''}
                      onClick={() => {
                        if (item.tipo === 'Elaborado') setProductoSeleccionado(item);
                      }}
                    >
                      <td className="mp-col-prod">{item.producto}</td>
                      <td>{item.categoria}</td>
                      <td className="mp-col-precio">${item.precioUsd.toFixed(2)}</td>
                      <td>{item.tipo}</td>
                      <td>
                        <span className={esStockBajo ? 'mp-status-low' : 'mp-status-ok'}>
                          {item.disponibilidad}
                        </span>
                      </td>
                      <td>
                        {item.receta === 'No aplica' ? (
                          <span className="mp-no-aplica">No aplica</span>
                        ) : (
                          <button
                            type="button"
                            className={`mp-receta-btn ${esStockBajo ? 'is-low' : ''}`}
                            onClick={(e) => handleReceta(e, item)}
                          >
                            {item.receta}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mp-card-bottom">
            <span className="mp-count-caption">
              Mostrando {productosFiltrados.length} de {CATALOGO_PRODUCTOS.length} productos · Disponibilidad en {sucursal}
            </span>

            {productoSeleccionado && (
              <button
                type="button"
                className="mp-open-recipe-btn"
                onClick={() => {
                  if (typeof onAbrirReceta === 'function') onAbrirReceta(productoSeleccionado);
                }}
              >
                <span aria-hidden="true">📖</span>
                <span>Abrir receta · {productoSeleccionado.producto}</span>
              </button>
            )}
          </div>
        </section>

        {/* Píldoras inferiores de regla de inventario */}
        <div className="mp-rules-pills">
          <span className="mp-rule-elaborado">Elaborado: descuenta insumos de receta</span>
          <span className="mp-rule-reventa">Reventa: descuenta una unidad del producto</span>
        </div>

        {/* Pie inferior */}
        <footer className="mp-footer">
          <span>BRASA · Operación centralizada · El Salvador · USD</span>
          <span>Vista de muestra · Datos ilustrativos</span>
        </footer>
      </main>
    </div>
  );
}