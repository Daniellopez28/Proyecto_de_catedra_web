//Archivo que contiene el middleware o permisos para proteger las rutas de la API y permitir el acceso solo a usuarios con permisos vigentes

export function crearRequerirPermiso(comprobarPermiso, registrarError = console.error) {
  return (codigoPermiso) => async (req, res, next) => {
    const idUsuario = req.usuario?.id_usuario;
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({ mensaje: 'Debe iniciar sesión' });
    }

    try {
      if (!await comprobarPermiso(idUsuario, codigoPermiso)) {
        return res.status(403).json({ mensaje: 'No tiene permiso para realizar esta operación' });
      }
      return next();
    } catch (error) {
      registrarError(`No se pudo validar el permiso ${codigoPermiso}:`, error);
      return res.status(500).json({ mensaje: 'No se pudo verificar el permiso de acceso' });
    }
  };
}
