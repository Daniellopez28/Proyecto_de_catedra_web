# Backend

## Scripts de base de datos

El proyecto conserva tres scripts SQL, cada uno con un objetivo distinto:

- `OrigeneSV.sql`: crea el esquema, permisos, procedimientos, vistas y datos base.
- `sql/datos_inventario_recetas.sql`: agrega productos, insumos, recetas y saldos iniciales de inventario.
- `sql/actualizar_rrhh_contratos.sql`: migración idempotente para contratos, roles/permisos, reservas sin cuenta de cliente, fotos de productos y nombre de cliente en pedidos.

### Instalacion limpia

1. Deten el backend y cierra las conexiones a la base que se va a inicializar.
2. Para levantar SQL Server en Docker, sustituye el valor de `MSSQL_SA_PASSWORD` por una contraseña segura y ejecuta:

   ```powershell
   docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=TU_CONTRASENA_SEGURA" -p 1432:1433 --name proyecto_web -v sqlserver_data:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest
   ```

3. Configura `Backend/.env` con la conexion correspondiente. No guardes credenciales reales en el repositorio:

   ```dotenv
   DATABASE_URL="sqlserver://localhost:1432;database=OrigeneSV;user=sa;password=TU_CONTRASENA_SEGURA;encrypt=true;trustServerCertificate=true"
   ```

4. Conéctate al servidor SQL y ejecuta el archivo completo `OrigeneSV.sql` desde el inicio. **Este script elimina y vuelve a crear `origenesv`; no lo ejecutes sobre una base con datos que debas conservar ni con el backend conectado.**
5. Ejecuta `sql/datos_inventario_recetas.sql`. El script selecciona `origenesv` automáticamente. Es aditivo: agrega los datos que falten y no reemplaza el stock que ya se haya registrado.
6. Desde `Backend`, ejecuta `npx prisma generate` y luego `npm run dev`.

### Actualizar una base existente

No ejecutes `OrigeneSV.sql` sobre una base existente: elimina su contenido. Ejecuta `sql/actualizar_rrhh_contratos.sql` para incorporar la fecha final de contrato, los nuevos campos, roles/permisos, desactivar cuentas de cliente antiguas y actualizar la vista `v_empleados_detalle`; luego puedes correr `sql/datos_inventario_recetas.sql` para completar el catalogo y las recetas. Ambos scripts seleccionan `origenesv` automaticamente y no reemplazan los saldos existentes.

Despues de modificar el esquema, ejecuta `npx prisma generate`, reinicia el backend e inicia sesion nuevamente para cargar los permisos actualizados.

Los clientes se conservan como contactos para reservas y pedidos, pero no pueden crear cuentas ni iniciar sesion. Las fotos de productos se guardan en SQL Server como `varbinary(max)` y se limitan a 1 MB por archivo. Los pedidos quedan pendientes hasta que Caja registre el medio de pago y su referencia.

### Si SQL Server muestra errores al ejecutar

- Si aparece el error 4083 despues de recrear la base, vuelve a conectar la ventana de SQL Server y ejecuta de nuevo la consulta de verificacion. Evita ese corte deteniendo primero el backend antes de correr `OrigeneSV.sql`.
- Si la lista de errores del editor muestra objetos o columnas inválidos, actualiza la cache de IntelliSense de SQL Server Management Studio (`Ctrl+Shift+R`) y revisa la pestaña **Messages/Mensajes**. Si `Ya hay un objeto...` aparece como error de ejecucion, confirma que ejecutaste `OrigeneSV.sql` completo desde su primera linea; no ejecutes solo la seleccion ni lo combines con los otros scripts.
