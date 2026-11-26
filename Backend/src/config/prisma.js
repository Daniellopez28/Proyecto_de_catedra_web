
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import 'dotenv/config'; // Asegura que lea el archivo .env

//planteamos la conexion a la base de datos usando una variable de de DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL no está configurada en Backend/.env');
}

//Pasamos la URL a un objeto de configuración para el adaptador de PrismaMssql
const [serverAddress, ...connectionParameters] = databaseUrl
  .replace(/^sqlserver:\/\//i, '')
  .split(';');
const [server, portText] = serverAddress.split(':');
const parameters = new Map(
  connectionParameters.map((parameter) => {
    const separator = parameter.indexOf('=');
    return [
      parameter.slice(0, separator).trim().toLowerCase(),
      parameter.slice(separator + 1).trim().replace(/^\{(.*)\}$/, '$1'),
    ];
  })
);

// Extraemos los parametros necesarios para la conexión, tales como base de datos, usuario y contrasenia
const database = parameters.get('database');
const user = parameters.get('user');
const password = parameters.get('password');
if (!server || !database || !user || !password) {
  throw new Error('DATABASE_URL debe incluir servidor, base de datos, usuario y contraseña');
}

// Creamos el adaptador de PrismaMssql con los parametros extraídos
const adapter = new PrismaMssql({
  server,
  port: portText ? Number(portText) : 1433,
  database,
  user,
  password,
  options: {
    encrypt: parameters.get('encrypt')?.toLowerCase() === 'true',
    trustServerCertificate: parameters.get('trustservercertificate')?.toLowerCase() === 'true',
    enableAnsiNull: true,
    enableAnsiNullDefault: true,
    enableAnsiPadding: true,
    enableAnsiWarnings: true,
    enableArithAbort: true,
    enableConcatNullYieldsNull: true,
    enableNumericRoundabort: false,
    enableQuotedIdentifier: true,
  },
});

// Inicializamos Prisma pasándole el adaptador
const prisma = new PrismaClient({ adapter });

export default prisma;