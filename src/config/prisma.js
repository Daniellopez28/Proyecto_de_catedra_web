import 'dotenv/config';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('Falta DATABASE_URL. Configura la conexión a SQL Server en el archivo .env.');
}

const adapter = new PrismaMssql(connectionString);
const prisma = new PrismaClient({ adapter });

export default prisma;