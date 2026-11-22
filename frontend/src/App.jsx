/*Importa los estilos globales de App y el hook de estado de React*/
import './App.css'
import { useState } from 'react'
/*Importa los componentes de autenticación y navegación lateral*/
import Login from '../components/login.jsx'
import SideNavbar from '../components/side-navbar.jsx'

/*Recupera y valida la sesión guardada previamente en localStorage*/
function obtenerUsuarioGuardado() {
  /*Lee el valor almacenado bajo la clave usuarioLogueado*/
  const usuarioGuardado = localStorage.getItem('usuarioLogueado')
  if (!usuarioGuardado) return null

  try {
    /*Intenta parsear el JSON de la sesión*/
    return JSON.parse(usuarioGuardado)
  } catch {
    /*Limpia la entrada si está corrupta para evitar fallos al iniciar*/
    localStorage.removeItem('usuarioLogueado')
    return null
  }
}

/*Componente raíz que coordina autenticación, navegación lateral y vistas*/
function App() {
  /*Estado del usuario autenticado inicializado desde localStorage*/
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado)
  /*Estado de la sección activa seleccionada en SideNavbar*/
  const [vistaActiva, setVistaActiva] = useState('Inicio')

  /*Muestra la pantalla de login si no existe sesión activa*/
  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/*Barra lateral conectada a la vista activa actual*/}
      <SideNavbar vistaActiva={vistaActiva} alCambiarVista={setVistaActiva} />

      <main style={{ flex: 1, padding: '40px' }}>
        {/*Botón para cerrar sesión y limpiar el almacenamiento local*/}
        <button
          type="button"
          className="btn btn-outline-secondary"
          style={{ float: 'right' }}
          onClick={() => {
            localStorage.removeItem('usuarioLogueado')
            setUsuario(null)
            setVistaActiva('Inicio')
          }}
        >
          Cerrar sesión
        </button>

        {/*Encabezado principal conservando exactamente tus líneas originales*/}
        <h1>Bienvenido, {usuario.nombre_completo}</h1>
        <p>Has iniciado sesión correctamente en Orígenes SV.</p>

        {/*Si está en otra sección distinta a Inicio, muestra el módulo seleccionado*/}
        {vistaActiva !== 'Inicio' && (
          <div style={{ marginTop: '24px' }}>
            <h2>{vistaActiva}</h2>
            <p className="text-muted">
              Sección activa: {vistaActiva} {usuario.sucursal ? `— Sucursal: ${usuario.sucursal}` : ''}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App