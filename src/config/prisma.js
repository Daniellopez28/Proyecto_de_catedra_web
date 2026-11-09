import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import 'dotenv/config'; // Asegura que lea el archivo .env

// Creamos el adaptador de SQL Server con la URL del .env
const adapter = new PrismaMssql({
  connectionString: process.env.DATABASE_URL,
});

// Inicializamos Prisma pasándole el adaptador
const prisma = new PrismaClient({ adapter });

export default prisma;