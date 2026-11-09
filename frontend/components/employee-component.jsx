import '../src/employee-component.css'

function EmployeeComponent() {
    // Valores de muestra luego se usaran resultados de consultas SQL.
    const registeredPeople = 8
    const activePeople = 7
    const monthlyBaseSalaries = 4800
    const sampleSalaryCount = 8
    //Falta ver la logica para sql
    const employeeTest = [
        {
        name: 'Sergio Perez',
        position: 'Cocinero',
        branch: 'Mejicanos',
        status: 'Activo',
        monthlySalary: 600,
        },
        {
        name: 'Daniel Ricciardo',
        position: 'Mesero',
        branch: 'Santa Elena',
        status: 'Activo',
        monthlySalary: 600,
        }
    ]

    return (

        
        <main className="employee-summary" aria-label="Resumen del personal">
            <header className="employee-head">
                <div>
                    <h1 className="employee-page-title">Empleados</h1>
                    <p className="employee-page-description">
                        Equipo Orígenes · Expedientes, puestos y condiciones de contratación
                    </p>
                </div>
                <button className="employee-add-button" type="button">
                    <span aria-hidden="true">+</span>
                    Nuevo empleado
                </button>
            </header>

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
                <p className="employee-list-title" style={{ color: '#292D29' }}>Listado de empleados</p>
                <p style={{ color: '#7A7D75', fontSize: '10px' }}>Selecciona una persona para consultar o editar su ficha.</p>

                <table>
                    {/* Encabezados y filas de empleados */}
                    <thead>
                        <tr>
                            <th scope="col">Empleado</th>
                            <th scope="col">Puesto</th>
                            <th scope="col">Sucursal</th>
                            <th scope="col">Estado</th>
                            <th scope="col">Base mensual</th>
                        </tr>
                    </thead>

                    <tbody>
                        {employeeTest.map((employee) => (
                            <tr key={employee.id}>
                                <td>{employee.name}</td>
                                <td>{employee.position}</td>
                                <td>{employee.branch}</td>
                                <td>{employee.status}</td>
                                <td>
                                    {Number(employee.monthlySalary).toLocaleString('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </main>
    )
}

export default EmployeeComponent
