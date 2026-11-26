import { useEffect, useMemo, useState } from 'react';
import './workspace.css';
import Login from '../components/login.jsx';
import SideNavbar from '../components/side-navbar.jsx';
import { borrarSesion, leerSesion, guardarSesion, solicitudApi } from './api.js';
import { modulosPermitidos } from './navigation.js';
import InicioPage from './pages/InicioPage.jsx';
import VentasPage from './pages/VentasPage.jsx';
import InventarioPage from './pages/InventarioPage.jsx';
import PlanillasPage from './pages/PlanillasPage.jsx';
import EmpleadosPage from './pages/EmpleadosPage.jsx';
import ReservasPage from './pages/ReservasPage.jsx';
import CajaPage from './pages/CajaPage.jsx';
import CambiarPasswordPage from './pages/CambiarPasswordPage.jsx';
import ComprasPage from './pages/ComprasPage.jsx';
import ProductosPage from './pages/ProductosPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import AdministracionPage from './pages/AdministracionPage.jsx';
import ReportesPage from './pages/ReportesPage.jsx';
import PerfilPage from './pages/PerfilPage.jsx';

const titulos = {
    inicio: 'Inicio',
    ventas: 'Ventas y pedidos',
    reservas: 'Reservas y mesas',
    caja: 'Caja',
    inventario: 'Inventario',
    compras: 'Compras y proveedores',
    productos: 'Menú y productos',
    empleados: 'Empleados',
    planillas: 'Planillas',
    usuarios: 'Usuarios',
    administracion: 'Administración',
    reportes: 'Reportes',
    perfil: 'Mi perfil'
};

function App() {
    const [sesion, setSesion] = useState(leerSesion);
    const [pagina, setPagina] = useState('inicio');
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [validandoSesion, setValidandoSesion] = useState(Boolean(leerSesion()?.token));
    const [errorSesion, setErrorSesion] = useState('');
    const [intentoValidacion, setIntentoValidacion] = useState(0);
    const items = useMemo(
        () => modulosPermitidos(sesion?.usuario?.permisos),
        [sesion?.usuario?.permisos]
    );

    useEffect(() => {
        function expirarSesion() {
            borrarSesion();
            setSesion(null);
            setPagina('inicio');
        }
        window.addEventListener('origen:sesion-expirada', expirarSesion);
        return () => window.removeEventListener('origen:sesion-expirada', expirarSesion);
    }, []);

    useEffect(() => {
        if (!sesion?.token) {
            return undefined;
        }

        let activo = true;
        solicitudApi('/session')
            .then((sesionActual) => {
                if (!activo) return;
                guardarSesion(sesionActual);
                setErrorSesion('');
                setSesion(sesionActual);
            })
            .catch((fallo) => {
                if (!activo) return;
                if (fallo.status === 401) {
                    borrarSesion();
                    setSesion(null);
                } else {
                    setErrorSesion(fallo.message);
                }
            })
            .finally(() => {
                if (activo) setValidandoSesion(false);
            });
        return () => { activo = false; };
    }, [sesion?.token, intentoValidacion]);

    const paginaActual = items.some((item) => item.id === pagina) ? pagina : 'inicio';

    async function cerrar() {
        try {
            await solicitudApi('/logout', { method: 'POST' });
        } catch {
            // La sesión local se elimina incluso si el servidor dejó de estar disponible.
        } finally {
            borrarSesion();
            setSesion(null);
            setPagina('inicio');
        }
    }

    function actualizarSesion(actualizada) {
        guardarSesion(actualizada);
        setSesion(actualizada);
    }

    if (validandoSesion) {
        return <main className="password-screen"><p className="loading-state">Verificando sesión…</p></main>;
    }

    if (errorSesion) {
        return (
            <main className="password-screen">
                <section className="password-card">
                    <h1>No se pudo verificar la sesión</h1>
                    <p>{errorSesion}</p>
                    <div className="page-actions">
                        <button className="primary-button" type="button" onClick={() => {
                            setValidandoSesion(true);
                            setIntentoValidacion((actual) => actual + 1);
                        }}>
                            Reintentar
                        </button>
                        <button className="secondary-button" type="button" onClick={() => {
                            borrarSesion();
                            setSesion(null);
                            setErrorSesion('');
                        }}>
                            Ir al inicio de sesión
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    if (!sesion?.usuario) {
        return <Login onLogin={(nuevaSesion) => {
            setValidandoSesion(true);
            setErrorSesion('');
            setSesion(nuevaSesion);
        }} />;
    }

    if (sesion.usuario.debe_cambiar_password) {
        return (
            <CambiarPasswordPage
                alCambiar={() => actualizarSesion({
                    ...sesion,
                    usuario: { ...sesion.usuario, debe_cambiar_password: false }
                })}
            />
        );
    }

    function contenido() {
        const permisos = sesion.usuario.permisos;
        switch (paginaActual) {
            case 'ventas':
                return <VentasPage permisos={permisos} />;
            case 'reservas':
                return <ReservasPage permisos={permisos} usuario={sesion.usuario} />;
            case 'caja':
                return <CajaPage usuario={sesion.usuario} />;
            case 'inventario':
                return <InventarioPage permisos={permisos} usuario={sesion.usuario} />;
            case 'compras':
                return <ComprasPage permisos={permisos} usuario={sesion.usuario} />;
            case 'productos':
                return <ProductosPage permisos={permisos} />;
            case 'empleados':
                return <EmpleadosPage permisos={permisos} usuario={sesion.usuario} />;
            case 'planillas':
                return <PlanillasPage permisos={permisos} />;
            case 'usuarios':
                return <UsuariosPage usuarioActual={sesion.usuario} permisos={permisos} />;
            case 'administracion':
                return <AdministracionPage permisos={permisos} />;
            case 'reportes':
                return <ReportesPage />;
            case 'perfil':
                return <PerfilPage />;
            default:
                return (
                    <InicioPage
                        usuario={sesion.usuario}
                        modulosDisponibles={items.filter((item) => item.id !== 'inicio')}
                    />
                );
        }
    }

    return (
        <div className="workspace">
            <SideNavbar
                items={items}
                selected={paginaActual}
                onSelect={setPagina}
                abierta={menuAbierto}
                onClose={() => setMenuAbierto(false)}
            />
            <main className="workspace-main">
                <header className="workspace-topbar">
                    <div className="workspace-topbar-start">
                        <button
                            className="workspace-menu-toggle"
                            type="button"
                            aria-expanded={menuAbierto}
                            aria-label="Abrir menú de navegación"
                            onClick={() => setMenuAbierto(true)}
                        >
                            Menú
                        </button>
                        <div>
                            <h1 className="workspace-page-title">{titulos[paginaActual] || 'Inicio'}</h1>
                            <p className="workspace-page-subtitle">Sistema de gestión · Orígenes SV</p>
                        </div>
                    </div>
                    <div className="workspace-user">
                        <div>
                            <div className="workspace-user-name">{sesion.usuario.nombre_completo}</div>
                            <div className="workspace-user-detail">
                                {sesion.usuario.rol} · {sesion.usuario.sucursal || 'Acceso general'}
                            </div>
                        </div>
                        <button className="workspace-logout" type="button" onClick={cerrar}>Cerrar sesión</button>
                    </div>
                </header>
                <div className="workspace-content">{contenido()}</div>
            </main>
        </div>
    );
}

export default App;
