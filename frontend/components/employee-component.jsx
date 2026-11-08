import '../src/employee-component.css'

function EmployeeComponent() {
    // Valores de muestra luego se usaran resultados de consultas SQL.
    const registeredPeople = 8
    const activePeople = 7
    const monthlyBaseSalaries = 4800
    const sampleSalaryCount = 8

    return (
        <main className="employee-summary" aria-label="Resumen del personal">
            <article className="employee-summary-card">
                <h2 className="employee-summary-label">Personal registrado</h2>
                <p className="employee-summary-value">{registeredPeople} personas</p>
                <p className="employee-summary-detail">3 sucursales · datos ficticios</p>
            </article>

            <article className="employee-summary-card">
                <h2 className="employee-summary-label">Personal activo</h2>
                <p className="employee-summary-value">{activePeople} personas</p>
                <p className="employee-summary-detail">1 persona en vacaciones</p>
            </article>

            <article className="employee-summary-card">
                <h2 className="employee-summary-label">Salarios base mensuales</h2>
                <p className="employee-summary-value">
                    {monthlyBaseSalaries.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    })}
                </p>
                <p className="employee-summary-detail">{sampleSalaryCount} salarios de muestra · USD</p>
            </article>

            {/*Tabla de empleados */}
            <section className="employee-list" aria-labelledby="employee-list-title">
                <p className="employee-list-title" style={{color: '#292D29'}}>Listado de empleados</p>
                <p style={{color: '#7A7D75', fontSize: '10px'}}>Selecciona una persona para consultar o editar su ficha.</p>

                <table>
                    {/* Encabezados y filas de empleados */}
                </table>
            </section>
        </main>
    )
}

export default EmployeeComponent
