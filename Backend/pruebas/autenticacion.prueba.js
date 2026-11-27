import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    crearSesion,
    extraerTokenSesion,
    invalidarTodasLasSesiones,
    nombreCookieSesion,
    opcionesCookieSesion,
    requerirAutenticacion
} from '../src/middleware/autenticacion.js';

function probarAutenticacion(headers = {}, authorization = '') {
    const peticion = {
        headers,
        get: (nombre) => nombre === 'Authorization' ? authorization : ''
    };
    const resultado = { status: null, cuerpo: null, siguiente: false, cookieEliminada: false };
    const respuesta = {
        clearCookie() {
            resultado.cookieEliminada = true;
            return this;
        },
        status(codigo) {
            resultado.status = codigo;
            return this;
        },
        json(cuerpo) {
            resultado.cuerpo = cuerpo;
            return this;
        }
    };
    requerirAutenticacion(peticion, respuesta, () => {
        resultado.siguiente = true;
    });
    return { peticion, resultado };
}

test('configura la cookie de sesión como HttpOnly y SameSite=Lax', () => {
    assert.equal(opcionesCookieSesion.httpOnly, true);
    assert.equal(opcionesCookieSesion.sameSite, 'lax');
    assert.equal(opcionesCookieSesion.path, '/');
    assert.equal(opcionesCookieSesion.maxAge, 8 * 60 * 60 * 1000);
});

test('autentica una sesión enviada como cookie', () => {
    invalidarTodasLasSesiones();
    const usuario = { id_usuario: 7 };
    const token = crearSesion(usuario, ['ver_ventas']);
    const { peticion, resultado } = probarAutenticacion({
        cookie: `preferencia=all; ${nombreCookieSesion}=${token}`
    });

    assert.equal(resultado.siguiente, true);
    assert.equal(peticion.auth.usuario, usuario);
    assert.deepEqual([...peticion.auth.permisos], ['ver_ventas']);
    invalidarTodasLasSesiones();
});

test('rechaza cookies inválidas y conserva compatibilidad con Bearer', () => {
    invalidarTodasLasSesiones();
    const invalida = probarAutenticacion({
        cookie: `${nombreCookieSesion}=token-invalido`
    });
    assert.equal(invalida.resultado.status, 401);
    assert.equal(invalida.resultado.cookieEliminada, true);

    const usuario = { id_usuario: 8 };
    const token = crearSesion(usuario, []);
    assert.equal(extraerTokenSesion({
        headers: {},
        get: () => `Bearer ${token}`
    }), token);
    const bearer = probarAutenticacion({}, `Bearer ${token}`);
    assert.equal(bearer.resultado.siguiente, true);
    invalidarTodasLasSesiones();
});
