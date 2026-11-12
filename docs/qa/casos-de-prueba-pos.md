Casos de prueba POS

 Carrito y cálculo de importes

- Agregar productos con precios y cantidades distintas; comprobar que el subtotal es la suma de `precio_venta * cantidad` de cada producto.
- El componente padre tiene que  entregar cada producto del carrito aplanado con la forma `{ id_producto, nombre, precio_venta, cantidad }`.
- Comprobar que el IVA se calcula como el 13% del subtotal, redondeado a dos decimales, y el total como subtotal más ese IVA redondeado.
- No redondear el precio de cada producto antes de calcular el subtotal; mostrar subtotal, IVA y total con dos decimales.
- Usar los botones `+` y `-` para cambiar la cantidad; el - hace que la cantidad no baje de 1. Usar `Quitar` para eliminar el producto del carrito.
- Comprobar que un carrito sin productos muestra “No hay productos en el pedido”, importes de $0.00 y el botón “Vaciar Carrito” deshabilitado.
