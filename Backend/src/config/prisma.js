//archivo encargado de configurar la conexion a la base de datos, de una manera que pueda usar caulquier parte del back
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Falta DATABASE_URL en Backend/.env');
}

const prisma = new PrismaClient({
  adapter: new PrismaMssql(databaseUrl),
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

export default prisma;
