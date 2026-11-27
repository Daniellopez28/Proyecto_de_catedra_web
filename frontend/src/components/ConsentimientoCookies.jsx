import { useState } from 'react';
import './consentimiento-cookies.css';

const clavePreferencia = 'origenes-preferencia-cookies';

function leerPreferencia() {
    try {
        const decision = window.localStorage.getItem(clavePreferencia);
        return {
            decision: ['all', 'necessary'].includes(decision) ? decision : null,
            error: ''
        };
    } catch {
        return {
            decision: null,
            error: 'No se pudo leer la preferencia de cookies de este navegador.'
        };
    }
}

function ConsentimientoCookies() {
    const [preferencia, setPreferencia] = useState(leerPreferencia);
    const [mostrarDetalles, setMostrarDetalles] = useState(false);

    function guardarPreferencia(decision) {
        try {
            window.localStorage.setItem(clavePreferencia, decision);
            setPreferencia({ decision, error: '' });
        } catch {
            setPreferencia({
                decision: null,
                error: 'No se pudo guardar tu preferencia. Revisa la configuración de almacenamiento del navegador.'
            });
        }
    }

    if (preferencia.decision) {
        return (
            <button
                className="cookies-preferencias"
                type="button"
                onClick={() => setPreferencia({ decision: null, error: '' })}
            >
                Preferencias de cookies
            </button>
        );
    }

    return (
        <aside className="cookies-panel" aria-label="Preferencias de cookies">
            <div className="cookies-panel-texto">
                <h2>Tu privacidad importa</h2>
                <p>
                    Usamos una cookie estrictamente necesaria para mantener tu sesión segura.
                    Actualmente no utilizamos cookies de analítica ni publicidad.
                </p>
                <button
                    className="cookies-detalles-toggle"
                    type="button"
                    aria-expanded={mostrarDetalles}
                    onClick={() => setMostrarDetalles((actual) => !actual)}
                >
                    {mostrarDetalles ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
                {mostrarDetalles && (
                    <p className="cookies-detalles">
                        La cookie de sesión es HttpOnly y se elimina al cerrar sesión o al expirar.
                        Puedes cambiar esta preferencia cuando quieras desde el botón de preferencias.
                    </p>
                )}
                {preferencia.error && <p className="cookies-error" role="alert">{preferencia.error}</p>}
            </div>
            <div className="cookies-panel-acciones">
                <button
                    className="cookies-boton cookies-boton-secundario"
                    type="button"
                    onClick={() => guardarPreferencia('necessary')}
                >
                    Solo necesarias
                </button>
                <button
                    className="cookies-boton cookies-boton-principal"
                    type="button"
                    onClick={() => guardarPreferencia('all')}
                >
                    Aceptar todas
                </button>
            </div>
        </aside>
    );
}

export default ConsentimientoCookies;
