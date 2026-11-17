import '../src/employee-add.css'
import personalInformation from '../src/assets/person.svg'


function EmployeeAdd() {

    const EmployeeTest = [
        { position: 'Barista', branch: 'Santa Elena' },
        { position: 'Mesero', branch: 'Escalon' },
        { position: 'Gerente', branch: 'Mejicanos' }
    ]

    const tipe = [
        { type: 'Indefinido' },
        { type: 'Temporal' },
        { type: 'Fijo' }
    ]

    const journey = [
        { format: 'Completo' },
        { format: 'Medio tiempo' },
        { format: 'Servicios Profesionales' }
    ]

    const pay = [
        { format: 'Quincenal' },
        { format: 'Mensual' },
        { format: 'Por Horas' }
    ]

    return (
        <main className='employee-form-main'>
            <form action="">
                <div className='employee-add-container'>
                    <header className='employee-form-header'>
                        <h1>Inscripción de Nuevo Personal</h1>
                        <p>Completa los datos para registrar un nuevo colaborador en el sistema</p>
                    </header>
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={personalInformation} alt="" className='employee-image' />
                            <span className='employee-title'>Datos personales</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--personal'>
                            <div className='employee-field employee-field--personal-full'>
                                <label htmlFor='employee-name'>Nombre completo</label>
                                <input id='employee-name' type="text" placeholder='Ej. Ricardo Iglesias' />
                            </div>
                            <div className='employee-field employee-field--personal-full'>
                                <label htmlFor='employee-document'>Documento de identidad (DUI/Pasaporte)</label>
                                <input id='employee-document' type="text" placeholder='Ej. 00000000-0' />
                            </div>
                            <div className='employee-field employee-field--personal-date'>
                                <label htmlFor='employee-birth-date'>Fecha de nacimiento</label>
                                <input id='employee-birth-date' type="date" />
                            </div>
                            <div className='employee-field employee-field--personal-email'>
                                <label htmlFor='employee-email'>Correo electrónico</label>
                                <input id='employee-email' type="email" placeholder='Ej. empleado@origenes.com' />
                            </div>
                            <div className='employee-field employee-field--personal-phone'>
                                <label htmlFor='employee-phone'>Teléfono</label>
                                <input id='employee-phone' type="tel" placeholder='Ej. 61619506' />
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={personalInformation} alt="" className='employee-image' />
                            <span className='employee-title'>Datos de contratacion</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-position'>Cargo</label>
                                <select name="position" id="employee-position">
                                    {EmployeeTest.map((employee) => (
                                        <option key={employee.position} value={employee.position}>
                                            {employee.position}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-branch'>Sucursal/Ubicación</label>
                                <select name="branch" id="employee-branch">
                                    {EmployeeTest.map((employee) => (
                                        <option key={employee.branch} value={employee.branch}>
                                            {employee.branch}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-hire-date'>Fecha de contratación</label>
                                <input id='employee-hire-date' type="date" />
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-contract-type'>Tipo de contrato</label>
                                <select name="contractType" id="employee-contract-type">
                                    {tipe.map((tipe) => (
                                        <option key={tipe.type} value={tipe.type}>
                                            {tipe.type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-work-schedule'>Jornada</label>
                                <select name="workSchedule" id="employee-work-schedule">
                                    {journey.map((journey) =>
                                    (
                                        <option key={journey.format} value={journey.format}>
                                            {journey.format}
                                        </option>
                                    )
                                    )}
                                </select>
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={personalInformation} alt="" className='employee-image' />
                            <span className='employee-title'>Detalles Salariales y de Pago</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-salary'>Salario mensual ($)</label>
                                <input id='employee-salary' name='salary' type="number" placeholder='Ej. 400.95' />
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-payment-frequency'>Forma de pago</label>
                                <select name="paymentFrequency" id="employee-payment-frequency">
                                    {pay.map((pay) => (
                                        <option key={pay.format} value={pay.format}>
                                            {pay.format}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={personalInformation} alt="" className='employee-image' />
                            <span className='employee-title'>Afiliaciones Laborales</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-isss'>Número de ISSS</label>
                                <input id='employee-isss' name='isss' type="text" placeholder='Ej. 205055782' />
                                <small>ISSS laboral: 3%</small>
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-afp'>Número de AFP</label>
                                <input id='employee-afp' name='afp' type="text" placeholder='Ej. 129867354290' />
                                <small>AFP laboral: 7.25%</small>
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <div className='employee-form-actions'>
                        <button className='employee-cancel-button' type='button'>Cancelar</button>
                        <button className='employee-submit-button' type='button'>Registrar Personal</button>
                    </div>
                </div>
            </form>
        </main>
    )


}


export default EmployeeAdd;