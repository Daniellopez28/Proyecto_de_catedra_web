SET NOCOUNT ON;
BEGIN TRANSACTION;

-- 1. Insumos nuevos (costo_promedio es por unidad de medida: por g, por ml...)
INSERT INTO insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
SELECT v.nombre, v.unidad_medida, v.stock_actual, v.stock_minimo, v.costo_promedio
FROM (VALUES
    (N'Tapadera 16oz', N'unidad', 1000, 100, 0.0300),
    (N'Viñeta', N'unidad', 2000, 200, 0.0100),
    (N'Vaso 12oz', N'unidad', 1000, 100, 0.0400),
    (N'Tapadera 12oz', N'unidad', 1000, 100, 0.0250),
    (N'Agua purificada', N'ml', 50000, 5000, 0.0002),
    (N'Hielo', N'g', 20000, 2000, 0.0005),
    (N'Chocolate en polvo', N'g', 3000, 300, 0.0120),
    (N'Jarabe de caramelo', N'ml', 2000, 200, 0.0100),
    (N'Jarabe de vainilla', N'ml', 2000, 200, 0.0100),
    (N'Concentrado de té chai', N'ml', 5000, 500, 0.0080),
    (N'Crema batida', N'g', 2000, 200, 0.0100),
    (N'Galleta de Chocolate (reventa)', N'unidad', 60, 10, 0.6000),
    (N'Botella de agua 500 ml (reventa)', N'unidad', 100, 20, 0.3500),
    (N'Barra de granola (reventa)', N'unidad', 50, 10, 0.7000)
) AS v(nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
WHERE NOT EXISTS (SELECT 1 FROM insumos i WHERE i.nombre = v.nombre);

-- 2. Productos nuevos: 11 elaborados + 2 de reventa (es_reventa: 0 = elaborado, 1 = reventa)
INSERT INTO productos (nombre, descripcion, precio_venta, categoria, es_reventa)
SELECT v.nombre, v.descripcion, v.precio_venta, v.categoria, v.es_reventa
FROM (VALUES
    (N'Latte Chico', N'Espresso con leche vaporizada, 12 oz', 2.75, N'Bebida Caliente', 0),
    (N'Capuchino Grande', N'Espresso con leche y espuma, 16 oz', 3.50, N'Bebida Caliente', 0),
    (N'Espresso Doble', N'Doble shot de café de especialidad', 2.25, N'Bebida Caliente', 0),
    (N'Americano Grande', N'Espresso con agua caliente, 16 oz', 2.75, N'Bebida Caliente', 0),
    (N'Moca Grande', N'Espresso con leche y chocolate, 16 oz', 4.00, N'Bebida Caliente', 0),
    (N'Caramel Macchiato Grande', N'Espresso con leche y jarabe de caramelo, 16 oz', 4.25, N'Bebida Caliente', 0),
    (N'Vainilla Latte Grande', N'Espresso con leche y jarabe de vainilla, 16 oz', 3.95, N'Bebida Caliente', 0),
    (N'Chocolate Caliente Grande', N'Leche caliente con chocolate, 16 oz', 3.25, N'Bebida Caliente', 0),
    (N'Chai Latte Grande', N'Té chai especiado con leche, 16 oz', 3.95, N'Bebida Caliente', 0),
    (N'Frappé de Café Grande', N'Café frío licuado con hielo y crema batida, 16 oz', 4.50, N'Bebida Fría', 0),
    (N'Cold Brew Grande', N'Café infusionado en frío con hielo, 16 oz', 3.75, N'Bebida Fría', 0),
    (N'Botella de agua 500 ml', N'Agua purificada embotellada', 1.00, N'Reventa', 1),
    (N'Barra de granola', N'Barra de granola empacada', 1.75, N'Reventa', 1)
) AS v(nombre, descripcion, precio_venta, categoria, es_reventa)
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.nombre = v.nombre);

-- 3. Recetas: cantidad que se descuenta por UNA unidad vendida, en la unidad del insumo
INSERT INTO recetas_detalle (id_producto, id_insumo, cantidad_requerida)
SELECT p.id_producto, i.id_insumo, v.cantidad_requerida
FROM (VALUES
    (N'Latte Grande', N'Tapadera 16oz', 1.00),
    (N'Latte Grande', N'Viñeta', 1.00),
    (N'Latte Chico', N'Café en grano', 12.00),
    (N'Latte Chico', N'Leche entera', 180.00),
    (N'Latte Chico', N'Vaso 12oz', 1.00),
    (N'Latte Chico', N'Tapadera 12oz', 1.00),
    (N'Latte Chico', N'Viñeta', 1.00),
    (N'Capuchino Grande', N'Café en grano', 18.00),
    (N'Capuchino Grande', N'Leche entera', 150.00),
    (N'Capuchino Grande', N'Vaso 16oz', 1.00),
    (N'Capuchino Grande', N'Tapadera 16oz', 1.00),
    (N'Capuchino Grande', N'Viñeta', 1.00),
    (N'Espresso Doble', N'Café en grano', 18.00),
    (N'Espresso Doble', N'Vaso 12oz', 1.00),
    (N'Espresso Doble', N'Tapadera 12oz', 1.00),
    (N'Espresso Doble', N'Viñeta', 1.00),
    (N'Americano Grande', N'Café en grano', 18.00),
    (N'Americano Grande', N'Agua purificada', 300.00),
    (N'Americano Grande', N'Vaso 16oz', 1.00),
    (N'Americano Grande', N'Tapadera 16oz', 1.00),
    (N'Americano Grande', N'Viñeta', 1.00),
    (N'Moca Grande', N'Café en grano', 18.00),
    (N'Moca Grande', N'Leche entera', 200.00),
    (N'Moca Grande', N'Chocolate en polvo', 25.00),
    (N'Moca Grande', N'Vaso 16oz', 1.00),
    (N'Moca Grande', N'Tapadera 16oz', 1.00),
    (N'Moca Grande', N'Viñeta', 1.00),
    (N'Caramel Macchiato Grande', N'Café en grano', 18.00),
    (N'Caramel Macchiato Grande', N'Leche entera', 220.00),
    (N'Caramel Macchiato Grande', N'Jarabe de caramelo', 30.00),
    (N'Caramel Macchiato Grande', N'Vaso 16oz', 1.00),
    (N'Caramel Macchiato Grande', N'Tapadera 16oz', 1.00),
    (N'Caramel Macchiato Grande', N'Viñeta', 1.00),
    (N'Vainilla Latte Grande', N'Café en grano', 18.00),
    (N'Vainilla Latte Grande', N'Leche entera', 220.00),
    (N'Vainilla Latte Grande', N'Jarabe de vainilla', 30.00),
    (N'Vainilla Latte Grande', N'Vaso 16oz', 1.00),
    (N'Vainilla Latte Grande', N'Tapadera 16oz', 1.00),
    (N'Vainilla Latte Grande', N'Viñeta', 1.00),
    (N'Chocolate Caliente Grande', N'Leche entera', 250.00),
    (N'Chocolate Caliente Grande', N'Chocolate en polvo', 35.00),
    (N'Chocolate Caliente Grande', N'Vaso 16oz', 1.00),
    (N'Chocolate Caliente Grande', N'Tapadera 16oz', 1.00),
    (N'Chocolate Caliente Grande', N'Viñeta', 1.00),
    (N'Chai Latte Grande', N'Concentrado de té chai', 100.00),
    (N'Chai Latte Grande', N'Leche entera', 200.00),
    (N'Chai Latte Grande', N'Vaso 16oz', 1.00),
    (N'Chai Latte Grande', N'Tapadera 16oz', 1.00),
    (N'Chai Latte Grande', N'Viñeta', 1.00),
    (N'Frappé de Café Grande', N'Café en grano', 18.00),
    (N'Frappé de Café Grande', N'Leche entera', 150.00),
    (N'Frappé de Café Grande', N'Hielo', 200.00),
    (N'Frappé de Café Grande', N'Crema batida', 20.00),
    (N'Frappé de Café Grande', N'Vaso 16oz', 1.00),
    (N'Frappé de Café Grande', N'Tapadera 16oz', 1.00),
    (N'Frappé de Café Grande', N'Viñeta', 1.00),
    (N'Cold Brew Grande', N'Café en grano', 30.00),
    (N'Cold Brew Grande', N'Agua purificada', 250.00),
    (N'Cold Brew Grande', N'Hielo', 150.00),
    (N'Cold Brew Grande', N'Vaso 16oz', 1.00),
    (N'Cold Brew Grande', N'Tapadera 16oz', 1.00),
    (N'Cold Brew Grande', N'Viñeta', 1.00),
    (N'Galleta de Chocolate', N'Galleta de Chocolate (reventa)', 1.00),
    (N'Botella de agua 500 ml', N'Botella de agua 500 ml (reventa)', 1.00),
    (N'Barra de granola', N'Barra de granola (reventa)', 1.00)
) AS v(producto, insumo, cantidad_requerida)
JOIN productos p ON p.nombre = v.producto
JOIN insumos   i ON i.nombre = v.insumo
WHERE NOT EXISTS (
    SELECT 1 FROM recetas_detalle r
    WHERE r.id_producto = p.id_producto AND r.id_insumo = i.id_insumo
);

COMMIT TRANSACTION;

-- 4. Verificación. Esperado: 12 elaborados, 3 de reventa, 0 sin receta, Latte con 5 ingredientes
SELECT
    (SELECT COUNT(*) FROM productos WHERE es_reventa = 0 AND activo = 1) AS productos_elaborados,
    (SELECT COUNT(*) FROM productos WHERE es_reventa = 1 AND activo = 1) AS productos_reventa,
    (SELECT COUNT(*) FROM productos p WHERE p.activo = 1
        AND NOT EXISTS (SELECT 1 FROM recetas_detalle r WHERE r.id_producto = p.id_producto)) AS productos_sin_receta;

SELECT p.nombre AS producto, i.nombre AS insumo, r.cantidad_requerida, i.unidad_medida
FROM recetas_detalle r
JOIN productos p ON p.id_producto = r.id_producto
JOIN insumos   i ON i.id_insumo   = r.id_insumo
WHERE p.nombre = N'Latte Grande';