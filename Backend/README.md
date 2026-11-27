# Backend

## Configuracion

Abrir la base de datos OrigeneSV.sql en sql manager, hacer la conexion a un contenedor de docker con la siguiente linea:

docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=ProyectoWeb@2026" -p 1432:1433 --name proyecto_web -v sqlserver_data:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest

este creara un contenedor de docker, luego en sql server pondras los siguientes datos:

- Nombre de el servidor: localhost,1432
- Nombre de usuario: sa
- contrasenia: ProyectoWeb@2026

luego de eso abrir el archivo .sql de OrigeneSV en este contenedor y ejecutarlo con F5.

Si la base de datos ya existía antes de agregar las columnas de imagen de productos, ejecuta una vez `sql/actualizar_productos_imagen.sql` conectado a `OrigeneSV`. El script solo agrega las columnas que falten y conserva los datos existentes.

Si la base ya existía antes de incorporar los roles de RR. HH. y contratos, revisa y ejecuta `sql/actualizar_rrhh_contratos.sql` conectado a `OrigeneSV`. Este script agrega los roles que faltan (Barista, Contabilidad y Compras), corrige sus niveles de acceso y agrega `fecha_fin_contrato`. También actualiza permisos y desactiva cuentas asociadas a clientes; respalda y revisa esos cambios antes de ejecutarlo.

En el proyecto: 
Crear un archivo en la carpeta de backend, con el nombre de ".env", dentro de esta pon lo siguiente:

//Conexion a la database en docker
DATABASE_URL="sqlserver://localhost:1432;database=OrigeneSV;user=sa;password=ProyectoWeb@2026;encrypt=true;trustServerCertificate=true"

abre una terminal en la carpeta de backend y ejecuta lo siguiente:
npm install
npx prisma generate
npm run dev

