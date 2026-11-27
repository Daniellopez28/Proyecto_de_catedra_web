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

<<<<<<< HEAD
function PlanillasPage({ permisos = [] }) {
    const puedeVer = permisos.includes('ver_planillas');
    const puedeGenerar = permisos.includes('generar_planillas');
    const puedeVerPropia = permisos.includes('ver_mi_planilla');
    const [planillas, setPlanillas] = useState([]);
    const [miPlanilla, setMiPlanilla] = useState([]);
=======
const camposEditables = [
    { id: 'salario_bruto', etiqueta: 'Salario bruto' },
    { id: 'descuento_isss', etiqueta: 'ISSS' },
    { id: 'descuento_afp', etiqueta: 'AFP' },
    { id: 'descuento_renta', etiqueta: 'Renta' }
];

function PlanillasPage({ permisos = [] }) {
    const puedeVer = permisos.includes('ver_planillas');
    const puedeGenerar = permisos.includes('generar_planillas');
    const puedeEditar = permisos.includes('editar_planillas');
    const puedeVerPropia = permisos.includes('ver_mi_planilla');
    const [planillas, setPlanillas] = useState([]);
    const [miPlanilla, setMiPlanilla] = useState([]);
    const [planillaDetalle, setPlanillaDetalle] = useState(null);
    const [detallesEditables, setDetallesEditables] = useState({});
>>>>>>> frontend
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

<<<<<<< HEAD
=======
    async function cargarDetalle(idPlanilla) {
        const respuesta = await solicitudApi(`/planillas/${idPlanilla}`);
        setPlanillaDetalle(respuesta);
        setDetallesEditables(Object.fromEntries(respuesta.planilla_detalle.map((detalle) => [
            detalle.id_empleado,
            Object.fromEntries(camposEditables.map(({ id }) => [
                id,
                Number(detalle[id]).toFixed(2)
            ]))
        ])));
    }

    async function editarPlanilla(planilla) {
        if (planillaDetalle?.id_planilla === planilla.id_planilla) {
            setPlanillaDetalle(null);
            return;
        }
        setError('');
        setMensaje('');
        setProcesando(true);
        try {
            await cargarDetalle(planilla.id_planilla);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    function actualizarDetalle(idEmpleado, campo, valor) {
        setDetallesEditables((actuales) => ({
            ...actuales,
            [idEmpleado]: { ...actuales[idEmpleado], [campo]: valor }
        }));
    }

    async function guardarDetalle(idEmpleado) {
        setError('');
        setMensaje('');
        setProcesando(true);
        try {
            const respuesta = await solicitudApi(
                `/planillas/${planillaDetalle.id_planilla}/detalles/${idEmpleado}`,
                { method: 'PUT', body: detallesEditables[idEmpleado] }
            );
            setMensaje(respuesta.mensaje);
            await cargar();
            await cargarDetalle(planillaDetalle.id_planilla);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

>>>>>>> frontend
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
<<<<<<< HEAD
                                    <tr><th>Período</th><th>Tipo</th><th>Total neto</th><th>Estado</th>{puedeGenerar && <th>Acciones</th>}</tr>
=======
                                    <tr><th>Período</th><th>Tipo</th><th>Total neto</th><th>Estado</th>{(puedeGenerar || puedeEditar) && <th>Acciones</th>}</tr>
>>>>>>> frontend
                                </thead>
                                <tbody>
                                    {planillas.map((planilla) => (
                                        <tr key={planilla.id_planilla}>
                                            <td>{mostrarFecha(planilla.periodo_inicio)} – {mostrarFecha(planilla.periodo_fin)}</td>
                                            <td>{planilla.tipo_planilla}</td>
                                            <td>${Number(planilla.total_pagar).toFixed(2)}</td>
                                            <td><span className="status-pill">{planilla.estado}</span></td>
<<<<<<< HEAD
                                            {puedeGenerar && <td>{planilla.estado !== 'Pagada' &&
                                                <button className="secondary-button" type="button" onClick={() => marcarPagada(planilla)} disabled={procesando}>Marcar pagada</button>}</td>}
=======
                                            {(puedeGenerar || puedeEditar) && <td>
                                                {puedeGenerar && planilla.estado !== 'Pagada' &&
                                                    <button className="secondary-button" type="button" onClick={() => marcarPagada(planilla)} disabled={procesando}>Marcar pagada</button>}
                                                {puedeEditar && planilla.estado !== 'Pagada' &&
                                                    <button className="secondary-button" type="button" onClick={() => editarPlanilla(planilla)} disabled={procesando}>
                                                        {planillaDetalle?.id_planilla === planilla.id_planilla ? 'Cerrar edición' : 'Editar detalles'}
                                                    </button>}
                                            </td>}
>>>>>>> frontend
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

<<<<<<< HEAD
=======
            {puedeEditar && planillaDetalle && (
                <section className="surface-card" style={{ marginTop: 16 }}>
                    <h2>Editar planilla del {mostrarFecha(planillaDetalle.periodo_inicio)} al {mostrarFecha(planillaDetalle.periodo_fin)}</h2>
                    <p>El salario neto y el total de la planilla se recalculan al guardar cada detalle.</p>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    {camposEditables.map(({ id, etiqueta }) => <th key={id}>{etiqueta}</th>)}
                                    <th>Neto</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {planillaDetalle.planilla_detalle.map((detalle) => {
                                    const valores = detallesEditables[detalle.id_empleado] ?? {};
                                    const neto = Number(valores.salario_bruto) -
                                        Number(valores.descuento_isss) -
                                        Number(valores.descuento_afp) -
                                        Number(valores.descuento_renta);
                                    return (
                                        <tr key={detalle.id_empleado}>
                                            <td>{detalle.empleados.nombre_completo}</td>
                                            {camposEditables.map(({ id, etiqueta }) => (
                                                <td key={id}>
                                                    <input
                                                        aria-label={`${etiqueta} de ${detalle.empleados.nombre_completo}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={valores[id] ?? ''}
                                                        onChange={(event) => actualizarDetalle(detalle.id_empleado, id, event.target.value)}
                                                        disabled={procesando}
                                                    />
                                                </td>
                                            ))}
                                            <td>{Number.isFinite(neto) && neto >= 0 ? `$${neto.toFixed(2)}` : '—'}</td>
                                            <td>
                                                <button
                                                    className="secondary-button"
                                                    type="button"
                                                    onClick={() => guardarDetalle(detalle.id_empleado)}
                                                    disabled={procesando}
                                                >
                                                    Guardar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

>>>>>>> frontend
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
