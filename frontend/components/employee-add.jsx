import '../src/employee-add.css'
import personalInformation from '../src/assets/person.svg'
import briefcaseIcon from '../src/assets/briefcase.svg'
import specificationIcon from '../src/assets/coin.svg'
import cardTextIcon from '../src/assets/card-text.svg'
import Success from './success.jsx'
import { useState } from 'react'

function EmployeeAdd({ open, closed }) {
    const [showSuccess, setShowSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!open) {
        return null;
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        setIsSubmitting(true)

        const form = event.currentTarget
        const employeeData = Object.fromEntries(new FormData(form).entries())

        window.setTimeout(() => {
            console.log('Simulación de registro:', employeeData)
            form.reset()
            setIsSubmitting(false)
            setShowSuccess(true)
        }, 500)
    }

    const closeSuccessAndForm = () => {
        setShowSuccess(false)
        closed()
    }

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
            <form onSubmit={handleSubmit}>
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
                                <label htmlFor='employee-name' >Nombre completo</label>
                                <input id='employee-name' type="text" placeholder='Ej. Ricardo Ernesto Iglesias Flores' required/>
                            </div>
                            <div className='employee-field employee-field--personal-full'>
                                <label htmlFor='employee-document'>Documento de identidad (DUI/Pasaporte)</label>
                                <input id='employee-document' type="text" placeholder='Ej. 00000000-0' required/>
                            </div>
                            <div className='employee-field employee-field--personal-date'>
                                <label htmlFor='employee-birth-date'>Fecha de nacimiento</label>
                                <input id='employee-birth-date' type="date" required/>
                            </div>
                            <div className='employee-field employee-field--personal-email'>
                                <label htmlFor='employee-email'>Correo electrónico</label>
                                <input id='employee-email' type="email" placeholder='Ej. empleado@origenes.com' required/>
                            </div>
                            <div className='employee-field employee-field--personal-phone'>
                                <label htmlFor='employee-phone'>Teléfono</label>
                                <input id='employee-phone' type="tel" placeholder='Ej. 61619506' required/>
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={briefcaseIcon} alt="" className='employee-image' />
                            <span className='employee-title'>Datos de contratacion</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-position'>Cargo</label>
                                <select name="position" id="employee-position" required>
                                    {EmployeeTest.map((employee) => (
                                        <option key={employee.position} value={employee.position}>
                                            {employee.position}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-branch'>Sucursal/Ubicación</label>
                                <select name="branch" id="employee-branch" required>
                                    {EmployeeTest.map((employee) => (
                                        <option key={employee.branch} value={employee.branch}>
                                            {employee.branch}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-hire-date'>Fecha de contratación</label>
                                <input id='employee-hire-date' type="date" required/>
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-contract-type'>Tipo de contrato</label>
                                <select name="contractType" id="employee-contract-type" required>
                                    {tipe.map((tipe) => (
                                        <option key={tipe.type} value={tipe.type}>
                                            {tipe.type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='employee-field employee-field--third'>
                                <label htmlFor='employee-work-schedule'>Jornada</label>
                                <select name="workSchedule" id="employee-work-schedule" required>
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
                            <img src={specificationIcon} alt="" className='employee-image' />
                            <span className='employee-title'>Detalles Salariales y de Pago</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-salary'>Salario mensual ($)</label>
                                <input id='employee-salary' name='salary' type="number" placeholder='Ej. 400.95' required/>
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-payment-frequency'>Forma de pago</label>
                                <select name="paymentFrequency" id="employee-payment-frequency" required>
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
                            <img src={cardTextIcon} alt="" className='employee-image' />
                            <span className='employee-title'>Afiliaciones Laborales</span>
                        </p>
                        <div className='employee-personal-information employee-personal-information--six-columns'>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-isss'>Número de ISSS</label>
                                <input id='employee-isss' name='isss' type="text" placeholder='Ej. 205055782' required />
                                <small>ISSS laboral: 3%</small>
                            </div>
                            <div className='employee-field employee-field--half'>
                                <label htmlFor='employee-afp'>Número de AFP</label>
                                <input id='employee-afp' name='afp' type="text" placeholder='Ej. 129867354290'required />
                                <small>AFP laboral: 7.25%</small>
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                    <div className='employee-form-actions'>
                        <button className='employee-cancel-button' type='button' onClick={closed}>Cancelar</button>
                        <button className='employee-submit-button' type='submit' disabled={isSubmitting}>
                            {isSubmitting ? 'Registrando...' : 'Registrar Empleado'}
                        </button>
                        
                    </div>
                </div>
            </form>
            <Success isOpen={showSuccess} onClose={closeSuccessAndForm} />
        </main>
    )


}


export default EmployeeAdd;