/*Backend/prisma.config.ts*/
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/*Configuración de Prisma 7 para migraciones y CLI*/
export default defineConfig({
  /*Ruta del esquema de base de datos*/
  schema: 'prisma/schema.prisma',
  /*Configuración de conexión tomada de variables de entorno*/
  datasource: {
    url: env('DATABASE_URL'),
  },
});