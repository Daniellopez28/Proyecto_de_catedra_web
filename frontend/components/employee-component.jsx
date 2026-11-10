import '../src/employee-component.css'
import { useState } from 'react'
import EmployeeInfoComponent from './employee-info-component'

function EmployeeComponent() {
    // Valores de muestra luego se usaran resultados de consultas SQL.
    //Falta ver la logica para sql

    const employeeTest = [
        {
            name: 'Sergio Perez',
            recordCode: 'DEMO-SP',
            position: 'Cocinero',
            branch: 'Mejicanos',
            status: 'Activo',
            monthlySalary: 600,
            contractDate: '03 ago 2026',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $18.00 mensuales. AFP laboral: 7.25% · $43.50 mensuales.',
        },
        {
            name: 'Daniel Ricciardo',
            recordCode: 'DEMO-DR',
            position: 'Mesero',
            branch: 'Santa Elena',
            status: 'Activo',
            monthlySalary: 600,
            contractDate: '15 ene 2025',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $18.00 mensuales. AFP laboral: 7.25% · $43.50 mensuales.',
        },
        {
            name: 'Lewis Hamilton',
            recordCode: 'DEMO-LH',
            position: 'Gerente',
            branch: 'Escalon',
            status: 'Activo',
            monthlySalary: 1200,
            contractDate: '10 mar 2024',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Mensual',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $36.00 mensuales. AFP laboral: 7.25% · $87.00 mensuales.',
        },
        {
            name: 'Fernando Alonso',
            recordCode: 'DEMO-FA',
            position: 'Supervisor',
            branch: 'Santa Tecla',
            status: 'Inactivo',
            monthlySalary: 950,
            contractDate: '22 jul 2023',
            contractType: 'Plazo fijo',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $28.50 mensuales. AFP laboral: 7.25% · $68.88 mensuales.',
        },
        {
            name: 'Charles Leclerc',
            recordCode: 'DEMO-CL',
            position: 'Cajero',
            branch: 'Mejicanos',
            status: 'Activo',
            monthlySalary: 550,
            contractDate: '05 feb 2026',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $16.50 mensuales. AFP laboral: 7.25% · $39.88 mensuales.',
        },
        {
            name: 'Lando Norris',
            recordCode: 'DEMO-LN',
            position: 'Barista',
            branch: 'Escalon',
            status: 'Inactivo',
            monthlySalary: 625,
            contractDate: '18 sep 2024',
            contractType: 'Plazo fijo',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $18.75 mensuales. AFP laboral: 7.25% · $45.31 mensuales.',
        },
        {
            name: 'Oscar Piastri',
            recordCode: 'DEMO-OP',
            position: 'Ayudante de cocina',
            branch: 'Santa Tecla',
            status: 'Activo',
            monthlySalary: 500,
            contractDate: '01 jun 2026',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $15.00 mensuales. AFP laboral: 7.25% · $36.25 mensuales.',
        },
        {
            name: 'Max Verstappen',
            recordCode: 'DEMO-MV',
            position: 'Mesero',
            branch: 'Mejicanos',
            status: 'Activo',
            monthlySalary: 575,
            contractDate: '12 nov 2025',
            contractType: 'Indefinido',
            schedule: 'Completa',
            paymentFrequency: 'Quincenal',
            isss: 'Afiliación de muestra',
            afp: 'Afiliación de muestra',
            deductionNote: 'ISSS laboral: 3% · $17.25 mensuales. AFP laboral: 7.25% · $41.69 mensuales.',
        }
    ]
    //esta variable sirve para guardar el boton seleccionado
    const [selectedBranch, setSelectedBranch] = useState('Todos')
    const [selectedEmployee, setSelectedEmployee] = useState(employeeTest[0].name)
    //estas variables sirven para el input de busqueda
    const [search, setSearch] = useState('')
    const branches = ['Todos', ...new Set(employeeTest.map((employee) => employee.branch))]
    const filteredEmployees = employeeTest.filter((employee) => {
        const matchesBranch =
            selectedBranch === 'Todos' || employee.branch === selectedBranch
        const matchesName = employee.name
            .toLowerCase()
            .includes(search.trim().toLowerCase())

        return matchesBranch && matchesName
    })

    // Cantidad de empleados cuyo estado es "Activo"

    const activeCount = employeeTest.filter(
        function (employee) {
            return employee.status === 'Activo';
        }
    ).length;

    // suma el salrio de los empleados, con reduce se recorre el arreglo y se acumula un unico
    //resultado, total empieza en 0 y guarda la suma y number convierte el salario a numero por si 
    //viene en string o un formato que no sea numerico
    const monthlyBaseSalaries = employeeTest.reduce(
        (total, employee) => total + Number(employee.monthlySalary || 0),
        0
    )
    //cuenta los registros con salarios
    const sampleSalaryCount = employeeTest.filter(
        (employee) => employee.monthlySalary != null
    ).length

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
                <p className="employee-summary-value">{employeeTest.length} personas</p>
                <p className="employee-summary-detail">{activeCount} sucursales · datos ficticios</p>
            </article>

            <article className="employee-summary-card">
                <h2 className="employee-summary-label">Personal activo</h2>
                <p className="employee-summary-value">{activeCount} personas</p>
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

            <div className="employee-content">
                <div className="employee-main-column">
                    <section className="branch-filters" aria-label="Filtros de empleados">
                        {branches.map((branch) => (
                            <button
                                key={branch}
                                type="button"
                                className={selectedBranch === branch ? 'selected' : ''}
                                onClick={() => setSelectedBranch(branch)}
                            >
                                {branch} · {branch === 'Todos'
                                    ? employeeTest.length
                                    : employeeTest.filter((employee) => employee.branch === branch).length}
                            </button>
                        ))}
                        <input
                            placeholder="Buscar empleado"
                            type="search"
                            className="employee-input"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Buscar empleado"
                        />
                    </section>

                    <section className="employee-list" aria-labelledby="employee-list-title">
                        <p id="employee-list-title" className="employee-list-title">Listado de empleados</p>
                        <p className="employee-list-description">Selecciona una persona para consultar o editar su ficha.</p>

                        <div className="employee-table-wrapper">
                            <table className="employee-table">
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
                                    {filteredEmployees.map((employee) => (
                                        <tr
                                            key={employee.name}
                                            className={selectedEmployee === employee.name ? 'is-selected' : ''}
                                            onClick={() => setSelectedEmployee(
                                                selectedEmployee === employee.name ? '' : employee.name
                                            )}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    setSelectedEmployee(
                                                        selectedEmployee === employee.name ? '' : employee.name
                                                    )
                                                }
                                            }}
                                            tabIndex={0}
                                            aria-selected={selectedEmployee === employee.name}
                                        >
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
                                    {filteredEmployees.length === 0 && (
                                        <tr>
                                            <td colSpan="5">No se encontraron empleados.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
                <section className="employee-info-panel">
                    {selectedEmployee && (
                        <EmployeeInfoComponent
                            employee={employeeTest.find((employee) => employee.name === selectedEmployee)}
                        />
                    )}
                </section>
            </div>
        </main>
    )
}

export default EmployeeComponent
