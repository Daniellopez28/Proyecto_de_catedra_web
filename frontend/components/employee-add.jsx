import '../src/employee-add.css'
import personalInformation from '../src/assets/person.svg'


function EmployeeAdd() {

    return (
        <main>
            <form action="">
                <div className='employee-add-container'>
                    <section>
                        <p className='employee-personal-information-title'>
                            <img src={personalInformation} alt="" className='employee-image' />
                            <span className='employee-title'>Datos personales</span>
                        </p>
                        <div className='employee-personal-information'>
                            <div className='employee-field employee-field--full'>
                                <label htmlFor='employee-name'>Nombre completo</label>
                                <input id='employee-name' type="text" placeholder='Ej. Ricardo Iglesias' />
                            </div>
                            <div className='employee-field employee-field--full'>
                                <label htmlFor='employee-document'>Documento de identidad (DUI/Pasaporte)</label>
                                <input id='employee-document' type="text" placeholder='Ej. 00000000-0' />
                            </div>
                            <div className='employee-field employee-field--date'>
                                <label htmlFor='employee-birth-date'>Fecha de nacimiento</label>
                                <input id='employee-birth-date' type="date" />
                            </div>
                            <div className='employee-field employee-field--email'>
                                <label htmlFor='employee-email'>Correo electrónico</label>
                                <input id='employee-email' type="email" placeholder='Ej. empleado@origenes.com' />
                            </div>
                            <div className='employee-field employee-field--phone'>
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
                        <div className='employee-personal-information'>
                            <div className='employee-field employee-field--full'>
                                <label htmlFor='employee-name'>Nombre completo</label>
                                <input id='employee-name' type="text" placeholder='Ej. Ricardo Iglesias' />
                            </div>
                            <div className='employee-field employee-field--full'>
                                <label htmlFor='employee-document'>Documento de identidad (DUI/Pasaporte)</label>
                                <input id='employee-document' type="text" placeholder='Ej. 00000000-0' />
                            </div>
                            <div className='employee-field employee-field--date'>
                                <label htmlFor='employee-birth-date'>Fecha de nacimiento</label>
                                <input id='employee-birth-date' type="date" />
                            </div>
                            <div className='employee-field employee-field--email'>
                                <label htmlFor='employee-email'>Correo electrónico</label>
                                <input id='employee-email' type="email" placeholder='Ej. empleado@origenes.com' />
                            </div>
                            <div className='employee-field employee-field--phone'>
                                <label htmlFor='employee-phone'>Teléfono</label>
                                <input id='employee-phone' type="tel" placeholder='Ej. 61619506' />
                            </div>
                        </div>
                    </section>
                    <hr className='employee-section-divider' />
                </div>
            </form>
        </main>
    )


}


export default EmployeeAdd;