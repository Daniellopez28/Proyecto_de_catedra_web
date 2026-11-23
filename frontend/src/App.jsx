import './App.css'
import { useState } from 'react'
import Login from '../components/login.jsx'
import SideNavbar from '../components/side-navbar.jsx'
import TopHeader from '../components/top-header.jsx'

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
    <div className="app-shell">
      <SideNavbar />

      <div className="app-workspace">
        <TopHeader
          usuario={usuario}
          sucursal={usuario.sucursal || 'San Salvador · Escalón'}
          onLogout={() => {
            localStorage.removeItem('usuarioLogueado')
            setUsuario(null)
          }}
        />

        <main className="app-content">
          <h1>Bienvenido, {usuario.nombre_completo}</h1>
          <p>Has iniciado sesión correctamente en Orígenes SV.</p>
        </main>
      </div>
    </div>
  )
}

export default App
