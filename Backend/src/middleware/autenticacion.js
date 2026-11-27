import { randomBytes } from 'node:crypto';

const duracionSesionMs = 8 * 60 * 60 * 1000;
const sesiones = new Map();

export function crearSesion(usuario, permisos) {
    const ahora = Date.now();
    for (const [token, sesion] of sesiones) {
        if (sesion.expiraEn <= ahora) sesiones.delete(token);
    }

    const token = randomBytes(32).toString('hex');
    sesiones.set(token, {
        usuario,
        permisos: new Set(permisos),
        expiraEn: ahora + duracionSesionMs
    });
    return token;
}

export function cerrarSesion(token) {
    sesiones.delete(token);
}

export function invalidarSesionesDeUsuario(idUsuario) {
    for (const [token, sesion] of sesiones) {
        if (sesion.usuario.id_usuario === idUsuario) sesiones.delete(token);
    }
}

export function invalidarTodasLasSesiones() {
    sesiones.clear();
}

export function requerirAutenticacion(peticion, respuesta, siguiente) {
    const encabezado = peticion.get('Authorization') ?? '';
    const coincidencia = encabezado.match(/^Bearer ([a-f0-9]{64})$/i);
    const token = coincidencia?.[1];
    const sesion = token ? sesiones.get(token) : null;

    if (!sesion || sesion.expiraEn <= Date.now()) {
        if (token) sesiones.delete(token);
        return respuesta.status(401).json({ mensaje: 'La sesión no es válida o expiró' });
    }

    peticion.auth = {
        token,
        usuario: sesion.usuario,
        permisos: sesion.permisos
    };
    return siguiente();
}

export function requerirPermiso(codigo) {
    return (peticion, respuesta, siguiente) => {
        if (!peticion.auth?.permisos.has(codigo)) {
            return respuesta.status(403).json({ mensaje: 'No tienes permiso para realizar esta acción' });
        }
        return siguiente();
    };
}
