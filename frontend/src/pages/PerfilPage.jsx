import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function PerfilPage() {
    const [perfil, setPerfil] = useState(null);
    const [formulario, setFormulario] = useState({ nombre: '', telefono: '', direccion: '' });
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        let activo = true;
        solicitudApi('/clientes/yo').then((respuesta) => {
            if (!activo) return;
            setPerfil(respuesta);
            setFormulario({
                nombre: respuesta.nombre || '',
                telefono: respuesta.telefono || '',
                direccion: respuesta.direccion || ''
            });
        }).catch((fallo) => {
            if (activo) setError(fallo.message);
        }).finally(() => {
            if (activo) setCargando(false);
        });
        return () => { activo = false; };
    }, []);

    async function guardar(event) {
        event.preventDefault();
        setProcesando(true);
        setError('');
        setMensaje('');
        try {
            const respuesta = await solicitudApi('/clientes/yo', {
                method: 'PATCH',
                body: {
                    nombre: formulario.nombre,
                    telefono: formulario.telefono || null,
                    direccion: formulario.direccion || null
                }
            });
            setPerfil(respuesta.cliente);
            setMensaje(respuesta.mensaje);
        } catch (fallo) {
            setError(fallo.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <>
            <header className="page-heading">
                <div>
                    <h1>Mi perfil</h1>
                    <p>Consulta y actualiza los datos personales permitidos de tu cuenta.</p>
                </div>
            </header>
            {error && <div className="notice is-error" role="alert">{error}</div>}
            {mensaje && <div className="notice" role="status">{mensaje}</div>}
            {cargando ? <p className="loading-state">Cargando perfil…</p> : perfil && (
                <form className="surface-card" onSubmit={guardar}>
                    <h2>Datos del cliente</h2>
                    <div className="form-grid">
                        <label className="form-field">Nombre<input maxLength="150" required value={formulario.nombre} onChange={(event) => setFormulario({ ...formulario, nombre: event.target.value })} /></label>
                        <label className="form-field">Correo<input value={perfil.correo || ''} disabled /></label>
                        <label className="form-field">DUI<input value={perfil.dui || ''} disabled /></label>
                        <label className="form-field">Teléfono<input maxLength="20" value={formulario.telefono} onChange={(event) => setFormulario({ ...formulario, telefono: event.target.value })} /></label>
                        <label className="form-field form-field is-wide">Dirección<textarea value={formulario.direccion} onChange={(event) => setFormulario({ ...formulario, direccion: event.target.value })} /></label>
                    </div>
                    <button className="primary-button" type="submit" disabled={procesando} style={{ marginTop: 16 }}>{procesando ? 'Guardando…' : 'Guardar perfil'}</button>
                </form>
            )}
        </>
    );
}

export default PerfilPage;
