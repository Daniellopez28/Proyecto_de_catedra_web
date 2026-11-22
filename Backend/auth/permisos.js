//Auth para consultar permisos que esten vigentes 

import prisma from '../src/config/prisma.js';
import { crearRequerirPermiso } from './permissionMiddleware.js';

//funcion para consultar permisos de usuario
async function consultarPermiso(idUsuario, codigoPermiso) {
  const [resultado] = await prisma.$queryRaw`
    SELECT CAST(CASE WHEN EXISTS (
      SELECT 1
      FROM dbo.usuarios u
      JOIN dbo.roles r ON r.id_rol = u.id_rol
      JOIN dbo.nivel_permiso np ON np.id_nivel = r.id_nivel
      JOIN dbo.permisos p ON p.id_permiso = np.id_permiso
      WHERE u.id_usuario = ${idUsuario}
        AND u.activo = 1
        AND p.codigo = ${codigoPermiso}
    ) THEN 1 ELSE 0 END AS bit) AS autorizado
  `;
  return resultado?.autorizado === true || Number(resultado?.autorizado) === 1;
}

//export que obtiene los permisos de el usuario 
export async function obtenerPermisosUsuario(idUsuario) {
  const filas = await prisma.$queryRaw`
    SELECT DISTINCT p.codigo
    FROM dbo.usuarios u
    JOIN dbo.roles r ON r.id_rol = u.id_rol
    JOIN dbo.nivel_permiso np ON np.id_nivel = r.id_nivel
    JOIN dbo.permisos p ON p.id_permiso = np.id_permiso
    WHERE u.id_usuario = ${idUsuario}
      AND u.activo = 1
  `;
  return new Set(filas.map(({ codigo }) => codigo));
}

export const requerirPermiso = crearRequerirPermiso(consultarPermiso);
