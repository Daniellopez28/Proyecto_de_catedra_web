import { useCallback, useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function fechaHoy() {
    const ahora = new Date();
    const dia = ahora.getDate() <= 15 ? 1 : 16;
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function finDeQuincena() {
    const ahora = new Date();
    const mes = ahora.getMonth() + 1;
    const dia = ahora.getDate() <= 15 ? 15 : new Date(ahora.getFullYear(), mes, 0).getDate();
    return `${ahora.getFullYear()}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function mostrarFecha(valor) {
    return new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(valor));
}

function PlanillasPage({ permisos = [] }) {
    const puedeVer = permisos.includes('ver_planillas');
    const puedeGenerar = permisos.includes('generar_planillas');
    const puedeVerPropia = permisos.includes('ver_mi_planilla');
    const [planillas, setPlanillas] = useState([]);
    const [miPlanilla, setMiPlanilla] = useState([]);
    const [periodoInicio, setPeriodoInicio] = useState(fechaHoy());
    const [periodoFin, setPeriodoFin] = useState(finDeQuincena());
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const solicitudes = [];
            if (puedeVer) solicitudes.push(solicitudApi('/planillas'));
            if (puedeVerPropia) solicitudes.push(solicitudApi('/planillas/mi'));
            const respuestas = await Promise.all(solicitudes);
            let indice = 0;
            if (puedeVer) setPlanillas(respuestas[indice++]);
            if (puedeVerPropia) setMiPlanilla(respuestas[indice].planillas);
            setError('');
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }, [puedeVer, puedeVerPropia]);

    useEffect(() => {
        let activo = true;
        const solicitudes = [];
        if (puedeVer) solicitudes.push(solicitudApi('/planillas'));
        if (puedeVerPropia) solicitudes.push(solicitudApi('/planillas/mi'));
        Promise.all(solicitudes).then((respuestas) => {
            if (!activo) return;
            let indice = 0;
            if (puedeVer) setPlanillas(respuestas[indice++]);
            if (puedeVerPropia) setMiPlanilla(respuestas[indice].planillas);
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, [puedeVer, puedeVerPropia]);

    async function generar(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/planillas/generar', {
                method: 'POST',
                body: { periodo_inicio: periodoInicio, periodo_fin: periodoFin }
            });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    async function marcarPagada(planilla) {
        setError('');
        setMensaje('');
        setProcesando(true);
        try {
            const respuesta = await solicitudApi(`/planillas/${planilla.id_planilla}/pagar`, {
                method: 'PUT'
            });
            setMensaje(respuesta.mensaje);
            await cargar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Planillas</h1>
                    <p>Consulta períodos generados y calcula una quincena desde los salarios activos.</p>
                </div>
                <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}>Actualizar</button>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}

            {puedeGenerar && (
                <form className="surface-card" onSubmit={generar}>
                    <h2>Generar quincena</h2>
                    <div className="inline-form">
                        <label className="form-field">
                            Inicio del período
                            <input type="date" required value={periodoInicio} onChange={(event) => setPeriodoInicio(event.target.value)} />
                        </label>
                        <label className="form-field">
                            Fin del período
                            <input type="date" required value={periodoFin} onChange={(event) => setPeriodoFin(event.target.value)} />
                        </label>
                        <button className="primary-button" type="submit" disabled={procesando}>
                            {procesando ? 'Generando…' : 'Generar planilla'}
                        </button>
                    </div>
                </form>
            )}

            {puedeVer && (
                <section className="surface-card" style={{ marginTop: 16 }}>
                    <h2>Períodos registrados</h2>
                    {cargando ? <p className="loading-state">Cargando planillas…</p> :
                        planillas.length === 0 ? <p className="empty-state">Todavía no hay planillas registradas.</p> : (
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Período</th><th>Tipo</th><th>Total neto</th><th>Estado</th>{puedeGenerar && <th>Acciones</th>}</tr>
                                </thead>
                                <tbody>
                                    {planillas.map((planilla) => (
                                        <tr key={planilla.id_planilla}>
                                            <td>{mostrarFecha(planilla.periodo_inicio)} – {mostrarFecha(planilla.periodo_fin)}</td>
                                            <td>{planilla.tipo_planilla}</td>
                                            <td>${Number(planilla.total_pagar).toFixed(2)}</td>
                                            <td><span className="status-pill">{planilla.estado}</span></td>
                                            {puedeGenerar && <td>{planilla.estado !== 'Pagada' &&
                                                <button className="secondary-button" type="button" onClick={() => marcarPagada(planilla)} disabled={procesando}>Marcar pagada</button>}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {puedeVerPropia && (
                <section className="surface-card" style={{ marginTop: 16 }}>
                    <h2>Mis boletas</h2>
                    {cargando ? <p className="loading-state">Cargando tus boletas…</p> :
                        miPlanilla.length === 0 ? <p className="empty-state">Todavía no hay boletas disponibles.</p> : (
                            <div className="data-table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Período</th><th>Estado</th><th>Salario bruto</th><th>Descuentos ISSS</th><th>Descuentos AFP</th><th>Descuento renta</th><th>Neto</th></tr></thead>
                                    <tbody>
                                        {miPlanilla.map((planilla) => {
                                            const detalle = planilla.planilla_detalle[0];
                                            return (
                                                <tr key={planilla.id_planilla}>
                                                    <td>{mostrarFecha(planilla.periodo_inicio)} – {mostrarFecha(planilla.periodo_fin)}</td>
                                                    <td>{planilla.estado}</td>
                                                    <td>${Number(detalle.salario_bruto).toFixed(2)}</td>
                                                    <td>${Number(detalle.descuento_isss).toFixed(2)}</td>
                                                    <td>${Number(detalle.descuento_afp).toFixed(2)}</td>
                                                    <td>${Number(detalle.descuento_renta).toFixed(2)}</td>
                                                    <td>${Number(detalle.salario_neto).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>
            )}
        </>
    );
}

export default PlanillasPage;
