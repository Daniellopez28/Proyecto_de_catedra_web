import './side-navbar.css'
import forkKnifeIcon from '../src/assets/fork-knife.svg'
import receipt from '../src/assets/receipt.svg'

const sections = [
    [
        { name: 'Inicio' },
        { name: 'Ventas', icon: forkKnifeIcon },
        { name: 'Pedidos', icon: receipt  }
    ],
    [
        { name: 'Inventario' },
        { name: 'Compras' },
        { name: 'Clientes' }
    ]
]

function SideNavbar() {
    return (
        <aside className="side-navbar">
            <div className="side-navbar-brand">Orígenes SV</div>
            <nav aria-label="Navegación principal">
                <ul className="side-navbar-menu">
                    {sections.flat().map(({ name, icon }) => (
                        <li className={`side-navbar-item${icon ? ' has-icon' : ''}`} key={name}>
                            {icon && <img src={icon} alt="" className="side-navbar-icon" />}
                            {name}
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}

export default SideNavbar