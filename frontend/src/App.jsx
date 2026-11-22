import './App.css'
import { useState } from 'react'
import Login from '../components/login.jsx'
import SideNavbar from '../components/side-navbar.jsx'

function obtenerUsuarioGuardado() {
  const usuarioGuardado = localStorage.getItem('usuarioLogueado')
  if (!usuarioGuardado) return null

  try {
    return JSON.parse(usuarioGuardado)
  } catch {
    localStorage.removeItem('usuarioLogueado')
    return null
  }
}

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado)

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <SideNavbar />
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
    </div>
  )
}

export default App
