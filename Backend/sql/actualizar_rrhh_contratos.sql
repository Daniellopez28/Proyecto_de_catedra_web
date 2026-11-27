USE [origenesv];

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.empleados', 'fecha_fin_contrato') IS NULL
    ALTER TABLE dbo.empleados ADD fecha_fin_contrato date NULL;
IF COL_LENGTH('dbo.clientes', 'apellido') IS NULL
    ALTER TABLE dbo.clientes ADD apellido varchar(100) NULL;
IF COL_LENGTH('dbo.productos', 'imagen') IS NULL
    ALTER TABLE dbo.productos ADD imagen varbinary(max) NULL;
IF COL_LENGTH('dbo.productos', 'imagen_mime') IS NULL
    ALTER TABLE dbo.productos ADD imagen_mime varchar(50) NULL;
IF COL_LENGTH('dbo.ventas', 'nombre_cliente') IS NULL
    ALTER TABLE dbo.ventas ADD nombre_cliente varchar(150) NULL;

UPDATE v
SET nombre_cliente = LEFT(LTRIM(RTRIM(CONCAT(c.nombre, ' ', c.apellido))), 150)
FROM dbo.ventas v
JOIN dbo.clientes c ON c.id_cliente = v.id_cliente
WHERE v.nombre_cliente IS NULL;

INSERT INTO dbo.niveles_acceso (codigo, descripcion)
SELECT v.codigo, v.descripcion
FROM (VALUES
    ('rrhh', 'Gestiona personal y planillas en todas las sucursales'),
    ('cajero', 'Toma pedidos, consulta reservas y opera caja'),
    ('mesero', 'Toma pedidos y gestiona reservas'),
    ('cocinero', 'Toma pedidos y consulta la cola de cocina'),
    ('barista', 'Toma pedidos y consulta menu, mesas y reservas'),
    ('contabilidad', 'Consulta caja y planillas'),
    ('compras', 'Gestiona compras, proveedores e inventario')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.niveles_acceso n WHERE n.codigo = v.codigo);

INSERT INTO dbo.permisos (codigo, descripcion)
SELECT v.codigo, v.descripcion
FROM (VALUES
    ('gestionar_empleados_todas_sucursales', 'Gestiona empleados de cualquier sucursal'),
    ('ver_caja', 'Consulta caja y sus movimientos sin modificarla'),
    ('editar_planillas', 'Edita detalles de planillas no pagadas')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.permisos p WHERE p.codigo = v.codigo);

INSERT INTO dbo.roles (nombre_rol, descripcion, es_administrativo, pantalla_inicio, id_nivel)
SELECT v.nombre, v.descripcion, 0, v.pantalla, n.id_nivel
FROM (VALUES
    ('barista', 'Toma pedidos y prepara bebidas', 'toma_pedidos'),
    ('contabilidad', 'Consulta caja y planillas', 'caja'),
    ('compras', 'Compras, proveedores e inventario', 'compras')
) AS v(nombre, descripcion, pantalla)
JOIN dbo.niveles_acceso n ON n.codigo = v.nombre
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles r WHERE r.nombre_rol = v.nombre);

UPDATE r
SET r.id_nivel = n.id_nivel,
    r.es_administrativo = CASE WHEN r.nombre_rol = 'administrador' THEN 1 ELSE 0 END
FROM dbo.roles r
JOIN dbo.niveles_acceso n ON n.codigo = r.nombre_rol
WHERE r.nombre_rol IN ('rrhh', 'cajero', 'mesero', 'cocinero', 'barista', 'contabilidad', 'compras');

IF (SELECT COUNT(*) FROM dbo.roles
    WHERE nombre_rol IN ('rrhh', 'cajero', 'mesero', 'cocinero', 'barista', 'contabilidad', 'compras')) <> 7
    THROW 50031, 'Falta uno o mas roles requeridos para aplicar la migracion.', 1;

DELETE np
FROM dbo.nivel_permiso np
JOIN dbo.niveles_acceso n ON n.id_nivel = np.id_nivel
WHERE n.codigo IN ('rrhh', 'cajero', 'mesero', 'cocinero', 'barista', 'contabilidad', 'compras', 'cliente');

DELETE np
FROM dbo.nivel_permiso np
JOIN dbo.permisos p ON p.id_permiso = np.id_permiso
WHERE p.codigo IN ('ver_mi_perfil', 'ver_mis_reservas');
DELETE FROM dbo.permisos WHERE codigo IN ('ver_mi_perfil', 'ver_mis_reservas');
UPDATE dbo.usuarios SET activo = 0 WHERE id_cliente IS NOT NULL AND activo = 1;

DECLARE @permisosNivel table (nivel varchar(20), permiso varchar(50));
INSERT INTO @permisosNivel (nivel, permiso) VALUES
    ('rrhh', 'ver_empleados'),
    ('rrhh', 'registrar_empleados'),
    ('rrhh', 'gestionar_empleados_todas_sucursales'),
    ('rrhh', 'ver_planillas'),
    ('rrhh', 'generar_planillas'),
    ('rrhh', 'editar_planillas'),
    ('rrhh', 'ver_mi_ficha'),
    ('rrhh', 'ver_mi_planilla'),
    ('cajero', 'ver_menu'),
    ('cajero', 'ver_mesas'),
    ('cajero', 'ver_reservas'),
    ('cajero', 'ver_reservas_disponibles'),
    ('cajero', 'gestionar_reservas'),
    ('cajero', 'tomar_pedidos'),
    ('cajero', 'ver_ventas'),
    ('cajero', 'operar_caja'),
    ('cajero', 'ver_mi_ficha'),
    ('cajero', 'ver_mi_planilla'),
    ('mesero', 'ver_menu'),
    ('mesero', 'ver_reservas'),
    ('mesero', 'ver_reservas_disponibles'),
    ('mesero', 'gestionar_reservas'),
    ('mesero', 'ver_mesas'),
    ('mesero', 'tomar_pedidos'),
    ('mesero', 'ver_mi_ficha'),
    ('mesero', 'ver_mi_planilla'),
    ('cocinero', 'ver_menu'),
    ('cocinero', 'ver_reservas'),
    ('cocinero', 'ver_reservas_disponibles'),
    ('cocinero', 'ver_mesas'),
    ('cocinero', 'tomar_pedidos'),
    ('cocinero', 'ver_pedidos_cocina'),
    ('cocinero', 'ver_mi_ficha'),
    ('cocinero', 'ver_mi_planilla'),
    ('barista', 'ver_menu'),
    ('barista', 'ver_reservas'),
    ('barista', 'ver_reservas_disponibles'),
    ('barista', 'ver_mesas'),
    ('barista', 'tomar_pedidos'),
    ('barista', 'ver_pedidos_cocina'),
    ('barista', 'ver_mi_ficha'),
    ('barista', 'ver_mi_planilla'),
    ('contabilidad', 'ver_caja'),
    ('contabilidad', 'ver_planillas'),
    ('contabilidad', 'ver_mi_ficha'),
    ('contabilidad', 'ver_mi_planilla'),
    ('compras', 'ver_menu'),
    ('compras', 'ver_inventario'),
    ('compras', 'gestionar_inventario'),
    ('compras', 'ver_compras'),
    ('compras', 'registrar_compras'),
    ('compras', 'ver_proveedores'),
    ('compras', 'ver_mi_ficha'),
    ('compras', 'ver_mi_planilla');

IF EXISTS (
    SELECT 1
    FROM @permisosNivel pn
    LEFT JOIN dbo.niveles_acceso n ON n.codigo = pn.nivel
    LEFT JOIN dbo.permisos p ON p.codigo = pn.permiso
    WHERE n.id_nivel IS NULL OR p.id_permiso IS NULL
)
    THROW 50032, 'Faltan niveles o permisos necesarios para configurar los roles.', 1;

INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
SELECT n.id_nivel, p.id_permiso
FROM @permisosNivel pn
JOIN dbo.niveles_acceso n ON n.codigo = pn.nivel
JOIN dbo.permisos p ON p.codigo = pn.permiso;

INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
SELECT n.id_nivel, p.id_permiso
FROM dbo.niveles_acceso n
CROSS JOIN dbo.permisos p
WHERE n.codigo = 'administrador'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.nivel_permiso np
      WHERE np.id_nivel = n.id_nivel AND np.id_permiso = p.id_permiso
  );

IF OBJECT_ID('dbo.sp_login_cliente', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_login_cliente;
IF OBJECT_ID('dbo.sp_registrar_cliente_usuario', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_registrar_cliente_usuario;

-- Mantiene la vista de empleados alineada con la columna nueva de contratos.
EXEC sys.sp_executesql N'
CREATE OR ALTER VIEW dbo.v_empleados_detalle
AS
    SELECT e.id_empleado,
           e.codigo_empleado,
           e.nombre_completo,
           e.cargo,
           r.nombre_rol AS rol,
           s.nombre AS sucursal,
           e.activo,
           e.tipo_contrato,
           e.jornada,
           e.forma_pago,
           e.tipo_planilla,
           e.salario_base,
           e.fecha_ingreso,
           e.fecha_fin_contrato,
           e.isss_numero,
           e.afp_numero,
           u.correo AS correo_login,
           u.ultimo_acceso
    FROM dbo.empleados e
    JOIN dbo.roles r ON r.id_rol = e.id_rol
    LEFT JOIN dbo.sucursales s ON s.sucursalid = e.sucursalid
    LEFT JOIN dbo.usuarios u ON u.id_empleado = e.id_empleado;
';

COMMIT TRANSACTION;


