import './App.css'
import { useState } from 'react'
import Login from '../components/login.jsx'
import SideNavbar from '../components/side-navbar.jsx'
import MenuProductosView from '../components/MenuProductosView.jsx'

/* Usuario de muestra local para probar la vista sin depender del backend */
const USUARIO_PRUEBA_LOCAL = {
  nombre_completo: 'Ana Villalobos',
  rol: 'Gerente de operaciones'
}

function obtenerUsuarioGuardado() {
  const usuarioGuardado = localStorage.getItem('usuarioLogueado')
  if (!usuarioGuardado) return USUARIO_PRUEBA_LOCAL

  try {
    return JSON.parse(usuarioGuardado)
  } catch {
    localStorage.removeItem('usuarioLogueado')
    return USUARIO_PRUEBA_LOCAL
  }
}

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado)
  const [activeSection, setActiveSection] = useState('Productos')

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <SideNavbar activeSection={activeSection} onSelectSection={setActiveSection} />

      {activeSection === 'Productos' ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <MenuProductosView
            onNuevoProducto={() => {}}
            onAbrirReceta={() => {}}
          />
        </div>
      ) : (
        <main style={{ flex: 1, padding: '40px' }}>
          <button
            type="button"
            className="btn btn-outline-secondary"
            style={{ float: 'right' }}
            onClick={() => {
              localStorage.removeItem('usuarioLogueado')
              setUsuario(null)
            }}
          >
            Cerrar sesión
          </button>
          <h1>Bienvenido, {usuario.nombre_completo}</h1>
          <p>Has iniciado sesión correctamente en Orígenes SV.</p>
        </main>
      )}
    </div>
  )
}

export default App