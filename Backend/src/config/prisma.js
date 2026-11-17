import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import 'dotenv/config'; // Asegura que lea el archivo .env

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL no está configurada en Backend/.env');
}

// PrismaMssql recibe la cadena directamente, no dentro de un objeto connectionString.
const adapter = new PrismaMssql(databaseUrl);

// Inicializamos Prisma pasándole el adaptador
const prisma = new PrismaClient({ adapter });

export default prisma;