import { PrismaClient } from '@prisma/client'; // Cliente ORM generado desde schema.prisma
import { PrismaMssql } from '@prisma/adapter-mssql'; // Adaptador para SQL Server
import 'dotenv/config'; // Carga DATABASE_URL desde .env

const databaseUrl = process.env.DATABASE_URL; // Lee la cadena de conexión del entorno

if (!databaseUrl) {
  throw new Error('DATABASE_URL no está configurada en el archivo .env'); // Falla si falta la URL
}

const adapter = new PrismaMssql(databaseUrl); // Crea el adaptador MSSQL con la cadena de conexión

// Evita crear múltiples instancias de PrismaClient si se reinicia el proceso en dev
const globalForPrisma = globalThis; 

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'], // Logs controlados
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma; // Reutiliza la instancia al recargar en desarrollo
}

export default prisma; // Exporta la instancia para usar en rutas, servicios y seeders