/*Backend/src/config/prisma.js*/
/*Si usas adapter para SQL Server en Prisma 7, instáncialo aquí según tu configuración*/
import { PrismaClient } from '@prisma/client';

/*Crea la instancia del cliente de Prisma*/
const prisma = new PrismaClient();

/*Exporta la instancia para los servicios y controladores*/
export default prisma;