import '../src/employee-info-component.css'

function EmployeeInfoComponent({ employee }) {
    const initials = employee.name
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')

    const details = [
        ['Contratación', employee.contractDate],
        ['Contrato', employee.contractType],
        ['Jornada', employee.schedule],
        ['Salario mensual', `$${Number(employee.monthlySalary).toFixed(2)}`],
        ['Forma de pago', employee.paymentFrequency],
    ];

    return (
        <article className="employee-card">
            <header className="employee-card-header">
                <h2>{employee.name}</h2>
                <p>Expediente interno {employee.recordCode} · datos de ejemplo</p>

                <div className="employee-identity">

                    <div>
                        <strong>{employee.position} · {employee.branch}</strong>
                        <span className={`employee-status ${employee.status === 'Inactivo' ? 'is-inactive' : ''}`}>
                            {employee.status}
                        </span>
                    </div>
                </div>
            </header>

            <section className="employee-details" aria-label="Información laboral">
                {details.map(([label, value]) => (
                    <div className="employee-detail-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </div>
                ))}
            </section>

            <section className="employee-affiliations">
                <h3>Afiliaciones laborales</h3>
                <div className="employee-detail-row">
                    <span>ISSS</span>
                    <strong>{employee.isss}</strong>
                </div>
                <div className="employee-detail-row">
                    <span>AFP</span>
                    <strong>{employee.afp}</strong>
                </div>
                <p>{employee.deductionNote}</p>
            </section>

            <footer className="employee-card-actions">
                <button type="button">Editar expediente</button>
                <button type="button">Ver en planilla</button>
            </footer>
        </article>
    );
}

export default EmployeeInfoComponent;