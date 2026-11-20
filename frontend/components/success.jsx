import '../src/success.css'
import successIcon from '../src/assets/check2.svg'

function Success({ isOpen, onClose }) {
    if (!isOpen) {
        return null;
    }

    return (
        <main className="success-page" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <div className="success-main-container">
                <div>
                    <h1 id="success-title">¡Empleado Registrado!</h1>
                    <img src={successIcon} alt="Empleado registrado" className="success-icon" />
                    <p>Su empleado ha sido registrado correctamente.</p>
                    <button type="button" onClick={onClose}>Aceptar</button>
                </div>
            </div>
        </main>
    );
}

export default Success;