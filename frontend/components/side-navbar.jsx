import '../src/side-navbar.css'
{/*icons svg*/}
import forkKnifeIcon from '../src/assets/fork-knife.svg'
import receiptIcon from '../src/assets/receipt.svg'
import productsIcon from '../src/assets/book-half.svg'
import boxesIcon from '../src/assets/boxes.svg'
import calculatorIcon from '../src/assets/calculator.svg'
import truckIcon from '../src/assets/truck.svg'
import peopleIcon from '../src/assets/people.svg'
import walletIcon from '../src/assets/wallet2.svg'
import resumeIcon from '../src/assets/columns-gap.svg'

const sections = [
    [
        { name: 'Inicio', icon: resumeIcon },
        { name: 'Ventas', icon: forkKnifeIcon },
        { name: 'Facturacion', icon: receiptIcon  }
    ],
    [
        { name: 'Productos', icon: productsIcon },
        { name: 'Inventario', icon: boxesIcon },
        { name: 'Proveedores', icon: truckIcon }
    ],
    [
        { name: 'Caja', icon: walletIcon },
        { name: 'Empleados', icon: peopleIcon },
        { name: 'Planillas', icon: calculatorIcon }
    ]
]

/*Componente de navegación lateral conservando estructura, íconos y clases*/
function SideNavbar({ vistaActiva = 'Inicio', alCambiarVista }) {
    /*Maneja el clic en cualquiera de las secciones del menú lateral*/
    const manejarSeleccion = (nombreSeccion) => {
        if (typeof alCambiarVista === 'function') {
            alCambiarVista(nombreSeccion);
        }
    };
    return (
        <aside className="side-navbar">
            <div className="side-navbar-brand">Orígenes SV</div>
            <nav aria-label="Navegación principal">
                <ul className="side-navbar-menu">
                    {sections.flat().map(({ name, icon }) => (
                        <li className="side-navbar-item" key={name}>
                            <button className="side-navbar-button" type="button">
                                {icon && <img src={icon} alt="" className="side-navbar-icon" />}
                                <span>{name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    )
}

export default SideNavbar