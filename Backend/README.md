# Backend

## Configuración

El backend necesita una instancia accesible de SQL Server y la base de datos
`Restaurante_Origenes_SV`. Si aún no existe, crea la base y sus tablas ejecutando
`Proyecto_BD.sql` desde SQL Server Management Studio o Azure Data Studio.

Desde PowerShell, en la carpeta `Backend`, crea el archivo local de configuración:

```powershell
Copy-Item .env.example .env
```

Edita `Backend/.env` y reemplaza en `DATABASE_URL` el servidor, usuario y
contraseña con los de tu instancia. El ejemplo usa SQL Server en `localhost:1433`
y autenticación de SQL Server; si tu instancia usa otro puerto o autenticación,
ajusta la cadena de conexión. No compartas ni subas el archivo `.env`.

Luego instala dependencias y ejecuta el backend:

```powershell
npm install
npm run dev
```

La instalación genera el cliente de Prisma automáticamente.
