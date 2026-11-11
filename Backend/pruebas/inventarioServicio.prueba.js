import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ErrorInventario,
    normalizarProductosVenta,
    ejecutarExplosion,
    simularExplosion,
    obtenerAlertasStock,
    listarInsumos,
    obtenerRecetas
} from '../src/servicios/inventarioServicio.js';

/** Datos nuevos para cada prueba, así una no afecta a otra. */
function crearDatosDePrueba() {
    return {
        productos: [
            { id_producto: 1, nombre: 'Latte Grande', activo: true, categoria: 'Bebida Caliente', precio_venta: 3.5, es_reventa: false },
            { id_producto: 2, nombre: 'Galleta de Chocolate', activo: true, categoria: 'Reventa', precio_venta: 1.25, es_reventa: true },
            { id_producto: 3, nombre: 'Capuchino', activo: true, categoria: 'Bebida Caliente', precio_venta: 3.5, es_reventa: false },
            { id_producto: 4, nombre: 'Producto descontinuado', activo: false, categoria: 'Bebida Caliente', precio_venta: 2, es_reventa: false }
        ],
        insumos: [
            { id_insumo: 1, nombre: 'Café en grano', unidad_medida: 'g', stock_actual: 5000, stock_minimo: 500, costo_promedio: 0.02, activo: true },
            { id_insumo: 2, nombre: 'Leche entera', unidad_medida: 'ml', stock_actual: 20000, stock_minimo: 2000, costo_promedio: 0.0015, activo: true },
            { id_insumo: 3, nombre: 'Vaso 16oz', unidad_medida: 'unidad', stock_actual: 1000, stock_minimo: 100, costo_promedio: 0.05, activo: true }
        ],
        recetas: [
            { id_producto: 1, id_insumo: 1, cantidad_requerida: 18 },
            { id_producto: 1, id_insumo: 2, cantidad_requerida: 250 },
            { id_producto: 1, id_insumo: 3, cantidad_requerida: 1 },
            { id_producto: 3, id_insumo: 1, cantidad_requerida: 18 },
            { id_producto: 3, id_insumo: 2, cantidad_requerida: 150 }
        ]
    };
}

/** Cliente Prisma falso: implementa solo las consultas que usa el servicio. */
function crearClienteFalso(datos) {
    return {
        productos: {
            findMany: async ({ where = {}, orderBy } = {}) => {
                const filtrados = datos.productos.filter((p) => {
                    const filtroId = where.id_producto;
                    const coincideId = filtroId === undefined ||
                        (typeof filtroId === 'number' ? p.id_producto === filtroId : filtroId.in.includes(p.id_producto));
                    return coincideId && (where.activo === undefined || p.activo === where.activo);
                });
                return orderBy ? filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre)) : filtrados;
            }
        },
        recetas_detalle: {
            findMany: async ({ where }) =>
                datos.recetas
                    .filter((r) => where.id_producto.in.includes(r.id_producto))
                    .map((r) => ({ ...r, insumos: datos.insumos.find((i) => i.id_insumo === r.id_insumo) }))
        },
        insumos: {
            findMany: async ({ where = {}, orderBy } = {}) => {
                const filtrados = datos.insumos.filter((i) =>
                    (where.activo === undefined || i.activo === where.activo) &&
                    (!where.id_insumo || where.id_insumo.in.includes(i.id_insumo)));
                return orderBy ? filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre)) : filtrados;
            },
            updateMany: async ({ where, data }) => {
                const insumo = datos.insumos.find((i) => i.id_insumo === where.id_insumo);
                if (!insumo || insumo.stock_actual < where.stock_actual.gte) return { count: 0 };
                insumo.stock_actual = Math.round((insumo.stock_actual - data.stock_actual.decrement) * 100) / 100;
                return { count: 1 };
            }
        }
    };
}

/** Busca el stock actual de un insumo dentro de los datos de prueba. */
function stockDe(datos, idInsumo) {
    return datos.insumos.find((i) => i.id_insumo === idInsumo).stock_actual;
}

test('vender 1 Latte descuenta 18 g de café, 250 ml de leche y 1 vaso', async () => {
    const datos = crearDatosDePrueba();
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 1, cantidad: 1 }]);

    assert.equal(stockDe(datos, 1), 5000 - 18);
    assert.equal(stockDe(datos, 2), 20000 - 250);
    assert.equal(stockDe(datos, 3), 1000 - 1);
    assert.equal(resultado.consumos.length, 3);
    assert.deepEqual(resultado.alertas_stock, []);
});

test('vender 2 Lattes multiplica la receta por la cantidad vendida', async () => {
    const datos = crearDatosDePrueba();
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 1, cantidad: 2 }]);

    const cafe = resultado.consumos.find((c) => c.id_insumo === 1);
    assert.equal(cafe.cantidad_descontada, 36);
    assert.equal(cafe.stock_anterior, 5000);
    assert.equal(cafe.stock_nuevo, 4964);
});

test('un insumo compartido por dos productos se suma y se descuenta una sola vez', async () => {
    const datos = crearDatosDePrueba();
    // 1 Latte (250 ml de leche) + 2 Capuchinos (150 ml cada uno) = 550 ml.
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [
        { id_producto: 1, cantidad: 1 },
        { id_producto: 3, cantidad: 2 }
    ]);

    const leche = resultado.consumos.find((c) => c.id_insumo === 2);
    assert.equal(leche.cantidad_descontada, 550);
    assert.equal(leche.origen.length, 2);
    assert.equal(stockDe(datos, 2), 20000 - 550);
});

test('un producto sin receta no descuenta nada y se reporta', async () => {
    const datos = crearDatosDePrueba();
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 2, cantidad: 3 }]);

    assert.deepEqual(resultado.consumos, []);
    assert.deepEqual(resultado.productos_sin_receta, [{ id_producto: 2, nombre: 'Galleta de Chocolate' }]);
    assert.equal(stockDe(datos, 1), 5000);
});

test('si un insumo no alcanza se lanza 409, se informan todos los faltantes y no se descuenta nada', async () => {
    const datos = crearDatosDePrueba();
    datos.insumos[1].stock_actual = 100; // leche: solo 100 ml
    datos.insumos[2].stock_actual = 0;   // vasos: ninguno

    await assert.rejects(
        () => ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 1, cantidad: 1 }]),
        (error) => {
            assert.ok(error instanceof ErrorInventario);
            assert.equal(error.codigoHttp, 409);
            assert.deepEqual(error.detalle.faltantes.map((f) => f.id_insumo), [2, 3]);
            assert.equal(error.detalle.faltantes[0].cantidad_faltante, 150);
            return true;
        }
    );

    // El café sí alcanzaba, pero por la regla "todo o nada" tampoco se tocó.
    assert.equal(stockDe(datos, 1), 5000);
    assert.equal(stockDe(datos, 2), 100);
});

test('si el stock cambia entre la lectura y el descuento se lanza 409 (concurrencia)', async () => {
    const datos = crearDatosDePrueba();
    const cliente = crearClienteFalso(datos);
    // Simula que otra venta se llevó el stock justo antes del UPDATE.
    cliente.insumos.updateMany = async () => ({ count: 0 });

    await assert.rejects(
        () => ejecutarExplosion(cliente, [{ id_producto: 1, cantidad: 1 }]),
        (error) => error instanceof ErrorInventario && error.codigoHttp === 409
    );
});

test('un producto inexistente lanza 404 y uno desactivado lanza 409', async () => {
    const cliente = crearClienteFalso(crearDatosDePrueba());

    await assert.rejects(
        () => ejecutarExplosion(cliente, [{ id_producto: 99, cantidad: 1 }]),
        (error) => error.codigoHttp === 404
    );
    await assert.rejects(
        () => ejecutarExplosion(cliente, [{ id_producto: 4, cantidad: 1 }]),
        (error) => error.codigoHttp === 409
    );
});

test('después de la venta se genera alerta STOCK_BAJO cuando se llega al mínimo', async () => {
    const datos = crearDatosDePrueba();
    datos.insumos[1].stock_actual = 2200; // leche: mínimo 2000
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 1, cantidad: 1 }]);

    // 2200 - 250 = 1950, que es menor que el mínimo de 2000.
    assert.equal(resultado.alertas_stock.length, 1);
    assert.equal(resultado.alertas_stock[0].nivel, 'STOCK_BAJO');
    assert.equal(resultado.alertas_stock[0].id_insumo, 2);
    assert.equal(resultado.alertas_stock[0].faltante_para_minimo, 50);
});

test('la alerta es AGOTADO cuando el stock llega a 0', async () => {
    const datos = crearDatosDePrueba();
    datos.insumos[2].stock_actual = 1; // un solo vaso
    const resultado = await ejecutarExplosion(crearClienteFalso(datos), [{ id_producto: 1, cantidad: 1 }]);

    const alertaVaso = resultado.alertas_stock.find((a) => a.id_insumo === 3);
    assert.equal(alertaVaso.nivel, 'AGOTADO');
    assert.equal(alertaVaso.stock_actual, 0);
});

test('obtenerAlertasStock ordena AGOTADO primero e ignora insumos desactivados', async () => {
    const datos = crearDatosDePrueba();
    datos.insumos[0].stock_actual = 400;  // café: bajo el mínimo de 500
    datos.insumos[2].stock_actual = 0;    // vasos: agotado
    datos.insumos.push({ id_insumo: 4, nombre: 'Insumo retirado', unidad_medida: 'g', stock_actual: 0, stock_minimo: 10, activo: false });

    const alertas = await obtenerAlertasStock(crearClienteFalso(datos));

    assert.deepEqual(alertas.map((a) => [a.id_insumo, a.nivel]), [[3, 'AGOTADO'], [1, 'STOCK_BAJO']]);
});

test('simularExplosion no modifica el inventario e indica si alcanza', async () => {
    const datos = crearDatosDePrueba();
    const cliente = crearClienteFalso(datos);

    const alcanza = await simularExplosion(cliente, [{ id_producto: 1, cantidad: 10 }]);
    assert.equal(alcanza.alcanza_inventario, true);
    assert.equal(alcanza.consumos.find((c) => c.id_insumo === 2).stock_restante, 20000 - 2500);

    const noAlcanza = await simularExplosion(cliente, [{ id_producto: 1, cantidad: 100 }]); // 25 000 ml > 20 000 ml
    assert.equal(noAlcanza.alcanza_inventario, false);
    assert.equal(noAlcanza.faltantes[0].cantidad_faltante, 5000);

    assert.equal(stockDe(datos, 2), 20000); // nada cambió
});

test('normalizarProductosVenta rechaza datos inválidos y suma productos repetidos', () => {
    assert.throws(() => normalizarProductosVenta(undefined), ErrorInventario);
    assert.throws(() => normalizarProductosVenta([]), ErrorInventario);
    assert.throws(() => normalizarProductosVenta([{ id_producto: 1, cantidad: 0 }]), ErrorInventario);
    assert.throws(() => normalizarProductosVenta([{ id_producto: 1, cantidad: 1.5 }]), ErrorInventario);
    assert.throws(() => normalizarProductosVenta([{ id_producto: 'uno', cantidad: 1 }]), ErrorInventario);
    assert.throws(() => normalizarProductosVenta([null]), ErrorInventario);

    const consolidado = normalizarProductosVenta([
        { id_producto: 1, cantidad: 1 },
        { id_producto: 1, cantidad: 2 }
    ]);
    assert.deepEqual(consolidado, [{ id_producto: 1, cantidad: 3 }]);
});

test('listarInsumos devuelve el estado NORMAL, STOCK_BAJO o AGOTADO de cada insumo, ordenados por nombre', async () => {
    const datos = crearDatosDePrueba();
    datos.insumos[0].stock_actual = 400; // café: bajo el mínimo de 500
    datos.insumos[2].stock_actual = 0;   // vasos: agotado
    datos.insumos.push({ id_insumo: 4, nombre: 'Insumo retirado', unidad_medida: 'g', stock_actual: 5, stock_minimo: 10, activo: false });

    const insumos = await listarInsumos(crearClienteFalso(datos));

    // Orden alfabético y sin el insumo desactivado.
    assert.deepEqual(insumos.map((i) => [i.nombre, i.estado]), [
        ['Café en grano', 'STOCK_BAJO'],
        ['Leche entera', 'NORMAL'],
        ['Vaso 16oz', 'AGOTADO']
    ]);
    assert.equal(insumos[1].costo_promedio, 0.0015);
});

test('obtenerRecetas calcula el costo de la receta del Latte', async () => {
    const datos = crearDatosDePrueba();
    const [latte] = await obtenerRecetas(crearClienteFalso(datos), 1);

    assert.equal(latte.nombre, 'Latte Grande');
    assert.equal(latte.ingredientes.length, 3);
    // 18 g x 0.02 + 250 ml x 0.0015 + 1 vaso x 0.05 = 0.36 + 0.375 + 0.05
    assert.equal(latte.costo_receta, 0.785);
});

test('obtenerRecetas sin id lista solo los productos activos y lanza 404 si el id no existe', async () => {
    const cliente = crearClienteFalso(crearDatosDePrueba());

    const recetas = await obtenerRecetas(cliente);
    assert.deepEqual(recetas.map((r) => r.nombre), ['Capuchino', 'Galleta de Chocolate', 'Latte Grande']);
    // Un producto sin ingredientes devuelve la lista vacía y costo 0.
    assert.deepEqual(recetas.find((r) => r.nombre === 'Galleta de Chocolate').ingredientes, []);

    await assert.rejects(() => obtenerRecetas(cliente, 99), (error) => error.codigoHttp === 404);
    await assert.rejects(() => obtenerRecetas(cliente, 4), (error) => error.codigoHttp === 404); // desactivado
});