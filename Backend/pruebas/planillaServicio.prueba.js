import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar_detalle_editable } from '../src/services/planilla.service.js';

test('normaliza montos editados y recalcula el salario neto con centavos exactos', () => {
    assert.deepEqual(normalizar_detalle_editable({
        salario_bruto: '600.00',
        descuento_isss: '18',
        descuento_afp: 43.5,
        descuento_renta: '10.25'
    }), {
        salario_bruto: '600.00',
        descuento_isss: '18.00',
        descuento_afp: '43.50',
        descuento_renta: '10.25',
        salario_neto: '528.25'
    });
});

test('rechaza montos negativos, formatos inválidos y valores fuera de DECIMAL(10,2)', () => {
    const base = {
        salario_bruto: '100.00',
        descuento_isss: '3.00',
        descuento_afp: '7.25',
        descuento_renta: '0.00'
    };

    assert.throws(
        () => normalizar_detalle_editable({ ...base, descuento_isss: '-1.00' }),
        /montos deben ser positivos/
    );
    assert.throws(
        () => normalizar_detalle_editable({ ...base, descuento_afp: '1.234' }),
        /montos deben ser positivos/
    );
    assert.throws(
        () => normalizar_detalle_editable({ ...base, salario_bruto: '100000000.00' }),
        /montos deben ser positivos/
    );
});

test('no permite que los descuentos superen el salario bruto', () => {
    assert.throws(() => normalizar_detalle_editable({
        salario_bruto: '50.00',
        descuento_isss: '20.00',
        descuento_afp: '20.00',
        descuento_renta: '10.01'
    }), /descuentos no pueden superar/);
});
