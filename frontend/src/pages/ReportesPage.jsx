import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function mostrarFecha(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(valor));
}

function ReportesPage() {
    const [ventas, setVentas] = useState([]);
    const [inventario, setInventario] = useState([]);
    const [planillas, setPlanillas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    async function cargar() {
        setCargando(true);
        setError('');
        try {
            const [respuestaVentas, respuestaInventario, respuestaPlanillas] = await Promise.all([
                solicitudApi('/reportes/ventas'),
                solicitudApi('/reportes/inventario'),
                solicitudApi('/reportes/planillas')
            ]);
            setVentas(respuestaVentas.ventas);
            setInventario(respuestaInventario.alertas);
            setPlanillas(respuestaPlanillas.filas);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        let activo = true;
        Promise.all([
            solicitudApi('/reportes/ventas'),
            solicitudApi('/reportes/inventario'),
            solicitudApi('/reportes/planillas')
        ]).then(([respuestaVentas, respuestaInventario, respuestaPlanillas]) => {
            if (!activo) return;
            setVentas(respuestaVentas.ventas);
            setInventario(respuestaInventario.alertas);
            setPlanillas(respuestaPlanillas.filas);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, []);

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Reportes</h1>
                    <p>Indicadores obtenidos de los reportes SQL, limitados a la sucursal de tu sesión.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {cargando ? <p className="loading-state">Cargando reportes…</p> : (
                <>
                    <section className="surface-card">
                        <h2>Ventas por sucursal y documento</h2>
                        {ventas.length === 0 ? <p className="empty-state">No hay ventas en el reporte.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Sucursal</th><th>Documento</th><th>Ventas</th><th>Subtotal</th><th>IVA</th><th>Total facturado</th></tr></thead>
                                    <tbody>
                                        {ventas.map((fila, indice) => (
                                            <tr key={`${fila.sucursal}-${fila.tipo_documento}-${indice}`}>
                                                <td>{fila.sucursal}</td>
                                                <td>{fila.tipo_documento}</td>
                                                <td>{fila.cantidad_ventas}</td>
                                                <td>${Number(fila.total_subtotal).toFixed(2)}</td>
                                                <td>${Number(fila.total_iva).toFixed(2)}</td>
                                                <td>${Number(fila.total_facturado).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section className="surface-card">
                        <h2>Alertas de inventario</h2>
                        {inventario.length === 0 ? <p className="empty-state">No hay alertas de stock.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Insumo</th><th>Stock actual</th><th>Mínimo</th><th>Faltante</th></tr></thead>
                                    <tbody>
                                        {inventario.map((fila) => (
                                            <tr key={fila.id_insumo}>
                                                <td>{fila.insumo}</td>
                                                <td>{fila.stock_actual} {fila.unidad_medida}</td>
                                                <td>{fila.stock_minimo} {fila.unidad_medida}</td>
                                                <td>{fila.cantidad_faltante} {fila.unidad_medida}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                    <section className="surface-card">
                        <h2>Planillas y empleados</h2>
                        {planillas.length === 0 ? <p className="empty-state">No hay datos de planillas.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Período</th><th>Empleado</th><th>Cargo</th><th>Bruto</th><th>ISSS</th><th>AFP</th><th>Renta</th><th>Neto</th></tr></thead>
                                    <tbody>
                                        {planillas.map((fila, indice) => (
                                            <tr key={`${fila.id_planilla}-${fila.id_empleado}-${indice}`}>
                                                <td>{mostrarFecha(fila.periodo_inicio)} – {mostrarFecha(fila.periodo_fin)}</td>
                                                <td>{fila.nombre_completo}</td>
                                                <td>{fila.cargo}</td>
                                                <td>${Number(fila.salario_bruto).toFixed(2)}</td>
                                                <td>${Number(fila.descuento_isss).toFixed(2)}</td>
                                                <td>${Number(fila.descuento_afp).toFixed(2)}</td>
                                                <td>${Number(fila.descuento_renta).toFixed(2)}</td>
                                                <td>${Number(fila.salario_neto).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </>
    );
}

export default ReportesPage;
