import { randomBytes } from 'node:crypto';

const duracionSesionMs = 8 * 60 * 60 * 1000;
const sesiones = new Map();
export const nombreCookieSesion = 'origenes-sesion';
export const opcionesCookieSesion = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: duracionSesionMs
};
export const opcionesBorrarCookieSesion = {
    httpOnly: opcionesCookieSesion.httpOnly,
    secure: opcionesCookieSesion.secure,
    sameSite: opcionesCookieSesion.sameSite,
    path: opcionesCookieSesion.path
};

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

export function extraerTokenSesion(peticion) {
    const cookieHeader = peticion.headers?.cookie ?? '';
    const cookie = cookieHeader.split(';').map((parte) => parte.trim()).find((parte) =>
        parte.startsWith(`${nombreCookieSesion}=`)
    );
    if (cookie) {
        const valor = cookie.slice(nombreCookieSesion.length + 1);
        try {
            return decodeURIComponent(valor);
        } catch {
            return null;
        }
    }

    const encabezado = peticion.get?.('Authorization') ?? '';
    return encabezado.match(/^Bearer ([a-f0-9]{64})$/i)?.[1] ?? null;
}

export function requerirAutenticacion(peticion, respuesta, siguiente) {
    const token = extraerTokenSesion(peticion);
    const sesion = token ? sesiones.get(token) : null;

    if (!token || !/^[a-f0-9]{64}$/i.test(token) || !sesion || sesion.expiraEn <= Date.now()) {
        if (token) sesiones.delete(token);
        const tieneCookieSesion = peticion.headers?.cookie?.split(';').some((parte) =>
            parte.trim().startsWith(`${nombreCookieSesion}=`)
        );
        if (tieneCookieSesion) {
            respuesta.clearCookie(nombreCookieSesion, opcionesBorrarCookieSesion);
        }
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
