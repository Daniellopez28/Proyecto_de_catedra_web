import { useMemo } from 'react'
import '../src/top-header.css'

function TopHeader({ usuario, sucursal = 'San Salvador · Escalón', onLogout }) {
  const fecha = useMemo(() => {
    return new Intl.DateTimeFormat('es-SV', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date())
  }, [])

  const iniciales = usuario?.nombre_completo
    ?.split(/\s+/)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="top-header">
      <div className="top-header-breadcrumb">
        <span className="top-header-section">Brasa Cocina</span>
        <span aria-hidden="true">›</span>
        <strong>{sucursal}</strong>
      </div>

      <div className="top-header-right">
        <span className="top-header-currency">
          Operación en USD
        </span>

        <span className="top-header-date">{fecha}</span>

        <div className="top-header-user">
          <span className="top-header-avatar">
            {iniciales || 'AV'}
          </span>

          <div className="top-header-user-info">
            <strong>{usuario?.nombre_completo || 'Usuario'}</strong>
            <span>Cuenta del usuario</span>
          </div>

          <button type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopHeader