# Orígenes SV · Frontend

## Ejecutar para probar

1. Inicia SQL Server y verifica la configuración `DATABASE_URL` del backend.
2. En una terminal, desde `Backend`, ejecuta `npm run dev`.
3. En otra terminal, desde `frontend`, ejecuta `npm run dev`.
4. Abre la dirección que muestra Vite (por defecto `http://localhost:5173`).

Vite reenvía `/api` al servidor local en `http://localhost:3000`. Si cambias el puerto del backend, actualiza el destino del proxy en `vite.config.js`. Para producción, configura `VITE_API_BASE_URL` con la URL base de la API (por ejemplo, `https://servidor.example/api`); si no se define, se usa `/api`.

El inicio de sesión usa el correo o código de empleado. La sesión obtiene del backend los permisos asignados en la base de datos; la interfaz oculta las opciones no autorizadas y el backend valida el token y el permiso en cada ruta protegida. Las sesiones de desarrollo viven en memoria y se invalidan al reiniciar el backend: vuelve a iniciar sesión.

## Módulos conectados

El menú y las acciones se derivan de los permisos entregados por `/api/session`. El backend sigue siendo la autoridad y vuelve a comprobar cada permiso; ocultar una acción en la interfaz no sustituye esa validación.

- El inventario y las compras administrativas requieren elegir una sucursal; las cuentas con sucursal asignada quedan limitadas a ella.
- La administración de usuarios permite filtrar por sucursal y muestra la asignación del empleado. Los cambios de sucursal se realizan desde la ficha del empleado y se aplican también a su cuenta.
- Ventas y pedidos, reservas y mesas, caja e inventario.
- Compras y proveedores, menú/productos y recetas.
- Empleados, planillas, usuarios, administración de roles/sucursales, reportes y perfil.

Las pantallas consultan la API real, muestran errores y estados vacíos, y no sustituyen los datos por registros ficticios.
