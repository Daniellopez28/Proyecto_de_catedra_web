import '../src/employee-info-component.css';

function nombreRolVisible(nombre) {
    const rol = String(nombre ?? '').trim().toLocaleLowerCase('es-SV');
    return rol ? `${rol.charAt(0).toLocaleUpperCase('es-SV')}${rol.slice(1)}` : '—';
}

function fechaVisible(valor) {
    return valor ? new Date(valor).toISOString().slice(0, 10) : '—';
}

function EmployeeInfoComponent({
    employee,
    details,
    loadingDetails,
    errorDetails,
    canManage,
    onEdit,
    onDeactivate,
    processing
}) {
    const status = employee.activo ? 'Activo' : 'Inactivo';
    const contratoDefinido = details?.tipo_contrato?.toLowerCase() === 'definido' ||
        Boolean(employee.fecha_fin_contrato);
    const detalleContrato = contratoDefinido
        ? `Definido · hasta ${fechaVisible(details?.fecha_fin_contrato || employee.fecha_fin_contrato)}`
        : 'Indefinido';
    const mostrarDetalle = (valor) => details
        ? valor || '—'
        : loadingDetails
            ? 'Cargando…'
            : errorDetails
                ? 'No disponible'
                : '—';
    const mostrarAfiliacion = (valor) => details
        ? valor || 'No registrado'
        : loadingDetails
            ? 'Cargando…'
            : errorDetails
                ? 'No disponible'
                : '—';
    const detallesLaborales = [
        ['Contratación', fechaVisible(details?.fecha_ingreso || employee.fecha_ingreso)],
        ['Contrato', detalleContrato],
        ['Jornada', mostrarDetalle(details?.jornada)],
        ['Tipo de planilla', employee.tipo_planilla
            ? `${employee.tipo_planilla.charAt(0).toLocaleUpperCase('es-SV')}${employee.tipo_planilla.slice(1).toLocaleLowerCase('es-SV')}`
            : '—'],
        ['Salario mensual', Number(employee.salario_base || 0).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        })],
        ['Forma de pago', mostrarDetalle(details?.forma_pago)]
    ];

    return (
        <article className="employee-card">
            <header className="employee-card-header">
                <h2>{employee.nombre_completo}</h2>
                <p>Expediente interno {employee.codigo_empleado}</p>
                <div className="employee-identity">
                    <div>
                        <strong>
                            {nombreRolVisible(employee.roles?.nombre_rol)} · {employee.cargo} · {employee.sucursales?.nombre || 'Sin sucursal'}
                        </strong>
                        <span className={`employee-status ${status === 'Inactivo' ? 'is-inactive' : ''}`}>
                            {status}
                        </span>
                    </div>
                </div>
            </header>

            {loadingDetails && <p className="employee-detail-message">Cargando expediente completo…</p>}
            {errorDetails && <p className="employee-detail-error" role="alert">{errorDetails}</p>}

            <section className="employee-details" aria-label="Información laboral">
                {detallesLaborales.map(([label, value]) => (
                    <div className="employee-detail-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </div>
                ))}
            </section>

            {canManage && (
                <section className="employee-affiliations">
                    <h3>Afiliaciones laborales</h3>
                    <div className="employee-detail-row">
                        <span>ISSS</span>
                        <strong>{mostrarAfiliacion(details?.isss_numero)}</strong>
                    </div>
                    <div className="employee-detail-row">
                        <span>AFP</span>
                        <strong>{mostrarAfiliacion(details?.afp_numero)}</strong>
                    </div>
                </section>
            )}

            {canManage && (
                <footer className="employee-card-actions">
                    <button className="secondary-button" type="button" onClick={onEdit} disabled={processing}>
                        Editar expediente
                    </button>
                    <button className="danger-button" type="button" onClick={onDeactivate} disabled={processing}>
                        Dar de baja
                    </button>
                </footer>
            )}
        </article>
    );
}

export default EmployeeInfoComponent;
