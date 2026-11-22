//Archivo que contiene la logica para crear y validar tokens, para permitir el acceso a usuarios logeados
import crypto from 'node:crypto';

const secret = process.env.AUTH_TOKEN_SECRET ?? crypto.randomBytes(32);
const tokenLifetimeSeconds = 8 * 60 * 60;

function firma(payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function crearToken(usuario) {
  const payload = Buffer.from(JSON.stringify({
    id_usuario: usuario.id_usuario,
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds
  })).toString('base64url');
  return `${payload}.${firma(payload)}`;
}

export function requerirSesion(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ mensaje: 'Debe iniciar sesión' });

  const [payload, firmaRecibida, extra] = token.split('.');
  if (!payload || !firmaRecibida || extra) {
    return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }

  const firmaEsperada = firma(payload);
  const recibida = Buffer.from(firmaRecibida);
  const esperada = Buffer.from(firmaEsperada);
  if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) {
    return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }

  try {
    const sesion = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(sesion.id_usuario) || sesion.exp <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
    }
    req.usuario = { id_usuario: sesion.id_usuario };
    return next();
  } catch {
    return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }
}
