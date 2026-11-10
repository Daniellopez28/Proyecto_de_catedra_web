import '../src/employee-component.css'
import { useState } from 'react'

function EmployeeComponent() {
    // Valores de muestra luego se usaran resultados de consultas SQL.
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
        },
        {
            name: 'Lewis Hamilton',
            position: 'Gerente',
            branch: 'Escalon',
            status: 'Activo',
            monthlySalary: 1200,
        },
        {
            name: 'Fernando Alonso',
            position: 'Supervisor',
            branch: 'Santa Tecla',
            status: 'Inactivo',
            monthlySalary: 950,
        },
        {
            name: 'Charles Leclerc',
            position: 'Cajero',
            branch: 'Mejicanos',
            status: 'Activo',
            monthlySalary: 550,
        },
        {
            name: 'Lando Norris',
            position: 'Barista',
            branch: 'Escalon',
            status: 'Inactivo',
            monthlySalary: 625,
        },
        {
            name: 'Oscar Piastri',
            position: 'Ayudante de cocina',
            branch: 'Santa Tecla',
            status: 'Activo',
            monthlySalary: 500,
        },
        {
            name: 'Max Verstappen',
            position: 'Mesero',
            branch: 'Mejicanos',
            status: 'Activo',
            monthlySalary: 575,
        }
    ]
    //esta variable sirve para guardar el boton seleccionado
    const [selectedBranch, setSelectedBranch] = useState('Todos')
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

            {/*Apartado para botones de filtrado y busqueda*/}
            <section className="branch-filters">
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
                />
            </section>

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
                        {/*Recorre el arreglo com los datos y los agrega automaticamente*/}
                        {filteredEmployees.map((employee) => (
                            <tr key={employee.name}>
                                <td>{employee.name}</td>
                                <td>{employee.position}</td>
                                <td>{employee.branch}</td>
                                <td>{employee.status}</td>
                                <td>
                                    {/*Sirve para poner la moneda local en USD */}
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
            </section>
            <footer>Origenes S.A de C.V</footer>
        </main>
    )
}

export default EmployeeComponent
