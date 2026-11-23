import { useState } from 'react';
import { solicitudApi } from '../api.js';

function CambiarPasswordPage({ alCambiar }) {
    const [passwordActual, setPasswordActual] = useState('');
    const [passwordNueva, setPasswordNueva] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    async function cambiar(event) {
        event.preventDefault();
        setError('');
        if (passwordNueva !== confirmacion) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }
        if (passwordNueva.length < 8) {
            setError('La contraseña nueva debe tener al menos 8 caracteres.');
            return;
        }

        setCargando(true);
        try {
            await solicitudApi('/cambiar-password', {
                method: 'POST',
                body: { password_actual: passwordActual, password_nueva: passwordNueva }
            });
            alCambiar();
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="password-screen">
            <form className="password-card" onSubmit={cambiar}>
                <img className="workspace-brand-mark" src="/brand/origenes-isotipo.png" alt="" />
                <h1>Actualiza tu contraseña</h1>
                <p>Por seguridad, debes cambiar la contraseña inicial antes de continuar.</p>
                {error && <div className="notice is-error" role="alert">{error}</div>}
                <label className="form-field">
                    Contraseña actual
                    <input type="password" autoComplete="current-password" required value={passwordActual} onChange={(event) => setPasswordActual(event.target.value)} />
                </label>
                <label className="form-field">
                    Nueva contraseña
                    <input type="password" autoComplete="new-password" minLength="8" maxLength="100" required value={passwordNueva} onChange={(event) => setPasswordNueva(event.target.value)} />
                </label>
                <label className="form-field">
                    Confirma la nueva contraseña
                    <input type="password" autoComplete="new-password" minLength="8" maxLength="100" required value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} />
                </label>
                <button className="primary-button" type="submit" disabled={cargando}>
                    {cargando ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
            </form>
        </main>
    );
}

export default CambiarPasswordPage;
