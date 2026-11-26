# Backend

## Requisitos

- Node.js y npm.
- Docker con SQL Server 2022.

## SQL Server local

Usa una contraseña fuerte y exclusiva para el usuario `sa`. No la guardes en el repositorio ni expongas el puerto de SQL Server en la red:
Usa al menos 16 caracteres y evita `;` para que no se rompa la cadena de conexión de SQL Server.

```bash
read -r -s -p "Contraseña fuerte para SQL Server: " MSSQL_SA_PASSWORD
printf '\n'
docker run \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" \
  -p 127.0.0.1:1432:1433 \
  --name proyecto_web \
  -v sqlserver_data:/var/opt/mssql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Conecta SQL Server Management Studio a `localhost,1432` con el usuario `sa` y la contraseña que acabas de introducir. Ejecuta `OrigeneSV.sql` en ese servidor.
Si una contraseña anterior se compartió o se utilizó, cámbiala también en SQL Server y en `Backend/.env`; no la reutilices.

## Configuración y ejecución

Crea `Backend/.env` (está excluido de Git) con la cadena de conexión. Sustituye `CAMBIA_ESTE_VALOR` por la misma contraseña fuerte usada para SQL Server:

```dotenv
DATABASE_URL="sqlserver://localhost:1432;database=OrigeneSV;user=sa;password=CAMBIA_ESTE_VALOR;encrypt=true;trustServerCertificate=true"
```

Desde `Backend/`:

```bash
npm install
npx prisma generate
npm run dev
```

En otra terminal, desde `frontend/`:

```bash
npm install
npm run dev
```
