import { useEffect, useState } from 'react';
import { solicitudApi } from '../api.js';

function InicioPage({ usuario, modulosDisponibles }) {
    const [estadoApi, setEstadoApi] = useState('comprobando');

    useEffect(() => {
        let activo = true;
        solicitudApi('/health')
            .then(() => {
                if (activo) setEstadoApi('conectado');
            })
            .catch(() => {
                if (activo) setEstadoApi('sin conexión');
            });
        return () => { activo = false; };
    }, []);

    const nombreRol = usuario.rol?.replaceAll('_', ' ') || 'usuario';

    return (
        <div className="dashboard-grid">
            <section className="dashboard-welcome">
                <div>
                    <h1>Hola, {usuario.nombre_completo?.split(' ')[0] || 'bienvenido'}.</h1>
                    <p>Tu espacio de trabajo para la operación de Orígenes SV.</p>
                </div>
                <img className="dashboard-art" src="/brand/origenes-isotipo.png" alt="Isotipo de Orígenes SV" />
            </section>

            <article className="stat-card">
                <p className="stat-card-label">Sesión</p>
                <p className="stat-card-value">{nombreRol}</p>
                <p className="stat-card-note">{usuario.sucursal || 'Acceso general'}</p>
            </article>
            <article className="stat-card">
                <p className="stat-card-label">Módulos disponibles</p>
                <p className="stat-card-value">{modulosDisponibles.length}</p>
                <p className="stat-card-note">Según los permisos asignados a tu usuario</p>
            </article>
            <article className="stat-card">
                <p className="stat-card-label">Conexión con el servidor</p>
                <p className="stat-card-value">
                    <span className={`status-pill ${estadoApi === 'conectado' ? '' : 'is-warning'}`}>
                        {estadoApi}
                    </span>
                </p>
                <p className="stat-card-note">Estado de API y base de datos</p>
            </article>

            <section className="surface-card" style={{ gridColumn: '1 / -1' }}>
                <h2>Tu acceso</h2>
                {modulosDisponibles.length === 0 ? (
                    <p className="empty-state">Tu cuenta no tiene módulos asignados. Contacta al administrador.</p>
                ) : (
                    <p className="page-heading-description">
                        Tienes acceso a: {modulosDisponibles.map((modulo) => modulo.name).join(', ')}.
                        Usa el menú para abrir una sección.
                    </p>
                )}
            </section>
        </div>
    );
}

export default InicioPage;
