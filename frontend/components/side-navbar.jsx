function SideNavbar({ items, selected, onSelect, abierta, onClose }) {
    return (
        <>
            {abierta && (
                <button
                    className="workspace-overlay"
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={onClose}
                />
            )}
            <aside className={`workspace-sidebar ${abierta ? 'is-open' : ''}`}>
                <div className="workspace-brand">
                    <img src="/brand/origenes-logo.png" alt="Orígenes SV" />
                </div>
                <nav aria-label="Navegación principal">
                    <ul className="workspace-nav">
                        {items.map(({ id, name, icon }) => (
                            <li key={id}>
                                <button
                                    className={selected === id ? 'is-active' : ''}
                                    type="button"
                                    aria-current={selected === id ? 'page' : undefined}
                                    onClick={() => {
                                        onSelect(id);
                                        onClose();
                                    }}
                                >
                                    <img src={icon} alt="" className="workspace-nav-icon" />
                                    <span>{name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <p className="workspace-sidebar-note">El menú muestra solo las opciones autorizadas para tu cuenta.</p>
            </aside>
        </>
    );
}

export default SideNavbar;
