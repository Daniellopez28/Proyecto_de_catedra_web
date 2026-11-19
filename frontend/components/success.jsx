import '../src/success.css'
import successIcon from '../src/assets/check2.svg'

function Success() {


    return (
        <main className="success-page">
            <div className="success-main-container">
                <div>
                    <h1>¡Empleado Registrado!</h1>
                    <img src={successIcon} alt="" className='success-icon' />
                    <p> Su empleado ha sido registrado correctamente.</p>
                    <button type="button">Aceptar</button>
                </div>
            </div>
        </main>
    )
}

export default Success;