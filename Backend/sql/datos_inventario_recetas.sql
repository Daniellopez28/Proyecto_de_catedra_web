--Este .sql lo usamos para poblar la base de datos de una forma rapida.
SET NOCOUNT ON;
BEGIN TRANSACTION;

--Insumos nuevos, para datos iniciales.
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

--Productos nuevos, para datos iniciales
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

