import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRequerirPermiso } from '../auth/permissionMiddleware.js';

function crearResponse() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('permite continuar cuando el usuario tiene el permiso requerido', async () => {
  const middleware = crearRequerirPermiso(async (id, permiso) => id === 4 && permiso === 'ver_ventas');
  const req = { usuario: { id_usuario: 4 } };
  const res = crearResponse();
  let continuo = false;

  await middleware('ver_ventas')(req, res, () => { continuo = true; });

  assert.equal(continuo, true);
  assert.equal(res.statusCode, 200);
});

test('responde 403 y no continúa si el usuario carece del permiso', async () => {
  const middleware = crearRequerirPermiso(async () => false, () => {});
  const res = crearResponse();
  let continuo = false;

  await middleware('gestionar_usuarios')({ usuario: { id_usuario: 4 } }, res, () => { continuo = true; });

  assert.equal(continuo, false);
  assert.equal(res.statusCode, 403);
});

test('responde 401 si no hay una sesión asociada a la solicitud', async () => {
  const middleware = crearRequerirPermiso(async () => true);
  const res = crearResponse();

  await middleware('ver_ventas')({}, res, () => {});

  assert.equal(res.statusCode, 401);
});

test('registra el error de consulta y falla de forma explícita con 500', async () => {
  let mensajeRegistrado = false;
  const middleware = crearRequerirPermiso(
    async () => { throw new Error('database unavailable'); },
    () => { mensajeRegistrado = true; }
  );
  const res = crearResponse();

  await middleware('ver_ventas')({ usuario: { id_usuario: 4 } }, res, () => {});

  assert.equal(mensajeRegistrado, true);
  assert.equal(res.statusCode, 500);
});
