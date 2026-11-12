import { Button } from 'reactstrap'

function OrderSummary({ items, onChangeQuantity, onRemoveItem, onEmptyCart }) {
    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.precio_venta) * item.cantidad,
        0,
    )
    const ivaRedondeado = Math.round(subtotal * 0.13 * 100) / 100
    const total = Math.round((subtotal + ivaRedondeado) * 100) / 100

    return (
     <div>
         <h3>Resumen del Pedido</h3>
        {items.length === 0 ? (
        <p>No hay productos en el carrito</p>
         ) : (
            items.map((item) => {
            const precio = Number(item.precio_venta)
            return (
            <div key={item.id_producto}>
            <p>{item.nombre} - Cantidad: {item.cantidad}</p>
            <p>Precio Unitario: ${precio.toFixed(2)}</p>
            <p>Precio Total: ${(precio * item.cantidad).toFixed(2)}</p>
            <Button color="secondary" onClick={() => onChangeQuantity( item.id_producto, Math.max(1, item.cantidad - 1),  ) }>-</Button>
            <Button color="secondary" onClick={() => onChangeQuantity(item.id_producto, item.cantidad + 1) } >+</Button>
            <Button color="danger" onClick={() => onRemoveItem(item.id_producto)} > Quitar </Button>
            </div>
                    )
                })
            )}
            <Button color="danger" onClick={onEmptyCart} disabled={items.length === 0}>
                Vaciar Carrito
            </Button>
            <hr />
            <p><strong>Subtotal: ${subtotal.toFixed(2)}</strong></p>
            <p><strong>IVA (13%): ${ivaRedondeado.toFixed(2)}</strong></p>
            <p><strong>Total: ${total.toFixed(2)}</strong></p>
        </div>
    )
}

export default OrderSummary
