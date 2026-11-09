import { PrismaClient } from '../generated/prisma/index.js'; // <-- 
import { PrismaMssql } from '@prisma/adapter-mssql';
import 'dotenv/config';

// Configuramos los parámetros de conexión manualmente
const config = {
  server: 'localhost',
  port: 1434, // Puerto
  database: 'Restaurante_Origenes_SV',
  user: 'sa',
  password: 'Admin123!', // O usa process.env.DB_PASSWORD
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

export default prisma;