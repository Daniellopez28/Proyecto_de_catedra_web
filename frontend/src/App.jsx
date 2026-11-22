// CORRECCIÓN: integra sesión, navegación de módulos y comprobación del estado del backend.
import './App.css';
import { useEffect, useState } from 'react';
import DataModule from '../components/data-module.jsx';
import Login from '../components/login.jsx';
import SideNavbar from '../components/side-navbar.jsx';
import { apiRequest } from './api.js';

function leerSesion() {
  try {
    const stored = JSON.parse(localStorage.getItem('usuarioLogueado') ?? 'null');
    return stored?.token && stored?.usuario ? stored : null;
  } catch {
    return null;
  }
}

function Inicio({ token }) {
  const [estado, setEstado] = useState('Comprobando conexión...');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/health', { token })
      .then(() => { if (!cancelled) setEstado('Base de datos conectada'); })
      .catch(() => { if (!cancelled) setEstado('No se pudo comprobar la conexión'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <section>
      <h1>Panel principal</h1>
      <p>Estado de la conexión: {estado}</p>
    </section>
  );
}

function App() {
  const [sesion, setSesion] = useState(leerSesion);
  const [modulo, setModulo] = useState('inicio');
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [errorModulos, setErrorModulos] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!sesion?.token) return () => { cancelled = true; };

    apiRequest('/api/gestion', { token: sesion.token })
      .then(({ modulos = [] }) => {
        if (!cancelled) {
          setModulosDisponibles(Array.isArray(modulos) ? modulos : []);
          setErrorModulos('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setModulosDisponibles([]);
          setErrorModulos(error.message);
        }
      });

    return () => { cancelled = true; };
  }, [sesion?.token]);

  function iniciarSesion(nuevaSesion) {
    localStorage.setItem('usuarioLogueado', JSON.stringify(nuevaSesion));
    setModulo('inicio');
    setSesion(nuevaSesion);
  }

  function cerrarSesion() {
    localStorage.removeItem('usuarioLogueado');
    setModulo('inicio');
    setModulosDisponibles([]);
    setErrorModulos('');
    setSesion(null);
  }

  if (!sesion) return <Login onLogin={iniciarSesion} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <SideNavbar
        active={modulo}
        onNavigate={setModulo}
        modulosDisponibles={modulosDisponibles}
      />
      <main style={{ flex: 1, padding: '32px' }}>
        <button type="button" className="btn btn-outline-secondary" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
        <p>Sesión: {sesion.usuario.nombre_completo}</p>
        {errorModulos && <p role="alert">No se pudieron cargar los módulos: {errorModulos}</p>}
        {modulo === 'inicio'
          ? <Inicio token={sesion.token} />
          : <DataModule
              key={modulo}
              name={modulo}
              token={sesion.token}
              usuario={sesion.usuario}
              escritura={Boolean(modulosDisponibles.find((item) => item.nombre === modulo)?.escritura)}
            />}
      </main>
    </div>
  );
}

export default App;
