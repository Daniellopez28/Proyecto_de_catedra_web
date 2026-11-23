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
