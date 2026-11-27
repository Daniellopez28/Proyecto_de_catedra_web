# Backend de Orígenes SV

Este documento explica cómo preparar y ejecutar el backend, cómo recorre una solicitud el sistema y qué responsabilidades tienen sus archivos. Está organizado para poder leerlo de principio a fin o consultar directamente un módulo.

## Índice

- [Ejecutar el proyecto](#ejecutar-el-proyecto)
- [Estructura del backend](#estructura-del-backend)
- [Apartado 1 — Explicación general del backend](#apartado-1--explicación-general-del-backend)
- [Apartado 2 — Explicación archivo por archivo](#apartado-2--explicación-archivo-por-archivo)
- [Endpoints de la API](#endpoints-de-la-api)
- [Pruebas](#pruebas)
- [configuración](#configuracion)


Los diagramas Mermaid de este documento se muestran como gráficos en GitHub. En VS Code, abre la vista previa de Markdown con **Ctrl+Shift+V**; si Mermaid aparece como texto, instala una extensión de vista previa compatible con Mermaid.

## Ejecutar el proyecto

### 1. Preparar SQL Server

El proyecto utiliza SQL Server. Si vas a ejecutarlo en Docker, puedes crear un contenedor local con un comando como este:

```powershell
docker run --name origenesv-sqlserver `
  -e "ACCEPT_EULA=Y" `
  -e "MSSQL_SA_PASSWORD=TuClaveSegura_2026!" `
  -p 1432:1433 `
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Reemplaza la contraseña de ejemplo por una clave propia y utiliza esa misma clave en `DATABASE_URL`. No publiques contraseñas reales en el repositorio.

Abre `Backend/OrigeneSV.sql` en SQL Server Management Studio y ejecútalo contra la instancia. El script crea `OrigeneSV` si no existe; si ya existe, conserva sus datos y omite la instalación inicial. Por eso, volver a ejecutarlo no actualiza el esquema de una base existente.

Si tu base ya existía antes de agregar el nombre del cliente a las ventas, ejecuta una vez `Backend/sql/migracion_ventas_nombre_cliente.sql` en SQL Server Management Studio. Es una migración aditiva: agrega la columna faltante sin borrar ni modificar las ventas existentes.

Para cargar los datos de ejemplo de recetas e inventario, ejecuta después `Backend/sql/datos_inventario_recetas.sql`.

### 2. Configurar y ejecutar el backend

Crea `Backend/.env` con la URL de conexión. El ejemplo utiliza el puerto local `1432` publicado por Docker:

```env
DATABASE_URL="sqlserver://localhost:1432;database=OrigeneSV;user=sa;password=TU_CLAVE;encrypt=true;trustServerCertificate=true"
```

Desde una terminal ubicada en la raíz del repositorio:

```powershell
cd Backend
npm install
npx prisma generate
npm run dev
```

El comando `dev` inicia Node.js en modo watch. Por defecto, la API escucha en `http://localhost:3000`; el puerto se puede cambiar con `PORT`.

### 3. Ejecutar el frontend

Abre una segunda terminal desde la raíz del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

Abre la dirección que indique Vite, normalmente `http://localhost:5173`.

### 4. Ejecutar las pruebas del servicio de inventario

Desde `Backend`:

```powershell
node --test pruebas/inventarioServicio.prueba.js
```

Estas pruebas utilizan un cliente Prisma falso; no necesitan conectarse a SQL Server.

## Estructura del backend

```text
Backend/
├── src/
│   ├── index.js
│   ├── config/
│   │   └── prisma.js
│   ├── constants/
│   │   └── sucursalesEmpleados.js
│   ├── middleware/
│   │   └── autenticacion.js
│   ├── rutas/
│   │   └── inventarioRutas.js
│   ├── controladores/
│   │   └── inventarioControlador.js
│   ├── servicios/
│   │   └── inventarioServicio.js
│   ├── services/
│   │   └── planilla.service.js
│   └── routes/
│       ├── administracion.routes.js
│       ├── caja.routes.js
│       ├── clientes.routes.js
│       ├── compras.routes.js
│       ├── empleados.routes.js
│       ├── mesas.routes.js
│       ├── modificadores.routes.js
│       ├── planilla.routes.js
│       ├── productos.routes.js
│       ├── proveedores.routes.js
│       ├── reportes.routes.js
│       ├── reservas.routes.js
│       └── usuarios.routes.js
├── prisma/
│   └── schema.prisma
├── sql/
│   └── datos_inventario_recetas.sql
├── pruebas/
│   └── inventarioServicio.prueba.js
├── OrigeneSV.sql
├── package.json
├── package-lock.json
├── prisma.config.ts
└── tsconfig.json
```

`src/routes/` conserva la convención inglesa de los routers de los módulos generales. Inventario usa las carpetas `rutas/`, `controladores/` y `servicios/` para separar el recorrido HTTP de sus reglas de negocio.

# Apartado 1 — Explicación general del backend

## 1. Qué hace el backend

El backend es la API de Orígenes SV. Recibe solicitudes del frontend, valida los datos, comprueba la sesión y los permisos cuando corresponde, aplica reglas del negocio y consulta o modifica SQL Server mediante Prisma y, en algunas operaciones, procedimientos almacenados.

Está construido con Node.js y Express. La mayoría de las rutas empieza con `/api`; `GET /` es una ruta de estado y la excepción a ese prefijo.

Los módulos principales son:

- **Sesiones y cuentas:** inicio y cierre de sesión, registro de clientes y cambio de contraseña.
- **Ventas y pedidos:** registro de ventas, pagos, consulta de pedidos y transiciones de estado.
- **Inventario y recetas:** existencias globales o por sucursal, movimientos, alertas, recetas y consumo de ingredientes.
- **Compras y proveedores:** registro de compras, abonos y actualización del inventario recibido.
- **Caja:** apertura, movimientos y cierre con cálculo de diferencia.
- **Personal, usuarios y permisos:** administración de empleados, roles, sucursales y cuentas.
- **Planillas:** cálculo, consulta y marcado de pago de planillas quincenales.
- **Mesas y reservas:** disponibilidad, reservas y cambios de estado.
- **Productos y modificadores:** catálogo del menú y sus opciones.
- **Reportes:** resúmenes de ventas, existencias y planillas.

## 2. Arquitectura y recorrido de una solicitud

Los routers reciben la solicitud y ejecutan el handler correspondiente. La mayoría de módulos consulta Prisma directamente desde su router; Inventario separa controlador y servicio.

```mermaid
flowchart TD
    FRONT["Frontend React"] -->|Solicitud HTTP /api/...| EXPRESS["Express<br/>src/index.js"]
    EXPRESS --> PUBLIC{"¿La ruta es pública?"}
    PUBLIC -->|Sí| HANDLER["Handler de la ruta"]
    PUBLIC -->|No| AUTH["Comprobar sesión"]
    AUTH --> SESSION{"¿Token válido y vigente?"}
    SESSION -->|No| E401["HTTP 401"]
    SESSION -->|Sí| PERMISSION["Comprobar permiso"]
    PERMISSION --> ALLOWED{"¿Tiene el permiso?"}
    ALLOWED -->|No| E403["HTTP 403"]
    ALLOWED -->|Sí| HANDLER
    HANDLER --> LAYER{"¿Dónde está la lógica?"}
    LAYER -->|Módulos generales| DIRECT["Router consulta Prisma<br/>o llama a un procedimiento"]
    LAYER -->|Inventario| CONTROLLER["Controlador de inventario"]
    CONTROLLER --> SERVICE["Servicio de inventario"]
    SERVICE --> DIRECT
    DIRECT --> DB["SQL Server<br/>OrigeneSV"]
    DB --> RESPONSE["Respuesta JSON"]
    E401 --> RESPONSE
    E403 --> RESPONSE
    RESPONSE --> FRONT
```

### Navegación y solicitudes de inventario

Al seleccionar Inventario, el frontend muestra la página y solicita los datos necesarios. Las tres consultas se procesan con el mismo flujo de autenticación y permiso, y después pasan por el controlador y el servicio.

```mermaid
flowchart TD
    CLICK["Clic en Inventario"] --> NAV["side-navbar.jsx<br/>onSelect('inventario')"]
    NAV --> APP["App.jsx<br/>setPagina('inventario')"]
    APP --> PAGE["InventarioPage.jsx"]
    PAGE --> I["GET /api/inventario/insumos"]
    PAGE --> A["GET /api/inventario/alertas"]
    PAGE --> M["GET /api/inventario/movimientos"]
    I --> INDEX["src/index.js<br/>autenticación y montaje del router"]
    A --> INDEX
    M --> INDEX
    INDEX --> ROUTER["inventarioRutas.js<br/>comprueba el permiso"]
    ROUTER --> CTRL["inventarioControlador.js"]
    CTRL --> SERVICE["inventarioServicio.js"]
    SERVICE --> DB["Prisma consulta SQL Server"]
    DB --> JSON["El backend devuelve JSON"]
    JSON --> PAGE
```

## 3. Inicio de sesión, autenticación y permisos

`POST /api/login` valida las credenciales y la sucursal. Para una cuenta de empleado consulta `dbo.sp_login_empleado`; si corresponde, intenta el procedimiento `dbo.sp_login_cliente`. Cuando las credenciales son válidas, consulta los permisos con `dbo.sp_permisos_usuario`, crea una sesión en memoria y devuelve un token.

Las rutas protegidas reciben ese token en el encabezado `Authorization`. El middleware comprueba la sesión y, después, el permiso específico que requiere la ruta.

```mermaid
flowchart TD
    LOGIN["POST /api/login"] --> VALIDATE["Validar identificador, contraseña y sucursal"]
    VALIDATE --> EMPLOYEE["Intentar dbo.sp_login_empleado"]
    EMPLOYEE --> EMPLOYEE_FOUND{"¿Se encontró una cuenta de empleado?"}
    EMPLOYEE_FOUND -->|Sí| FOUND["Continuar con el usuario encontrado"]
    EMPLOYEE_FOUND -->|No| CLIENT_ALLOWED{"¿No hay cuenta de empleado y el identificador es correo?"}
    CLIENT_ALLOWED -->|No| ELOGIN["Responder error de inicio de sesión"]
    CLIENT_ALLOWED -->|Sí| CLIENT["Intentar dbo.sp_login_cliente"]
    CLIENT --> CLIENT_FOUND{"¿Se encontraron credenciales válidas?"}
    CLIENT_FOUND -->|No| ELOGIN
    CLIENT_FOUND -->|Sí| FOUND
    FOUND --> PERMS["Consultar dbo.sp_permisos_usuario"]
    PERMS --> CREATE["crearSesion(usuario, permisos)"]
    CREATE --> TOKEN["Devolver token, usuario y permisos"]
    TOKEN --> REQUEST["Solicitud protegida<br/>Authorization: Bearer token"]
    REQUEST --> AUTH["requerirAutenticacion"]
    AUTH --> VALID{"¿Sesión vigente?"}
    VALID -->|No| E401["HTTP 401"]
    VALID -->|Sí| REQUIRE["requerirPermiso(código)"]
    REQUIRE --> HAS{"¿Tiene el permiso?"}
    HAS -->|No| E403["HTTP 403"]
    HAS -->|Sí| HANDLER["Ejecutar handler"]
```

El middleware mantiene las sesiones en memoria durante ocho horas. Por eso, un reinicio del proceso elimina las sesiones activas y requiere iniciar sesión de nuevo. Los permisos se representan como un `Set` en el servidor.

## 4. Registro de ventas y transacciones

El registro de una venta verifica productos, modificadores, cliente, mesa y sucursal. Después calcula los importes, crea la venta y sus detalles, registra el pago si corresponde y descuenta los ingredientes de las recetas.

Estas operaciones se ejecutan en una transacción serializable. Si falla la validación del inventario o cualquier otro paso de la transacción, SQL Server revierte los cambios y no queda una venta parcialmente registrada.

```mermaid
flowchart TD
    START["VentasPage: elegir productos y armar carrito"] --> REQUEST["Registrar venta<br/>POST /api/ventas"]
    REQUEST --> AUTH["Validar sesión y permiso tomar_pedidos"]
    AUTH --> INPUT["Validar solicitud y normalizar productos"]
    INPUT --> TX["Iniciar transacción Serializable"]
    TX --> CHECK["Validar productos, modificadores, cliente, mesa y sucursal"]
    CHECK --> CALC["Calcular precios, subtotal, IVA y correlativo"]
    CALC --> CREATE["Crear venta y detalles"]
    CREATE --> PAYMENT["Registrar pago si corresponde"]
    PAYMENT --> STOCK["Descontar ingredientes según recetas"]
    STOCK --> COMMIT{"¿Todo terminó correctamente?"}
    COMMIT -->|Sí| OK["Confirmar transacción<br/>HTTP 201"]
    COMMIT -->|No| ROLLBACK["Revertir la transacción<br/>Responder el error"]
    OK --> PAGE["VentasPage muestra confirmación"]
    ROLLBACK --> PAGE
```

El estado de un pedido solo puede cambiar mediante las transiciones previstas. Al cancelar, el backend comprueba que no existan pagos y devuelve al inventario los ingredientes consumidos dentro de la misma transacción.

## 5. Sucursales y alcance de los datos

El backend aplica el ámbito de sucursal en módulos que operan con existencias, ventas, usuarios, mesas o compras:

- Si la sesión tiene una sucursal asignada, el usuario solo puede operar en ella.
- Una cuenta sin sucursal debe tener el permiso `gestionar_sucursales` y especificar la sucursal cuando el endpoint lo permita.
- Los handlers comprueban que la sucursal exista y esté activa antes de operar.

La regla concreta también depende del permiso de cada endpoint. No todos los módulos aceptan los mismos filtros.

## 6. Errores y concurrencia

Los handlers validan primero los datos recibidos y responden con códigos HTTP adecuados. Entre los más comunes están:

- `400`: datos o filtros inválidos.
- `401`: token ausente, inválido o expirado.
- `403`: falta permiso o se intenta salir del ámbito permitido.
- `404`: recurso inexistente o no visible dentro del ámbito.
- `409`: conflicto con el estado actual, falta de existencias o cambio concurrente.
- `500`: error inesperado del servidor.
- `503`: la comprobación de salud no puede consultar SQL Server.

Las operaciones que actualizan datos relacionados emplean transacciones cuando es necesario. Las ventas, pagos, ajustes de inventario, compras y reservas protegen sus operaciones críticas para no dejar cambios parciales. Algunas usan aislamiento `Serializable` para reducir conflictos por escrituras concurrentes.

# Apartado 2 — Explicación archivo por archivo

Las explicaciones siguen el recorrido desde el punto de entrada hasta los módulos. En los routers, los métodos HTTP ejecutan funciones callback de Express aunque no tengan un nombre propio.

## Bloque 1 — Punto de entrada y endpoints principales

### `src/index.js`

**Propósito:** configura Express, conecta Prisma, monta los routers de cada módulo y contiene directamente los endpoints de salud, sucursales, ventas, login y sesión.

#### Configuración de Express y routers

**`app.use(cors())`**

Agrega el middleware CORS para que el frontend pueda realizar solicitudes a la API desde su origen.

**`app.use(express.json())`**

Lee cuerpos JSON y los deja disponibles en `req.body`. Si el JSON está mal formado, el manejador global devuelve `400`.

**Montaje de routers**

Los módulos generales se montan en su prefijo `/api/...`. Empleados, reservas, caja, productos, compras, proveedores, reportes, usuarios, mesas, modificadores, administración e inventario requieren autenticación en el montaje.

El router de planillas instala `requerirAutenticacion` dentro de `planilla.routes.js`. El registro de cliente y el login son públicos; el resto de rutas de clientes se monta con autenticación.

#### Funciones auxiliares

**`calcularIVA(totalConIva)`**

Calcula el subtotal de un precio que ya incluye IVA dividiéndolo entre `1.13`, redondea a dos decimales y obtiene el IVA restándolo del total.

**`generarCorrelativo(cliente, tipoDocumento)`**

Busca la última venta del tipo de documento. Si no encuentra ventas previas, comienza con el prefijo `CCF-` o `F-` y el número `0001`. Si existe una venta, obtiene el número final, comprueba que sea válido y genera el siguiente correlativo con al menos cuatro dígitos.

**`iniciarServidor()`**

Conecta Prisma y luego abre el servidor Express en el puerto `PORT` o `3000`. Si el puerto no es un entero entre `1` y `65535`, el proceso falla al iniciar. Si falla la conexión, registra el error, desconecta Prisma y establece un código de salida distinto de cero.

#### Endpoints generales

**`GET /api/health`**

Ejecuta `SELECT 1 AS disponible` mediante Prisma para comprobar que SQL Server responde. Si la consulta funciona, devuelve `200` con el estado `ok`; si falla, registra el error y devuelve `503` indicando que la base de datos no está disponible.

**`GET /api/sucursales`**

Consulta únicamente las sucursales activas cuyo nombre está configurado para el acceso de empleados. Normaliza los nombres para asociarlos a la lista de sucursales permitidas y devuelve sus identificadores con las etiquetas de presentación generadas por `etiquetaSucursalEmpleado`. Si la consulta falla, registra el error y responde `500`.

**`GET /`**

Devuelve texto que indica que la API de ventas está funcionando. Es la excepción al prefijo `/api`.

#### Endpoints de ventas

**`GET /api/ventas`**

Requiere sesión y al menos uno de los permisos `ver_ventas` o `ver_pedidos_cocina`. La paginación comienza en la página `1`, usa `25` registros por defecto y limita el tamaño de página a `100`. Si el usuario tiene sucursal asignada, la consulta queda restringida a esa sede. Cuando solo tiene acceso de cocina, muestra pedidos en estado `abierto`, `en_cocina` o `servido`. Consulta el total y la página solicitada, e incluye pagos, detalles, modificadores, cliente y mesa.

**`GET /api/ventas/:id`**

Comprueba que la persona tenga `ver_ventas` o `ver_pedidos_cocina`, valida que el identificador sea un entero positivo y busca la venta dentro del ámbito de su sucursal. Devuelve la venta con cliente, mesa, sucursal, usuario, pagos, productos y modificadores. Si no existe o queda fuera del ámbito permitido, responde `404`.

**`PATCH /api/ventas/:id/estado-pedido`**

Requiere `tomar_pedidos` o `ver_pedidos_cocina` y acepta únicamente los estados `en_cocina`, `servido` o `cancelado`. Las transiciones permitidas son `abierto` a `en_cocina` o `cancelado`, y `en_cocina` a `servido` o `cancelado`. Para cancelar, suma los pagos registrados y rechaza la operación si el total pagado es mayor que cero; luego llama a `revertirExplosion` para reponer los ingredientes y registrar el movimiento de entrada. La reversión y el cambio condicionado de estado ocurren en una transacción serializable. Si otra solicitud cambia el pedido primero, responde conflicto en vez de sobrescribirlo.

**`POST /api/ventas/:id/pagos`**

Requiere `tomar_pedidos` u `operar_caja`. Valida el identificador, que el monto sea positivo y no exceda el máximo permitido, el método de pago y la referencia opcional. Convierte el monto a centavos para comparar el saldo sin depender de redondeos de punto flotante. No permite pagar una venta cancelada ni exceder el total pendiente. En una transacción serializable registra el pago y cambia el estado de la venta a `parcial` o `pagada`; cuando queda pagada, también marca el pedido como `pagado`.

**`POST /api/ventas`**

Requiere `tomar_pedidos`. Primero valida los campos generales, la sucursal que puede usar la cuenta y la lista de productos; `normalizarProductosVenta` combina líneas repetidas compatibles y comprueba sus modificadores. Dentro de una transacción serializable confirma que usuario, sucursal, productos, modificadores, cliente y mesa existan y estén disponibles. Calcula los precios de productos y modificadores en centavos, obtiene subtotal e IVA, y genera el correlativo del documento. Después crea la venta y sus detalles. Si `pagoPendiente` es falso, también registra el pago completo; si es verdadero, deja la venta pendiente y el pedido abierto. Por último ejecuta `ejecutarExplosion` para descontar los ingredientes de las recetas en el inventario de la sucursal, actualizar el total global y registrar los movimientos. Si falla cualquier paso, la transacción revierte también los registros ya preparados.

#### Endpoints de autenticación

**`POST /api/login`**

Valida que se reciban identificador, contraseña y una sucursal activa permitida. Primero intenta autenticar una cuenta de empleado con `dbo.sp_login_empleado`. Si no se encuentra y el identificador tiene formato de correo, comprueba que no exista una cuenta de empleado asociada a ese correo antes de intentar `dbo.sp_login_cliente`. Cuando la autenticación funciona, consulta los permisos con `dbo.sp_permisos_usuario`, crea una sesión en memoria y devuelve el token, los datos del usuario y sus permisos. Si las credenciales no coinciden, responde `401`.

**`POST /api/logout`**

Requiere una sesión válida y revoca el token actual mediante `cerrarSesion`.

**`POST /api/clientes/registro`**

Valida nombre, formato y longitud del correo, longitud de contraseña y teléfono opcional. Llama a `dbo.sp_registrar_cliente_usuario`, obtiene los permisos de la cuenta recién creada y abre una sesión automáticamente. Devuelve `201` con el token y los datos del usuario; responde `409` si el correo ya está registrado y `400` ante errores de validación reconocidos por el procedimiento almacenado.

**`GET /api/session`**

Requiere una sesión vigente. Devuelve el token asociado a la solicitud, los datos guardados del usuario y los permisos convertidos a una lista para incluirlos en el JSON.

**`POST /api/cambiar-password`**

Requiere una sesión vigente. Comprueba que se envíe la contraseña actual y que la nueva tenga entre 8 y 100 caracteres. Llama a `dbo.sp_cambiar_password`; si la operación funciona, cambia en la sesión el indicador `debe_cambiar_password` a `false`. Si la contraseña actual no coincide, responde `401`.

#### Respuestas de error

El handler final de rutas devuelve JSON `404` cuando no existe una ruta. El manejador de errores devuelve `400` ante JSON mal formado y registra los errores inesperados antes de responder `500`.

## Bloque 2 — Configuración y base de datos

### `package.json`

**Propósito:** manifiesto npm del backend. Configura módulos ES y declara dependencias y comandos.

**`dependencies`**

Incluye Express, CORS, dotenv, Prisma Client y el adaptador de SQL Server. Son paquetes necesarios al ejecutar la API.

**`devDependencies`**

Incluye Prisma CLI y tipos de Node usados por las herramientas de desarrollo y configuración.

**`npm start`**

Ejecuta `node src/index.js` una vez.

**`npm run dev`**

Ejecuta `node --watch src/index.js` y reinicia el proceso cuando Node detecta cambios.

**`postinstall`**

Ejecuta `prisma generate` después de instalar dependencias y genera el cliente a partir del esquema.

### `package-lock.json`

Guarda las versiones resueltas de los paquetes para que las instalaciones sean reproducibles. Normalmente se actualiza junto con `package.json`.

### `src/config/prisma.js`

**Propósito:** crea y exporta la instancia compartida de Prisma configurada para SQL Server.

1. Carga las variables de entorno desde `.env`.
2. Comprueba que exista `DATABASE_URL`.
3. Separa servidor, puerto, base de datos, usuario y contraseña de la URL.
4. Construye el adaptador `PrismaMssql` y configura opciones de cifrado y certificado.
5. Crea y exporta `PrismaClient`.

Si la URL está ausente o le faltan datos necesarios, lanza un error durante la carga para que la configuración incorrecta no pase inadvertida.

### `prisma.config.ts`

Indica a Prisma dónde están el esquema y las migraciones, y conecta la configuración con `DATABASE_URL`. El operador `!` informa al verificador de tipos que se espera una variable; la validación efectiva de la conexión se encuentra en `src/config/prisma.js`.

### `prisma/schema.prisma`

Describe el modelo relacional que Prisma utiliza para generar el cliente. Incluye entidades de usuarios, empleados, clientes, roles, permisos, sucursales, productos, recetas, inventario, ventas, pagos, compras, proveedores, caja, planillas, mesas y reservas.

También especifica claves primarias y foráneas, relaciones, valores por defecto, índices y tipos SQL Server como `Decimal`, `Date` y `DateTime`. Los nombres de los modelos corresponden a las tablas consultadas por el código, por ejemplo `ventas`, `insumos` e `inventario_sucursal`.

### `OrigeneSV.sql`

Script de creación de la base SQL Server. Define tablas, restricciones, índices, procedimientos almacenados, funciones y vistas que utiliza el backend.

**Importante:** antes de crear la base, el script cambia a `master` y elimina `OrigeneSV` si ya existe. Al ejecutarlo se pierden los datos de esa base.

### `sql/datos_inventario_recetas.sql`

Carga los datos de ejemplo para probar el módulo de inventario y recetas, como insumos, productos y cantidades requeridas por receta.

### `tsconfig.json`

Contiene opciones de TypeScript para herramientas de configuración, como objetivo ES2020, modo estricto y tipos de Node. El backend de ejecución está escrito principalmente en JavaScript.

## Bloque 3 — Seguridad y reglas compartidas

### `src/middleware/autenticacion.js`

**Propósito:** administra las sesiones en memoria y centraliza la autenticación y autorización.

**`crearSesion(usuario, permisos)`**

Elimina sesiones expiradas, genera un token criptográficamente aleatorio de 32 bytes (64 caracteres hexadecimales), guarda usuario y permisos en un `Map` y establece una expiración de ocho horas.

**`cerrarSesion(token)`**

Elimina del `Map` la sesión asociada al token.

**`invalidarSesionesDeUsuario(idUsuario)`**

Recorre las sesiones y elimina las que pertenecen a la cuenta indicada. Se utiliza al cambiar roles, desactivar usuarios o actualizar datos que requieren volver a iniciar sesión.

**`invalidarTodasLasSesiones()`**

Vacía el `Map`. Se usa al modificar permisos que afectan sesiones existentes.

**`requerirAutenticacion(peticion, respuesta, siguiente)`**

Lee `Authorization`, exige el formato `Bearer <token>`, busca la sesión y comprueba su vencimiento. Si no es válida responde `401`; si lo es, agrega token, usuario y permisos a `peticion.auth` y continúa.

**`requerirPermiso(codigo)`**

Devuelve un middleware que comprueba si el conjunto de permisos de `peticion.auth` contiene el código requerido. Si no, responde `403`.

### `src/constants/sucursalesEmpleados.js`

Centraliza las sucursales que se ofrecen en los flujos de empleados y acceso.

**`sucursalesEmpleados`**

Lista congelada de nombres base y etiquetas visibles para Escalon, Mejicanos y Santa Elena.

**`nombresBaseSucursalesEmpleados`**

Deriva los nombres base para reutilizarlos como filtro de consultas.

**`etiquetaSucursalEmpleado(nombreBase)`**

Normaliza el nombre recibido y devuelve la etiqueta configurada; si no encuentra coincidencia, conserva el valor original.

## Bloque 4 — Inventario y recetas

### `src/rutas/inventarioRutas.js`

**Propósito:** define las rutas HTTP del inventario, asocia el permiso de cada operación y dirige la solicitud al controlador.

**`POST /api/inventario/explosion` — `gestionar_inventario`**

Dirige el descuento manual de ingredientes a `explotarMateriales`.

**`POST /api/inventario/explosion/simulacion` — `ver_inventario`**

Dirige el cálculo de consumos sin escritura a `simularExplosionMateriales`.

**`GET /api/inventario/alertas` — `ver_inventario`**

Llama a `consultarAlertasStock` para revisar existencias bajo el mínimo o agotadas.

**`GET /api/inventario/insumos/catalogo` — `gestionar_inventario`**

Llama a `consultarCatalogoInsumos` para consultar el catálogo activo.

**`GET /api/inventario/insumos` — `ver_inventario`**

Llama a `consultarInsumos` para ver existencias de la sucursal permitida.

**`GET /api/inventario/recetas` — `gestionar_inventario`**

Llama a `consultarRecetas` para consultar las recetas de todos los productos activos.

**`GET /api/inventario/recetas/:id_producto` — `gestionar_inventario`**

Llama a `consultarRecetaDeProducto` para consultar una receta específica.

**`POST /api/inventario/insumos` — `gestionar_inventario`**

Llama a `registrarInsumo` para crear un insumo y su inventario inicial.

**`PATCH /api/inventario/insumos/:id` — `gestionar_inventario`**

Llama a `actualizarInsumo` para modificar los campos permitidos de un insumo.

**`POST /api/inventario/ajustes` — `gestionar_inventario`**

Llama a `ajustarInventario` para registrar una entrada, salida o ajuste directo de existencias.

**`GET /api/inventario/movimientos` — `ver_inventario`**

Llama a `consultarMovimientosInventario` para consultar el historial de movimientos de una sucursal.

En `src/index.js` este router se monta bajo `/api/inventario` y requiere autenticación antes de que se ejecute el permiso de cada ruta.

### `src/controladores/inventarioControlador.js`

**Propósito:** recibe solicitudes HTTP, valida entradas, resuelve el ámbito de sucursal, llama al servicio y convierte resultados o errores en respuestas HTTP.

**`redondear(valor, decimales)`**

Convierte el valor a número y lo redondea a la cantidad de decimales solicitada.

**`manejarError(error, respuesta)`**

Si recibe `ErrorInventario`, conserva su código HTTP, mensaje y detalle. Si es un error inesperado, lo registra y responde `500`.

**`explotarMateriales(peticion, respuesta)`**

Resuelve la sucursal, normaliza productos y llama a `ejecutarExplosion` dentro de una transacción Prisma. Devuelve el resultado del descuento.

**`simularExplosionMateriales(peticion, respuesta)`**

Valida sucursal y productos, llama a `simularExplosion` y devuelve el cálculo sin modificar existencias.

**`consultarAlertasStock(peticion, respuesta)`**

Resuelve la sucursal solicitada y devuelve la cantidad y lista de alertas.

**`consultarInsumos(peticion, respuesta)`**

Resuelve la sucursal y devuelve los insumos activos con su existencia y estado.

**`consultarCatalogoInsumos(peticion, respuesta)`**

Devuelve los insumos activos ordenados por nombre, sin aplicar filtro de sucursal.

**`consultarRecetas(peticion, respuesta)`**

Solicita al servicio las recetas de productos activos y devuelve la lista.

**`consultarRecetaDeProducto(peticion, respuesta)`**

Valida el parámetro `id_producto` y solicita la receta individual.

**`enteroPositivo(valor)`**

Convierte el valor a número y devuelve el entero solo si es mayor que cero; de lo contrario, devuelve `null`.

**`resolverSucursal(peticion, valor)`**

Aplica la regla de ámbito del servicio y comprueba en la base que la sucursal exista y esté activa. Una cuenta asociada a una sucursal no puede seleccionar otra; una cuenta sin sucursal debe tener permiso para gestionar sucursales y enviar una sede válida.

**`registrarInsumo(peticion, respuesta)`**

Valida nombre, unidad de medida, stock mínimo y costo promedio, y redondea los importes a la precisión admitida. En una transacción busca las sucursales activas, crea el insumo con stock global cero y crea su registro de inventario vacío en cada una. Si no hay sucursales activas, no crea el insumo; si el nombre ya existe, responde conflicto.

**`actualizarInsumo(peticion, respuesta)`**

Valida el identificador y que se envíe al menos un campo permitido: nombre, unidad de medida, mínimo, costo promedio o estado activo. Actualiza solo los campos recibidos. Si cambia el stock mínimo, propaga el nuevo valor a los registros de inventario de todas las sucursales dentro de la misma transacción.

**`ajustarInventario(peticion, respuesta)`**

Resuelve primero la sucursal autorizada y valida el insumo, el tipo de movimiento (`entrada`, `salida` o `ajuste`), la cantidad o el stock nuevo solicitado, y los datos opcionales. Dentro de una transacción serializable comprueba que la sucursal y el insumo sigan activos, calcula la nueva existencia y rechaza valores negativos o superiores al límite. Si todavía no hay fila de inventario para esa combinación, permite crearla con una entrada o un ajuste, pero no con una salida. Para las filas existentes, usa una actualización condicionada al stock disponible en una salida y detecta si otra operación modificó el registro. También puede actualizar el mínimo de esa sucursal. Si el movimiento no cambia la existencia, lo rechaza; si cambia, recalcula el stock global sumando sucursales y registra el movimiento con la diferencia, referencia y usuario.

**`consultarMovimientosInventario(peticion, respuesta)`**

Valida el filtro opcional `id_insumo` y el límite solicitado, que debe estar entre 1 y 200 (por defecto, 50). Resuelve la sucursal autorizada y devuelve sus movimientos más recientes, opcionalmente filtrados por insumo. Adjunta nombre y unidad del insumo, nombre de la sucursal y nombre del usuario que registró el movimiento.

### `src/servicios/inventarioServicio.js`

**Propósito:** concentra las reglas de negocio de inventario y recetas sin depender de Express. Recibe Prisma o un cliente transaccional.

**`ErrorInventario`**

Error propio con mensaje, código HTTP y detalle opcional. Permite devolver errores de negocio comprensibles al controlador.

**`resolverSucursalInventario(usuario, permisos, valor)`**

Si el usuario tiene una sucursal asignada, usa esa sede y rechaza un identificador distinto. Si no tiene sucursal, exige el permiso `gestionar_sucursales` y que se haya seleccionado un identificador entero positivo.

**`redondearADosDecimales(valor)`**

Helper interno que ajusta cantidades a la precisión de las columnas de inventario.

**`normalizarProductosVenta(productos)`**

Comprueba que se reciba una lista no vacía con identificadores y cantidades enteras positivas. Cada línea puede incluir hasta 50 modificadores, y cada identificador de modificador debe ser válido. Combina las líneas repetidas del mismo producto solo si contienen los mismos modificadores en el mismo orden; también comprueba que la cantidad acumulada siga siendo un entero seguro. Devuelve una línea consolidada por producto.

**`clasificarNivel(stockActual, stockMinimo)`**

Devuelve `AGOTADO` si el stock es cero o menor, `STOCK_BAJO` si no supera el mínimo y `null` si está por encima.

**`construirAlertas(insumos)`**

Omite insumos inactivos, clasifica el stock, calcula cuánto falta para alcanzar el mínimo y ordena los agotados antes que los de stock bajo.

**`calcularExplosion(cliente, productosVenta, opciones)`**

Helper de solo lectura. Comprueba que cada producto exista y esté activo, consulta sus recetas y rechaza recetas que incluyan insumos inactivos. Multiplica la cantidad requerida de cada ingrediente por las unidades vendidas, suma los insumos compartidos entre productos y consulta el stock global o el inventario de la sucursal indicada en `opciones`. Ordena los consumos por identificador para mantener un orden estable y devuelve el detalle de consumo por producto junto con los productos que no tienen receta.

**`obtenerFaltantes(consumos)`**

Compara el stock disponible con la cantidad requerida y prepara el detalle de insumos insuficientes.

**`simularExplosion(cliente, productosVenta, opciones)`**

Calcula la misma necesidad de ingredientes que la ejecución, pero solo compara las existencias con el consumo previsto. Devuelve si alcanza el inventario, el stock restante estimado por insumo, los faltantes y los productos sin receta; no escribe ni modifica registros.

**`ejecutarExplosion(cliente, productosVenta, opciones)`**

Primero calcula todos los consumos y comprueba que haya existencias suficientes; si falta algún insumo, informa la lista completa y no inicia descuentos. Después descuenta cada insumo con una actualización condicionada a que el stock siga siendo suficiente. Si otra operación consumió existencias entretanto, genera un conflicto. Cuando trabaja con una sucursal, modifica su inventario, recalcula el stock global, registra un movimiento de salida con referencia y usuario, vuelve a leer las existencias y construye las alertas resultantes. El servicio no abre por sí mismo la transacción: para que venta y descuento sean atómicos, quien lo llama debe pasar el cliente transaccional de Prisma.

**`revertirExplosion(cliente, productosVenta, opciones)`**

Vuelve a calcular los ingredientes usados por las líneas de la venta y suma esas cantidades al inventario. En modo sucursal actualiza la existencia de esa sede, recalcula el total global y registra movimientos de entrada con la referencia y el usuario recibidos. Se invoca al cancelar un pedido y debe ejecutarse dentro de la misma transacción que cambia su estado.

**`obtenerAlertasStock(cliente, sucursalid)`**

Combina catálogo activo con el stock global o el inventario de una sucursal y devuelve alertas ordenadas.

**`listarInsumos(cliente, sucursalid)`**

Devuelve insumos activos ordenados por nombre con existencias, mínimo, costo promedio y estado `NORMAL`, `STOCK_BAJO` o `AGOTADO`.

**`obtenerRecetas(cliente, idProducto)`**

Obtiene los productos activos ordenados por nombre, con sus ingredientes y cantidades requeridas. Si se recibe `idProducto`, devuelve solo ese producto y lanza `ErrorInventario` con `404` cuando no existe o está inactivo. Calcula el costo de cada ingrediente multiplicando la cantidad requerida por su costo promedio, suma el costo de la receta y también incluye productos activos que no tienen ingredientes asociados.

### `pruebas/inventarioServicio.prueba.js`

**Propósito:** comprueba las reglas principales del servicio de inventario sin conectarse a SQL Server.

**`crearDatosDePrueba()`**

Prepara productos, insumos y recetas en memoria. Cada prueba crea su propio conjunto para que los cambios de stock de un caso no afecten a los demás.

**`crearClienteFalso(datos)`**

Construye un cliente Prisma simulado con las consultas y actualizaciones que usa el servicio. Las pruebas pueden verificar sus resultados y cambios de inventario sin acceder a una base real.

**`stockDe(datos, idInsumo)`**

Busca en los datos de prueba la existencia actual de un insumo. Se usa para comprobar que las operaciones hayan descontado —o conservado— la cantidad esperada.

**Casos que comprueba el archivo**

Las pruebas verifican el cálculo y descuento de recetas, la suma de insumos compartidos, productos sin receta, faltantes y errores de concurrencia, productos inexistentes o desactivados, alertas, simulación sin escritura, normalización de productos, listado de inventario y cálculo del costo de las recetas. Se ejecutan con `node --test pruebas/inventarioServicio.prueba.js`.

#### Flujo interno de simulación, descuento y reversión

La simulación y el descuento parten del mismo cálculo de recetas. La simulación solo presenta el resultado; la ejecución modifica existencias y debe recibir el cliente de una transacción. Si el descuento se realiza durante una venta, cualquier error hace que la transacción revierta tanto la venta como los cambios de inventario.

```mermaid
flowchart TD
    START["Recibir productos y cantidades"] --> NORMALIZE["Validar y combinar productos repetidos"]
    NORMALIZE --> RECIPES["Consultar recetas y multiplicar ingredientes"]
    RECIPES --> AGGREGATE["Sumar insumos compartidos y ordenar por id"]
    AGGREGATE --> MODE{"¿Qué operación se solicita?"}

    MODE -->|Simular| SIM_CHECK["Comparar stock disponible con el consumo"]
    SIM_CHECK --> SIM_RESULT["Devolver consumos, faltantes y stock restante"]
    SIM_RESULT --> NO_WRITE["No se modifica la base de datos"]

    MODE -->|Ejecutar| TX["Usar cliente Prisma de una transacción"]
    TX --> CHECK{"¿Hay insumos faltantes?"}
    CHECK -->|Sí| FAIL["Lanzar ErrorInventario y abortar"]
    CHECK -->|No| UPDATE["Descontar con condición stock_actual >= cantidad"]
    UPDATE --> UPDATED{"¿Se pudo actualizar el registro?"}
    UPDATED -->|No| CONFLICT["Detectar cambio concurrente y abortar"]
    UPDATED -->|Sí| RECORD["Actualizar total global y registrar movimiento"]
    RECORD --> ALERTS["Volver a consultar existencias y construir alertas"]
    ALERTS --> COMMIT["El llamador confirma la transacción"]

    CANCEL["Cancelar pedido"] --> RESTORE["revertirExplosion suma ingredientes"]
    RESTORE --> MOVEMENT["Actualizar total global y registrar entrada"]
    MOVEMENT --> CANCEL_TX["Confirmar junto con el cambio de estado"]
```

## Bloque 5 — Nómina y routers por módulo

Los routers de esta sección se montan desde `src/index.js`. Cada uno usa Prisma para consultar o actualizar datos, valida los campos recibidos y aplica los permisos asociados a la operación.

### `src/services/planilla.service.js`

**Propósito:** contiene cálculos puros de planilla quincenal, separados de Express y de las consultas a la base.

**`redondear(valor)`**

Redondea montos a dos decimales para evitar diferencias por precisión de punto flotante.

**`calcular_renta_quincenal(base_gravada)`**

Busca el tramo de retención que corresponde a la base gravada y calcula la renta usando porcentaje, exceso y cuota fija.

**`calcular_planilla_empleado(salario_base_mensual)`**

Divide el salario mensual para obtener el bruto quincenal, calcula ISSS y AFP, resta esas deducciones para obtener la base gravada, calcula renta y devuelve bruto, descuentos y salario neto.

### `src/routes/planilla.routes.js`

El router instala autenticación con `router.use(requerirAutenticacion)`, así todas sus rutas requieren sesión.

**`convertir_fecha(texto)`**

Acepta fechas `AAAA-MM-DD` reales y devuelve un objeto `Date`; si el formato o la fecha no son válidos, devuelve `null`.

**`POST /api/planillas/generar`**

Requiere `generar_planillas`. Comprueba periodo, duración máxima de 16 días y que no exista otra planilla para ese mismo rango. Calcula salarios de empleados activos quincenales, suma el total y crea planilla y detalles.

**`GET /api/planillas`**

Requiere `ver_planillas` y lista periodos de planilla ordenados del más reciente al más antiguo.

**`GET /api/planillas/mi`**

Requiere `ver_mi_planilla`. Busca la ficha laboral asociada a la sesión y devuelve únicamente los detalles de ese empleado.

**`GET /api/planillas/:id`**

Requiere `ver_planillas`. Valida el identificador y devuelve la planilla con los empleados y montos de cada detalle.

**`PUT /api/planillas/:id/pagar`**

Requiere `generar_planillas`. Comprueba que la planilla exista y no esté pagada; la marca como pagada de forma condicionada para detectar actualizaciones concurrentes.

#### Flujo de generación de una planilla

La generación no crea una planilla hasta haber validado el periodo, comprobado que no exista otra para las mismas fechas y calculado los importes de cada empleado activo con planilla quincenal.

```mermaid
flowchart TD
    REQUEST["POST /api/planillas/generar"] --> AUTH["Comprobar sesión y permiso generar_planillas"]
    AUTH --> DATES["Convertir y validar periodo de fechas"]
    DATES --> PERIOD{"¿Fechas válidas y periodo de hasta 16 días?"}
    PERIOD -->|No| BAD_REQUEST["Responder HTTP 400"]
    PERIOD -->|Sí| DUPLICATE["Buscar planilla para ese mismo periodo"]
    DUPLICATE --> EXISTS{"¿Ya existe?"}
    EXISTS -->|Sí| CONFLICT["Responder HTTP 409"]
    EXISTS -->|No| STAFF["Consultar empleados activos quincenales"]
    STAFF --> STAFF_FOUND{"¿Hay empleados?"}
    STAFF_FOUND -->|No| NOT_FOUND["Responder HTTP 404"]
    STAFF_FOUND -->|Sí| CALCULATE["Calcular bruto, ISSS, AFP, renta y neto"]
    CALCULATE --> TOTAL["Sumar salarios netos"]
    TOTAL --> CREATE["Crear planilla y detalles relacionados"]
    CREATE --> CREATED["Responder HTTP 201"]
```

### `src/routes/administracion.routes.js`

Administra catálogo de roles, permisos, niveles de acceso y sucursales. Todas las rutas requieren el permiso correspondiente.

**`GET /api/administracion/roles` — `gestionar_roles_permisos`**

Devuelve los roles ordenados por nombre, junto con su nivel de acceso y los códigos de permiso relacionados.

**`GET /api/administracion/permisos` — `gestionar_roles_permisos`**

Devuelve el catálogo de permisos disponibles.

**`GET /api/administracion/niveles` — `gestionar_roles_permisos`**

Devuelve los niveles de acceso ordenados por código.

**`POST /api/administracion/roles` — `gestionar_roles_permisos`**

Valida nombre, nivel y pantalla inicial antes de crear un rol.

**`PUT /api/administracion/roles/:id/permisos` — `gestionar_roles_permisos`**

Reemplaza los permisos del nivel asociado al rol en una transacción. No permite modificar los permisos del administrador e invalida las sesiones existentes después del cambio.

**`GET /api/administracion/sucursales` — `gestionar_sucursales`**

Devuelve las sucursales ordenadas por nombre.

**`POST /api/administracion/sucursales` — `gestionar_sucursales`**

Crea la sucursal y sus registros de inventario inicial vacío dentro de una transacción.

**`PATCH /api/administracion/sucursales/:id` — `gestionar_sucursales`**

Actualiza los campos enviados: nombre, dirección, teléfono o estado activo.

### `src/routes/caja.routes.js`

Registra apertura, movimientos y cierre de caja. Sus helpers validan montos e identificadores y redondean importes a centavos.

**`montoValido(valor, permitirCero)`**

Comprueba que el monto sea finito, esté dentro del rango aceptado y, según el parámetro, permite o no el valor cero.

**`redondearMoneda(valor)`**

Redondea el importe a dos decimales.

**`validarId(valor)`**

Valida un identificador de ruta y devuelve el número entero positivo o `null`.

**`enteroPositivo(valor)`**

Valida un entero positivo usado en los campos recibidos.

**`GET /api/caja/actual` — `operar_caja`**

Consulta la caja abierta del usuario y sus movimientos recientes.

**`POST /api/caja/abrir` — `operar_caja`**

Valida la sucursal y el monto inicial. Impide abrir una segunda caja mientras ya exista una abierta en esa sucursal.

**`POST /api/caja/:id/movimientos` — `operar_caja`**

Registra retiros, ingresos extra o pagos a proveedores en una caja abierta del usuario.

**`POST /api/caja/:id/cerrar` — `operar_caja`**

En una transacción calcula el efectivo esperado con el monto de apertura, las ventas en efectivo y los movimientos. Guarda el monto contado, la diferencia y el estado cerrado.

### `src/routes/clientes.routes.js`

Gestiona el perfil del cliente autenticado y la búsqueda de clientes para operaciones autorizadas.

**`GET /api/clientes/yo` — `ver_mi_perfil`**

Devuelve el perfil de cliente relacionado con la sesión actual.

**`PATCH /api/clientes/yo` — `ver_mi_perfil`**

Valida y actualiza nombre, teléfono o dirección sin permitir cambiar otros datos del perfil.

**`GET /api/clientes?busqueda=...`**

Requiere al menos uno de estos permisos: `ver_ventas`, `tomar_pedidos` o `gestionar_reservas`. Busca por nombre, correo, DUI o NIT, limita la respuesta a 25 registros y ajusta los campos devueltos según los permisos.

### `src/routes/compras.routes.js`

Administra compras y pagos a proveedores. Incluye helpers para validar fechas e importes, determinar sucursal y registrar egresos de efectivo en caja.

**`enteroPositivo(valor)`**

Valida identificadores positivos.

**`redondear(valor, decimales)`**

Redondea cantidades e importes a la precisión indicada.

**`fechaSql(valor)`**

Acepta fechas SQL únicamente si coinciden con el formato y representan una fecha real.

**`leerSucursal(req, valor)`**

Determina qué sucursal puede utilizar el solicitante para una operación de escritura.

**`filtrarSucursal(req, sucursalid)`**

Prepara el filtro de sucursal que se aplica a una consulta de lectura.

**`registrarEgresoCaja(tx, req, sucursalid, metodoPago, monto, motivo)`**

Si el pago es en efectivo, exige que el usuario tenga una caja abierta en esa sucursal y registra el movimiento de salida asociado a la compra.

**`GET /api/compras` — `ver_compras`**

Valida paginación y filtro de sucursal. Devuelve compras ordenadas por fecha, con proveedor, detalles y pagos.

**`GET /api/compras/:id` — `ver_compras`**

Valida el identificador y consulta una compra dentro del ámbito permitido, incluyendo sucursal, proveedor, detalles y pagos.

**`POST /api/compras` — `registrar_compras`**

Valida proveedor, sucursal, factura y líneas de compra; calcula subtotal, IVA y total. En una transacción serializable crea la compra, incrementa existencias, recalcula el costo promedio, registra movimientos de entrada y agrega el pago inicial si corresponde.

**`POST /api/compras/:id/pagos` — `registrar_compras`**

Comprueba que el abono no supere el saldo pendiente, lo registra y actualiza el estado de pago. Si se utiliza efectivo, también crea el egreso en caja.

### `src/routes/empleados.routes.js`

Administra el catálogo y expediente de empleados. Sus helpers comprueban fechas y textos opcionales; utiliza constantes de sucursal y funciones de invalidación de sesión.

**`fechaValida(valor)`**

Comprueba que una fecha tenga formato `AAAA-MM-DD` y corresponda a una fecha real.

**`textoOpcionalValido(valor, maximo)`**

Comprueba que un texto opcional sea una cadena y respete la longitud permitida.

**`GET /api/empleados/roles` — `registrar_empleados`**

Devuelve los roles que la persona solicitante puede asignar. Los roles administrativos se filtran si no tiene permiso para gestionar roles.

**`GET /api/empleados/sucursales` — `registrar_empleados`**

Lista sucursales activas permitidas para el solicitante y convierte sus nombres a las etiquetas definidas en las constantes.

**`GET /api/empleados/yo` — `ver_mi_ficha`**

Devuelve la ficha laboral asociada a la cuenta autenticada. Si la cuenta no está vinculada a un empleado, responde `404`.

**`GET /api/empleados` — `ver_empleados` o `registrar_empleados`**

Lista empleados activos dentro del ámbito de la sucursal del solicitante e incluye información básica de rol y sede.

**`GET /api/empleados/:id` — `registrar_empleados`**

Valida el ID y devuelve el expediente del empleado. La consulta limita el acceso a roles administrativos a quienes tienen el permiso correspondiente.

**`PATCH /api/empleados/:id` — `registrar_empleados`**

Valida los campos enviados y actualiza parcialmente el expediente. Si hay una cuenta vinculada, sincroniza nombre, rol o sucursal dentro de una transacción; invalida su sesión cuando se modifican datos que afectan el acceso.

**`POST /api/empleados` — `registrar_empleados`**

Valida datos personales, rol, salario, fechas y sucursal; después llama a `dbo.sp_registrar_empleado` para crear el empleado y su cuenta de usuario.

La respuesta contiene las credenciales iniciales generadas por el procedimiento. Deben entregarse al empleado de forma segura y no registrarse en documentación ni en logs.

**`PATCH /api/empleados/:id/desactivar` — `registrar_empleados`**

Conserva el expediente, desactiva empleado y cuenta de usuario en una transacción e invalida la sesión vinculada.

### `src/routes/mesas.routes.js`

Consulta y administra mesas y sus estados. Los handlers restringen los datos a la sucursal de la sesión salvo que el usuario tenga permiso de gestionar sucursales.

**`GET /api/mesas/sucursales`**

Requiere sesión y uno de los permisos de consulta de sucursales, mesas o reservas. Devuelve sucursales activas dentro del ámbito permitido.

**`GET /api/mesas` — `ver_mesas` o `gestionar_reservas`**

Valida la sucursal seleccionada y lista sus mesas ordenadas por número.

**`POST /api/mesas` — `gestionar_reservas`**

Valida sucursal, número y capacidad, confirma que la sede esté activa y crea una mesa.

**`PATCH /api/mesas/:id` — `gestionar_reservas`**

Actualiza número o capacidad después de comprobar el ID y el ámbito de sucursal.

**`PATCH /api/mesas/:id/estado`**

Permite a `tomar_pedidos` cambiar entre libre y ocupada. Con `gestionar_reservas` también permite marcar una mesa como inactiva.

### `src/routes/modificadores.routes.js`

Administra opciones que se agregan a productos y pueden modificar el precio.

**`GET /api/modificadores` — `ver_menu`**

Lista modificadores activos ordenados por nombre.

**`POST /api/modificadores` — `gestionar_productos`**

Valida el nombre y el precio antes de crear un modificador.

**`PATCH /api/modificadores/:id` — `gestionar_productos`**

Valida el ID y permite actualizar nombre, precio o estado activo.

### `src/routes/productos.routes.js`

Administra productos de menú y las recetas asociadas.

**`GET /api/productos` — `ver_menu`**

Lista productos activos ordenados por categoría y devuelve los campos necesarios para presentar el menú.

**`POST /api/productos` — `gestionar_productos`**

Valida nombre, precio, categoría y receta. Si se envían ingredientes, comprueba que cada insumo exista y esté activo antes de crear producto y receta.

**`PATCH /api/productos/:id` — `gestionar_productos`**

Actualiza campos parciales. Si se envía `ingredientes`, comprueba los insumos y reemplaza la receta en una transacción para evitar que quede parcialmente actualizada.

### `src/routes/proveedores.routes.js`

Administra los datos de proveedores.

**`textoOpcional(valor, limite)`**

Comprueba que un campo opcional sea texto y que no supere la longitud permitida.

**`GET /api/proveedores` — `ver_proveedores`**

Lista proveedores activos ordenados por nombre de empresa.

**`POST /api/proveedores` — `registrar_compras`**

Valida nombre de empresa, correo y demás campos antes de crear el proveedor.

**`PATCH /api/proveedores/:id` — `registrar_compras`**

Valida el ID y actualiza solo los campos enviados; también permite cambiar el estado activo.

### `src/routes/reportes.routes.js`

Entrega consultas resumidas de ventas, inventario y planillas. El acceso a los tres endpoints requiere `ver_reportes`; cuando el usuario tiene sucursal asignada, los resultados se limitan a ella.

**`GET /api/reportes/ventas`**

Agrupa ventas por sucursal y tipo de documento, y devuelve cantidad de ventas, subtotal, IVA y total facturado.

**`GET /api/reportes/inventario`**

Lista insumos agotados o bajo el mínimo y calcula cuánto falta para alcanzar el mínimo.

**`GET /api/reportes/planillas?id_planilla=...`**

Consulta el detalle de planillas. El filtro `id_planilla` es opcional; si se incluye, debe ser un entero positivo.

### `src/routes/reservas.routes.js`

Consulta disponibilidad y administra reservas.

**`enteroPositivo(valor)`**

Convierte el valor y devuelve el número solo si es un entero mayor que cero.

**`fechaValida(valor)`**

Convierte una fecha interpretable en un objeto `Date`; si no es válida, devuelve `null`.

**`GET /api/reservas` — `ver_reservas`**

Lista reservas ordenadas por hora de inicio y limita los resultados a la sucursal de la sesión cuando está asignada.

**`GET /api/reservas/disponibles` — `ver_reservas_disponibles`**

Valida fecha, cantidad de personas, duración y sucursal. Después consulta `dbo.fn_mesas_disponibles` para devolver las mesas libres para ese horario.

**`GET /api/reservas/mis` — `ver_mis_reservas`**

Lista las reservas vinculadas al cliente autenticado.

**`POST /api/reservas` — `gestionar_reservas`**

Valida mesa, cliente, fecha futura y duración. Dentro de una transacción serializable vuelve a comprobar la disponibilidad de la mesa antes de crear la reserva.

**`PATCH /api/reservas/:id/estado` — `gestionar_reservas`**

Aplica transiciones permitidas entre pendiente, confirmada, cancelada y completada. Actualiza el estado de forma condicionada para detectar cambios concurrentes.

#### Flujo de consulta de disponibilidad y creación de una reserva

El endpoint de disponibilidad informa qué mesas están libres. Al crear la reserva, el backend repite la comprobación dentro de una transacción serializable, para reducir el riesgo de asignar la misma mesa dos veces para el mismo horario.

```mermaid
flowchart TD
    REQUEST["Consultar o crear una reserva"] --> INPUT["Validar fecha, personas, duración y sucursal"]
    INPUT --> VALID{"¿Datos válidos?"}
    VALID -->|No| BAD_REQUEST["Responder HTTP 400"]
    VALID -->|Sí| ACTION{"¿Solo consultar disponibilidad?"}
    ACTION -->|Sí| AVAILABILITY["Consultar dbo.fn_mesas_disponibles"]
    AVAILABILITY --> LIST["Devolver lista de mesas disponibles"]

    ACTION -->|Crear reserva| TX["Iniciar transacción Serializable"]
    TX --> CHECK["Comprobar mesa, cliente y sucursal"]
    CHECK --> FUNCTION["Volver a consultar dbo.fn_mesas_disponibles"]
    FUNCTION --> FREE{"¿La mesa sigue disponible?"}
    FREE -->|No| CONFLICT["Abortar y responder HTTP 409"]
    FREE -->|Sí| INSERT["Crear reserva"]
    INSERT --> COMMIT["Confirmar transacción"]
    COMMIT --> CREATED["Responder HTTP 201"]
```

### `src/routes/usuarios.routes.js`

Administra cuentas existentes dentro de un ámbito de sucursal.

**`validarAmbitoUsuario(req, res)`**

Exige que el solicitante tenga una sucursal asignada o el permiso `gestionar_sucursales`.

**`usuarioEnSucursalDelSolicitante(req, usuario)`**

Comprueba que la cuenta consultada pertenezca a la sucursal del solicitante cuando este tiene una sede asignada.

**`GET /api/usuarios?sucursalid=...` — `gestionar_usuarios`**

Lista cuentas dentro de la sucursal autorizada. Las cuentas sin sede se consultan con `sucursalid=sin_asignar`.

**`PATCH /api/usuarios/:id/rol` — `gestionar_usuarios`**

Valida que el rol corresponda al tipo de cuenta y actualiza usuario y ficha laboral dentro de una transacción. Después invalida las sesiones de ese usuario.

**`PATCH /api/usuarios/:id/desactivar` — `gestionar_usuarios`**

Impide que el solicitante se desactive a sí mismo. Desactiva la cuenta y ficha laboral en una transacción, conserva los datos y revoca las sesiones.

## Endpoints de la API

Esta lista sirve como índice rápido. Las funciones, validaciones y lógica de cada grupo se explican en los bloques anteriores. Los permisos indicados son los comprobados por cada ruta; todas las rutas de módulos protegidos requieren además una sesión vigente.

### Rutas generales, autenticación y ventas

- **`GET /api/health`** — comprueba que SQL Server responda.

- **`GET /api/sucursales`** — lista las sucursales que se pueden seleccionar al iniciar sesión.

- **`GET /`** — muestra un mensaje indicando que la API está funcionando.

- **`POST /api/login`** — valida credenciales y crea una sesión.

- **`POST /api/logout`** — revoca la sesión actual.

- **`POST /api/clientes/registro`** — registra una cuenta de cliente y crea su sesión.

- **`GET /api/session`** — devuelve los datos del usuario y los permisos de la sesión.

- **`POST /api/cambiar-password`** — cambia la contraseña de la cuenta autenticada.

- **`GET /api/ventas`** — lista ventas permitidas para `ver_ventas` o `ver_pedidos_cocina`.

- **`GET /api/ventas/:id`** — consulta una venta específica dentro del ámbito autorizado; requiere `ver_ventas` o `ver_pedidos_cocina`.

- **`POST /api/ventas`** — registra la venta y consume sus ingredientes; requiere `tomar_pedidos`.

- **`PATCH /api/ventas/:id/estado-pedido`** — cambia el estado de un pedido; requiere `tomar_pedidos` o `ver_pedidos_cocina`.

- **`POST /api/ventas/:id/pagos`** — registra un pago de venta; requiere `tomar_pedidos` u `operar_caja`.

### Inventario

- **`POST /api/inventario/explosion`** — descuenta ingredientes manualmente; requiere `gestionar_inventario`.

- **`POST /api/inventario/explosion/simulacion`** — calcula consumo y faltantes sin modificar existencias; requiere `ver_inventario`.

- **`GET /api/inventario/alertas`** — consulta alertas de stock; requiere `ver_inventario`.

- **`GET /api/inventario/insumos/catalogo`** — lista insumos activos; requiere `gestionar_inventario`.

- **`GET /api/inventario/insumos`** — consulta existencias; requiere `ver_inventario`.

- **`GET /api/inventario/recetas`** — consulta las recetas de productos activos; requiere `gestionar_inventario`.

- **`GET /api/inventario/recetas/:id_producto`** — consulta la receta de un producto; requiere `gestionar_inventario`.

- **`POST /api/inventario/insumos`** — registra un insumo; requiere `gestionar_inventario`.

- **`PATCH /api/inventario/insumos/:id`** — actualiza un insumo; requiere `gestionar_inventario`.

- **`POST /api/inventario/ajustes`** — registra un movimiento de ajuste; requiere `gestionar_inventario`.

- **`GET /api/inventario/movimientos`** — consulta movimientos recientes; requiere `ver_inventario`.

### Productos, clientes, empleados y usuarios

- **`GET /api/productos`** — consulta el menú; requiere `ver_menu`.

- **`POST /api/productos`** — crea un producto y, si se envían, sus ingredientes; requiere `gestionar_productos`.

- **`PATCH /api/productos/:id`** — actualiza producto o receta; requiere `gestionar_productos`.

- **`GET /api/modificadores`** — consulta modificadores activos; requiere `ver_menu`.

- **`POST /api/modificadores`** — registra un modificador; requiere `gestionar_productos`.

- **`PATCH /api/modificadores/:id`** — actualiza un modificador; requiere `gestionar_productos`.

- **`GET /api/clientes?busqueda=...`** — busca clientes para operaciones autorizadas; requiere `ver_ventas`, `tomar_pedidos` o `gestionar_reservas`.

- **`GET /api/clientes/yo`** — consulta el perfil propio; requiere `ver_mi_perfil`.

- **`PATCH /api/clientes/yo`** — actualiza el perfil propio; requiere `ver_mi_perfil`.

- **`GET /api/empleados/roles`** — consulta roles que se pueden asignar; requiere `registrar_empleados`.

- **`GET /api/empleados/sucursales`** — consulta sucursales disponibles para el formulario; requiere `registrar_empleados`.

- **`GET /api/empleados/yo`** — consulta la ficha laboral propia; requiere `ver_mi_ficha`.

- **`GET /api/empleados`** — lista empleados; requiere `ver_empleados` o `registrar_empleados`.

- **`GET /api/empleados/:id`** — consulta un expediente; requiere `registrar_empleados`.

- **`POST /api/empleados`** — registra empleado y cuenta asociada; requiere `registrar_empleados`.

- **`PATCH /api/empleados/:id`** — actualiza el expediente; requiere `registrar_empleados`.

- **`PATCH /api/empleados/:id/desactivar`** — desactiva empleado y cuenta relacionada; requiere `registrar_empleados`.

- **`GET /api/usuarios?sucursalid=...`** — consulta usuarios de una sucursal; requiere `gestionar_usuarios`.

- **`PATCH /api/usuarios/:id/rol`** — actualiza el rol de una cuenta; requiere `gestionar_usuarios`.

- **`PATCH /api/usuarios/:id/desactivar`** — desactiva una cuenta; requiere `gestionar_usuarios`.

### Administración, caja, compras y proveedores

- **`GET /api/administracion/roles`** — consulta los roles y sus permisos; requiere `gestionar_roles_permisos`.

- **`GET /api/administracion/permisos`** — consulta el catálogo de permisos; requiere `gestionar_roles_permisos`.

- **`GET /api/administracion/niveles`** — consulta los niveles de acceso; requiere `gestionar_roles_permisos`.

- **`POST /api/administracion/roles`** — crea un rol; requiere `gestionar_roles_permisos`.

- **`PUT /api/administracion/roles/:id/permisos`** — reemplaza permisos de un rol; requiere `gestionar_roles_permisos`.

- **`GET /api/administracion/sucursales`** — consulta sucursales; requiere `gestionar_sucursales`.

- **`POST /api/administracion/sucursales`** — crea una sucursal y su inventario vacío; requiere `gestionar_sucursales`.

- **`PATCH /api/administracion/sucursales/:id`** — actualiza una sucursal; requiere `gestionar_sucursales`.

- **`GET /api/caja/actual`** — consulta la caja abierta; requiere `operar_caja`.

- **`POST /api/caja/abrir`** — abre una caja; requiere `operar_caja`.

- **`POST /api/caja/:id/movimientos`** — registra un movimiento de caja; requiere `operar_caja`.

- **`POST /api/caja/:id/cerrar`** — calcula y registra el cierre; requiere `operar_caja`.

- **`GET /api/compras`** — lista compras; requiere `ver_compras`.

- **`GET /api/compras/:id`** — consulta una compra; requiere `ver_compras`.

- **`POST /api/compras`** — registra una compra y actualiza inventario; requiere `registrar_compras`.

- **`POST /api/compras/:id/pagos`** — registra un abono; requiere `registrar_compras`.

- **`GET /api/proveedores`** — consulta proveedores activos; requiere `ver_proveedores`.

- **`POST /api/proveedores`** — registra proveedor; requiere `registrar_compras`.

- **`PATCH /api/proveedores/:id`** — actualiza proveedor; requiere `registrar_compras`.

### Planillas, mesas, reservas y reportes

- **`POST /api/planillas/generar`** — genera una planilla; requiere `generar_planillas`.

- **`GET /api/planillas`** — lista planillas; requiere `ver_planillas`.

- **`GET /api/planillas/mi`** — consulta la planilla propia; requiere `ver_mi_planilla`.

- **`GET /api/planillas/:id`** — consulta el detalle de una planilla; requiere `ver_planillas`.

- **`PUT /api/planillas/:id/pagar`** — marca una planilla como pagada; requiere `generar_planillas`.

- **`GET /api/mesas/sucursales`** — consulta sucursales visibles; requiere `ver_reservas_disponibles`, `ver_mesas` o `gestionar_reservas`.

- **`GET /api/mesas`** — lista mesas de una sucursal; requiere `ver_mesas` o `gestionar_reservas`.

- **`POST /api/mesas`** — crea una mesa; requiere `gestionar_reservas`.

- **`PATCH /api/mesas/:id`** — actualiza número o capacidad; requiere `gestionar_reservas`.

- **`PATCH /api/mesas/:id/estado`** — cambia el estado de una mesa; requiere `tomar_pedidos` o `gestionar_reservas`.

- **`GET /api/reservas`** — lista reservas; requiere `ver_reservas`.

- **`GET /api/reservas/disponibles`** — consulta mesas disponibles; requiere `ver_reservas_disponibles`.

- **`GET /api/reservas/mis`** — lista reservas del cliente autenticado; requiere `ver_mis_reservas`.

- **`POST /api/reservas`** — crea una reserva; requiere `gestionar_reservas`.

- **`PATCH /api/reservas/:id/estado`** — actualiza el estado de una reserva; requiere `gestionar_reservas`.

- **`GET /api/reportes/ventas`** — consulta el reporte de ventas; requiere `ver_reportes`.

- **`GET /api/reportes/inventario`** — consulta el reporte de existencias; requiere `ver_reportes`.

- **`GET /api/reportes/planillas`** — consulta el reporte de planillas; requiere `ver_reportes`.

## Pruebas

### `pruebas/inventarioServicio.prueba.js`

**Propósito:** prueba reglas del servicio de inventario sin conectarse a SQL Server. Usa el módulo nativo `node:test`, aserciones de `node:assert/strict` y un cliente Prisma falso.

**`crearDatosDePrueba()`**

Crea productos, insumos y recetas aislados para que cada prueba trabaje con sus propios datos.

**`crearClienteFalso(datos)`**

Implementa en memoria las consultas y actualizaciones de Prisma que utiliza el servicio, como `findMany` y `updateMany`.

**`stockDe(datos, idInsumo)`**

Busca el stock actual de un insumo de prueba.

Las pruebas verifican que el servicio:

- Descuente la cantidad correcta según la receta y las unidades vendidas.
- Acumule ingredientes compartidos y permita productos sin receta.
- Rechace productos inválidos o inactivos.
- No realice descuentos parciales cuando falta inventario y detecte conflictos.
- Genere y ordene alertas de stock, omitiendo insumos inactivos.
- Simule consumos sin modificar existencias.
- Normalice productos repetidos, liste insumos y calcule costos de recetas.

Para ejecutarlas, usa `node --test pruebas/inventarioServicio.prueba.js` desde la carpeta `Backend`.

## Configuracion

Abrir la base de datos OrigeneSV.sql en sql manager, hacer la conexion a un contenedor de docker con la siguiente linea:

docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=ProyectoWeb@2026" -p 1432:1433 --name proyecto_web -v sqlserver_data:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest

este creara un contenedor de docker, luego en sql server pondras los siguientes datos:

Nombre de el servidor: localhost,1432
Nombre de usuario: sa
contrasenia: ProyectoWeb@2026
luego de eso abrir el archivo .sql de OrigeneSV en este contenedor y ejecutarlo con F5.

En el proyecto: Crear un archivo en la carpeta de backend, con el nombre de ".env", dentro de esta pon lo siguiente:

//Conexion a la database en docker DATABASE_URL="sqlserver://localhost:1432;database=OrigeneSV;user=sa;password=ProyectoWeb@2026;encrypt=true;trustServerCertificate=true"

abre una terminal en la carpeta de backend y ejecuta lo siguiente: npm install npx prisma generate npm run dev

abre una terminal en la carpeta de frontend y ejecuta lo siguiente: npom install npm run dev