/*
  Migration for the existing OrigeneSV database.
  Safe to review before running: creates missing objects and adds missing
  nullable columns; it does not drop tables or delete existing rows.
*/
-- CORRECCIÓN: completa el esquema y los catálogos de roles/permisos sin ejecutarse automáticamente.
USE [OrigeneSV];
GO

CREATE OR ALTER FUNCTION dbo.fn_hash_password
(
    @password varchar(100),
    @salt varchar(32)
)
RETURNS varchar(64)
AS
BEGIN
    RETURN CONVERT(varchar(64), HASHBYTES('SHA2_256', @salt + @password), 2);
END;
GO

IF OBJECT_ID(N'dbo.proveedores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.proveedores (
        id_proveedor int IDENTITY(1,1) NOT NULL CONSTRAINT pk_proveedores PRIMARY KEY,
        nombre_empresa varchar(150) NOT NULL,
        contacto_nombre varchar(100) NULL,
        nit varchar(17) NULL,
        telefono varchar(20) NULL,
        correo varchar(150) NULL,
        direccion varchar(max) NULL,
        activo bit NULL CONSTRAINT df_proveedores_activo DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.insumos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.insumos (
        id_insumo int IDENTITY(1,1) NOT NULL CONSTRAINT pk_insumos PRIMARY KEY,
        nombre varchar(100) NOT NULL CONSTRAINT uq_insumos_nombre UNIQUE,
        unidad_medida varchar(20) NOT NULL,
        stock_actual decimal(10,2) NULL CONSTRAINT df_insumos_stock DEFAULT (0),
        stock_minimo decimal(10,2) NULL CONSTRAINT df_insumos_stock_minimo DEFAULT (0),
        costo_promedio decimal(10,4) NULL CONSTRAINT df_insumos_costo DEFAULT (0),
        activo bit NULL CONSTRAINT df_insumos_activo DEFAULT (1),
        CONSTRAINT ck_insumos_stock CHECK (stock_actual IS NULL OR stock_actual >= 0),
        CONSTRAINT ck_insumos_stock_minimo CHECK (stock_minimo IS NULL OR stock_minimo >= 0),
        CONSTRAINT ck_insumos_costo CHECK (costo_promedio IS NULL OR costo_promedio >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.productos (
        id_producto int IDENTITY(1,1) NOT NULL CONSTRAINT pk_productos PRIMARY KEY,
        nombre varchar(150) NOT NULL,
        descripcion varchar(max) NULL,
        precio_venta decimal(10,2) NOT NULL,
        categoria varchar(50) NULL,
        es_reventa bit NULL CONSTRAINT df_productos_es_reventa DEFAULT (0),
        activo bit NULL CONSTRAINT df_productos_activo DEFAULT (1),
        stock_actual decimal(10,2) NULL CONSTRAINT df_productos_stock DEFAULT (0),
        CONSTRAINT ck_productos_precio CHECK (precio_venta >= 0),
        CONSTRAINT ck_productos_stock CHECK (stock_actual IS NULL OR stock_actual >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.niveles_acceso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.niveles_acceso (
        id_nivel int IDENTITY(1,1) NOT NULL CONSTRAINT pk_niveles_acceso PRIMARY KEY,
        codigo varchar(20) NOT NULL CONSTRAINT uq_niveles_acceso_codigo UNIQUE,
        descripcion varchar(255) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.permisos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.permisos (
        id_permiso int IDENTITY(1,1) NOT NULL CONSTRAINT pk_permisos PRIMARY KEY,
        codigo varchar(50) NOT NULL CONSTRAINT uq_permisos_codigo UNIQUE,
        descripcion varchar(255) NULL
    );
END;
GO

IF COL_LENGTH(N'dbo.roles', N'id_nivel') IS NULL
    ALTER TABLE dbo.roles ADD id_nivel int NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.roles') AND name = N'es_administrativo')
    ALTER TABLE dbo.roles ADD es_administrativo bit NOT NULL CONSTRAINT df_roles_es_admin_fix DEFAULT (0);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.roles') AND name = N'pantalla_inicio')
    ALTER TABLE dbo.roles ADD pantalla_inicio varchar(50) NOT NULL CONSTRAINT df_roles_pantalla_fix DEFAULT ('panel_principal');
GO

INSERT INTO dbo.niveles_acceso (codigo, descripcion)
SELECT v.codigo, v.descripcion
FROM (VALUES
    ('administrador', 'Acceso administrativo'),
    ('gerente', 'Operaciones y administración de sucursal'),
    ('empleado', 'Operaciones asignadas al empleado'),
    ('cliente', 'Consulta de menú y reservas')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.niveles_acceso n WHERE n.codigo = v.codigo);
GO

INSERT INTO dbo.roles (nombre_rol, descripcion, es_administrativo, pantalla_inicio, id_nivel)
SELECT v.nombre, v.descripcion, v.es_administrativo, v.pantalla_inicio, n.id_nivel
FROM (VALUES
    ('administrador', 'Administración del sistema', 1, 'panel_principal', 'administrador'),
    ('rrhh', 'Personal y planillas', 1, 'empleados', 'gerente'),
    ('cajero', 'Ventas y operaciones de caja', 0, 'caja', 'empleado'),
    ('mesero', 'Pedidos y atención en salón', 0, 'toma_pedidos', 'empleado'),
    ('cocinero', 'Consulta y preparación de pedidos', 0, 'cocina', 'empleado'),
    ('gerente', 'Operaciones y administración de sucursal', 1, 'panel_gerente', 'gerente'),
    ('cliente', 'Consulta del menú y reservas', 0, 'menu_reservas', 'cliente')
) AS v(nombre, descripcion, es_administrativo, pantalla_inicio, nivel)
JOIN dbo.niveles_acceso n ON n.codigo = v.nivel
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles r WHERE r.nombre_rol = v.nombre);
GO

UPDATE r
SET id_nivel = n.id_nivel
FROM dbo.roles r
JOIN (VALUES
    ('administrador', 'administrador'),
    ('gerente', 'gerente'),
    ('rrhh', 'gerente'),
    ('cajero', 'empleado'),
    ('mesero', 'empleado'),
    ('cocinero', 'empleado'),
    ('cliente', 'cliente')
) AS m(rol, nivel) ON m.rol = r.nombre_rol
JOIN dbo.niveles_acceso n ON n.codigo = m.nivel
WHERE r.id_nivel IS NULL;

UPDATE r
SET id_nivel = n.id_nivel
FROM dbo.roles r
CROSS JOIN dbo.niveles_acceso n
WHERE r.id_nivel IS NULL AND n.codigo = 'empleado';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id_nivel IS NULL)
    ALTER TABLE dbo.roles ALTER COLUMN id_nivel int NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'fk_roles_nivel')
    ALTER TABLE dbo.roles ADD CONSTRAINT fk_roles_nivel
        FOREIGN KEY (id_nivel) REFERENCES dbo.niveles_acceso(id_nivel);
GO

IF OBJECT_ID(N'dbo.nivel_permiso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.nivel_permiso (
        id_nivel int NOT NULL,
        id_permiso int NOT NULL,
        CONSTRAINT pk_nivel_permiso PRIMARY KEY (id_nivel, id_permiso),
        CONSTRAINT fk_nivel_permiso_nivel FOREIGN KEY (id_nivel)
            REFERENCES dbo.niveles_acceso(id_nivel) ON DELETE CASCADE,
        CONSTRAINT fk_nivel_permiso_permiso FOREIGN KEY (id_permiso)
            REFERENCES dbo.permisos(id_permiso) ON DELETE CASCADE
    );
END;
GO

INSERT INTO dbo.permisos (codigo, descripcion)
SELECT v.codigo, v.descripcion
FROM (VALUES
    ('ver_menu', 'Consultar el menú de productos'),
    ('ver_reservas_disponibles', 'Consultar disponibilidad de reservas'),
    ('ver_mis_reservas', 'Consultar reservas propias'),
    ('ver_mi_perfil', 'Consultar los datos propios'),
    ('ver_reservas', 'Consultar reservas de la sucursal'),
    ('ver_mesas', 'Consultar el estado de las mesas'),
    ('tomar_pedidos', 'Registrar pedidos en salón'),
    ('ver_pedidos_cocina', 'Consultar pedidos pendientes'),
    ('ver_mi_ficha', 'Consultar la ficha laboral propia'),
    ('ver_mi_planilla', 'Consultar la planilla propia'),
    ('gestionar_reservas', 'Crear y administrar reservas'),
    ('ver_empleados', 'Consultar empleados'),
    ('registrar_empleados', 'Registrar empleados'),
    ('ver_planillas', 'Consultar planillas'),
    ('generar_planillas', 'Generar planillas'),
    ('ver_inventario', 'Consultar inventario'),
    ('gestionar_inventario', 'Administrar inventario'),
    ('ver_compras', 'Consultar compras'),
    ('registrar_compras', 'Registrar compras'),
    ('ver_proveedores', 'Consultar proveedores'),
    ('ver_ventas', 'Consultar ventas'),
    ('operar_caja', 'Operar caja'),
    ('ver_reportes', 'Consultar reportes'),
    ('gestionar_productos', 'Administrar productos y recetas'),
    ('gestionar_usuarios', 'Administrar usuarios'),
    ('gestionar_sucursales', 'Administrar sucursales'),
    ('gestionar_roles_permisos', 'Administrar roles y permisos')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.permisos p WHERE p.codigo = v.codigo);

INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
SELECT n.id_nivel, p.id_permiso
FROM (VALUES
    ('cliente', 'ver_menu'), ('cliente', 'ver_reservas_disponibles'),
    ('cliente', 'ver_mis_reservas'), ('cliente', 'ver_mi_perfil'),
    ('empleado', 'ver_menu'), ('empleado', 'ver_reservas_disponibles'),
    ('empleado', 'ver_reservas'), ('empleado', 'ver_mesas'),
    ('empleado', 'tomar_pedidos'), ('empleado', 'ver_pedidos_cocina'),
    ('empleado', 'ver_mi_ficha'), ('empleado', 'ver_mi_planilla'),
    ('empleado', 'ver_mi_perfil'),
    ('gerente', 'gestionar_reservas'), ('gerente', 'ver_empleados'),
    ('gerente', 'registrar_empleados'), ('gerente', 'ver_planillas'),
    ('gerente', 'generar_planillas'), ('gerente', 'ver_inventario'),
    ('gerente', 'gestionar_inventario'), ('gerente', 'ver_compras'),
    ('gerente', 'registrar_compras'), ('gerente', 'ver_proveedores'),
    ('gerente', 'ver_ventas'), ('gerente', 'operar_caja'),
    ('gerente', 'ver_reportes'), ('gerente', 'gestionar_productos')
) AS v(nivel, permiso)
JOIN dbo.niveles_acceso n ON n.codigo = v.nivel
JOIN dbo.permisos p ON p.codigo = v.permiso
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.nivel_permiso x
    WHERE x.id_nivel = n.id_nivel AND x.id_permiso = p.id_permiso
);

INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
SELECT gerente.id_nivel, empleado_permiso.id_permiso
FROM dbo.niveles_acceso gerente
JOIN dbo.niveles_acceso empleado ON empleado.codigo = 'empleado'
JOIN dbo.nivel_permiso empleado_permiso ON empleado_permiso.id_nivel = empleado.id_nivel
WHERE gerente.codigo = 'gerente'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.nivel_permiso x
      WHERE x.id_nivel = gerente.id_nivel AND x.id_permiso = empleado_permiso.id_permiso
  );

INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
SELECT administrador.id_nivel, permiso.id_permiso
FROM dbo.niveles_acceso administrador
CROSS JOIN dbo.permisos permiso
WHERE administrador.codigo = 'administrador'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.nivel_permiso x
      WHERE x.id_nivel = administrador.id_nivel AND x.id_permiso = permiso.id_permiso
  );
GO

IF COL_LENGTH(N'dbo.usuarios', N'id_cliente') IS NULL
    ALTER TABLE dbo.usuarios ADD id_cliente int NULL;
IF COL_LENGTH(N'dbo.usuarios', N'password_salt') IS NULL
    ALTER TABLE dbo.usuarios ADD password_salt varchar(32) NULL;
IF COL_LENGTH(N'dbo.usuarios', N'debe_cambiar_password') IS NULL
    ALTER TABLE dbo.usuarios ADD debe_cambiar_password bit NOT NULL
        CONSTRAINT df_usuarios_cambiar_fix DEFAULT (1);
IF COL_LENGTH(N'dbo.usuarios', N'ultimo_acceso') IS NULL
    ALTER TABLE dbo.usuarios ADD ultimo_acceso datetime NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'fk_usuarios_clientes')
    ALTER TABLE dbo.usuarios ADD CONSTRAINT fk_usuarios_clientes
        FOREIGN KEY (id_cliente) REFERENCES dbo.clientes(id_cliente);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'ck_usuarios_un_solo_origen')
    ALTER TABLE dbo.usuarios ADD CONSTRAINT ck_usuarios_un_solo_origen
        CHECK (id_empleado IS NULL OR id_cliente IS NULL);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_usuarios_cliente' AND object_id = OBJECT_ID(N'dbo.usuarios'))
    CREATE UNIQUE INDEX ux_usuarios_cliente ON dbo.usuarios(id_cliente) WHERE id_cliente IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.recetas_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.recetas_detalle (
        id_producto int NOT NULL,
        id_insumo int NOT NULL,
        cantidad_requerida decimal(10,2) NOT NULL,
        CONSTRAINT pk_recetas_detalle PRIMARY KEY (id_producto, id_insumo),
        CONSTRAINT fk_receta_producto FOREIGN KEY (id_producto) REFERENCES dbo.productos(id_producto) ON DELETE CASCADE,
        CONSTRAINT fk_receta_insumo FOREIGN KEY (id_insumo) REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT ck_recetas_cantidad CHECK (cantidad_requerida > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.inventario_sucursal', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventario_sucursal (
        inventarioid int IDENTITY(1,1) NOT NULL CONSTRAINT pk_inventario_sucursal PRIMARY KEY,
        sucursalid int NOT NULL,
        insumoid int NOT NULL,
        stock_actual decimal(10,2) NOT NULL CONSTRAINT df_inventario_sucursal_stock DEFAULT (0),
        stock_minimo decimal(10,2) NOT NULL CONSTRAINT df_inventario_sucursal_minimo DEFAULT (0),
        CONSTRAINT uq_inventario_sucursal_insumo UNIQUE (sucursalid, insumoid),
        CONSTRAINT fk_inventario_sucursal_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT fk_inventario_sucursal_insumo FOREIGN KEY (insumoid) REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT ck_inventario_sucursal_stock CHECK (stock_actual >= 0 AND stock_minimo >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.movimientos_inventario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_inventario (
        movimientoid bigint IDENTITY(1,1) NOT NULL CONSTRAINT pk_movimientos_inventario PRIMARY KEY,
        sucursalid int NOT NULL,
        insumoid int NOT NULL,
        tipo_movimiento varchar(20) NOT NULL,
        cantidad decimal(10,2) NOT NULL,
        referencia varchar(100) NULL,
        fecha datetime2(0) NOT NULL CONSTRAINT df_movimientos_inventario_fecha DEFAULT (sysdatetime()),
        id_usuario int NULL,
        CONSTRAINT fk_movimientos_inventario_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT fk_movimientos_inventario_insumo FOREIGN KEY (insumoid) REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT fk_movimientos_inventario_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT ck_movimientos_inventario_tipo CHECK (tipo_movimiento IN ('entrada','salida','ajuste')),
        CONSTRAINT ck_movimientos_inventario_cantidad CHECK (cantidad > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.mesas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.mesas (
        mesaid int IDENTITY(1,1) NOT NULL CONSTRAINT pk_mesas PRIMARY KEY,
        sucursalid int NOT NULL,
        numero_mesa varchar(20) NOT NULL,
        capacidad int NOT NULL,
        estado varchar(20) NOT NULL CONSTRAINT df_mesas_estado DEFAULT ('libre'),
        CONSTRAINT uq_mesas_sucursal_numero UNIQUE (sucursalid, numero_mesa),
        CONSTRAINT fk_mesas_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT ck_mesas_capacidad CHECK (capacidad > 0),
        CONSTRAINT ck_mesas_estado CHECK (estado IN ('libre','ocupada','reservada','inactiva'))
    );
END;
GO

IF OBJECT_ID(N'dbo.modificadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.modificadores (
        modificadorid int IDENTITY(1,1) NOT NULL CONSTRAINT pk_modificadores PRIMARY KEY,
        nombre varchar(100) NOT NULL CONSTRAINT uq_modificadores_nombre UNIQUE,
        precio decimal(10,2) NOT NULL,
        activo bit NOT NULL CONSTRAINT df_modificadores_activo DEFAULT (1),
        CONSTRAINT ck_modificadores_precio CHECK (precio >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas (
        id_venta int IDENTITY(1,1) NOT NULL CONSTRAINT pk_ventas PRIMARY KEY,
        id_cliente int NULL,
        id_usuario int NOT NULL,
        sucursalid int NULL,
        mesaid int NULL,
        fecha_hora datetime NULL CONSTRAINT df_ventas_fecha DEFAULT (getdate()),
        tipo_documento varchar(30) NOT NULL,
        correlativo varchar(50) NOT NULL CONSTRAINT uq_ventas_correlativo UNIQUE,
        subtotal decimal(10,2) NOT NULL,
        iva decimal(10,2) NOT NULL,
        total decimal(10,2) NOT NULL,
        descuento decimal(10,2) NOT NULL CONSTRAINT df_ventas_descuento DEFAULT (0),
        estado varchar(20) NULL CONSTRAINT df_ventas_estado DEFAULT ('pagada'),
        estado_pedido varchar(30) NULL CONSTRAINT df_ventas_estado_pedido DEFAULT ('pagado'),
        notas_generales varchar(255) NULL,
        CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.clientes(id_cliente) ON DELETE SET NULL,
        CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT fk_ventas_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT fk_ventas_mesa FOREIGN KEY (mesaid) REFERENCES dbo.mesas(mesaid),
        CONSTRAINT ck_ventas_montos CHECK (subtotal >= 0 AND iva >= 0 AND total >= 0 AND descuento >= 0),
        CONSTRAINT ck_ventas_pedido CHECK (estado_pedido IN ('abierto','en_cocina','servido','pagado','cancelado'))
    );
END;
GO

IF OBJECT_ID(N'dbo.venta_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.venta_detalle (
        id_venta int NOT NULL,
        id_producto int NOT NULL,
        cantidad int NOT NULL,
        precio_unitario decimal(10,2) NOT NULL,
        subtotal_linea decimal(10,2) NOT NULL,
        notas varchar(255) NULL,
        CONSTRAINT pk_venta_detalle PRIMARY KEY (id_venta, id_producto),
        CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES dbo.ventas(id_venta) ON DELETE CASCADE,
        CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES dbo.productos(id_producto),
        CONSTRAINT ck_venta_detalle_montos CHECK (cantidad > 0 AND precio_unitario >= 0 AND subtotal_linea >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.detalle_venta_modificadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalle_venta_modificadores (
        detalle_modificadoid int IDENTITY(1,1) NOT NULL CONSTRAINT pk_detalle_venta_modificadores PRIMARY KEY,
        id_venta int NOT NULL,
        id_producto int NOT NULL,
        modificadorid int NOT NULL,
        precio_aplicado decimal(10,2) NOT NULL,
        CONSTRAINT fk_dvm_detalle FOREIGN KEY (id_venta, id_producto)
            REFERENCES dbo.venta_detalle(id_venta, id_producto) ON DELETE CASCADE,
        CONSTRAINT fk_dvm_modificador FOREIGN KEY (modificadorid) REFERENCES dbo.modificadores(modificadorid),
        CONSTRAINT ck_dvm_precio CHECK (precio_aplicado >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.pagos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pagos (
        id_pagos int IDENTITY(1,1) NOT NULL CONSTRAINT pk_pagos PRIMARY KEY,
        id_venta int NOT NULL,
        metodo_pago varchar(50) NOT NULL,
        monto decimal(10,2) NOT NULL,
        referencia_transaccion varchar(100) NULL,
        fecha_pago datetime NULL CONSTRAINT df_pagos_fecha DEFAULT (getdate()),
        CONSTRAINT fk_pago_venta FOREIGN KEY (id_venta) REFERENCES dbo.ventas(id_venta) ON DELETE CASCADE,
        CONSTRAINT ck_pagos_montos CHECK (monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.cajas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajas (
        id_caja int IDENTITY(1,1) NOT NULL CONSTRAINT pk_cajas PRIMARY KEY,
        id_usuario int NOT NULL,
        sucursalid int NULL,
        nombre_caja varchar(50) NULL,
        fecha_apertura datetime NULL CONSTRAINT df_cajas_apertura DEFAULT (getdate()),
        fecha_cierre datetime NULL,
        monto_apertura decimal(10,2) NOT NULL,
        monto_cierre_sistema decimal(10,2) NULL,
        monto_cierre_fisico decimal(10,2) NULL,
        diferencia decimal(10,2) NULL,
        estado varchar(20) NULL CONSTRAINT df_cajas_estado DEFAULT ('abierta'),
        observaciones_apertura varchar(255) NULL,
        observaciones_cierre varchar(255) NULL,
        empleado_autoriza_id int NULL,
        CONSTRAINT fk_caja_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT fk_caja_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT fk_caja_autoriza FOREIGN KEY (empleado_autoriza_id) REFERENCES dbo.empleados(id_empleado),
        CONSTRAINT ck_cajas_montos CHECK (monto_apertura >= 0),
        CONSTRAINT ck_cajas_estado CHECK (estado IN ('abierta','cerrada'))
    );
END;
GO

IF OBJECT_ID(N'dbo.movimientos_caja', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_caja (
        movimientocajaid bigint IDENTITY(1,1) NOT NULL CONSTRAINT pk_movimientos_caja PRIMARY KEY,
        cajaid int NOT NULL,
        tipo_movimiento varchar(30) NOT NULL,
        monto decimal(10,2) NOT NULL,
        motivo varchar(255) NULL,
        empleado_autoriza_id int NULL,
        fecha datetime2(0) NOT NULL CONSTRAINT df_movimientos_caja_fecha DEFAULT (sysdatetime()),
        CONSTRAINT fk_movimientos_caja_caja FOREIGN KEY (cajaid) REFERENCES dbo.cajas(id_caja),
        CONSTRAINT fk_movimientos_caja_empleado FOREIGN KEY (empleado_autoriza_id) REFERENCES dbo.empleados(id_empleado),
        CONSTRAINT ck_movimientos_caja_tipo CHECK (tipo_movimiento IN ('retiro','ingreso_extra','pago_proveedor')),
        CONSTRAINT ck_movimientos_caja_monto CHECK (monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.compras', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.compras (
        id_compra int IDENTITY(1,1) NOT NULL CONSTRAINT pk_compras PRIMARY KEY,
        id_proveedor int NOT NULL,
        sucursalid int NULL,
        fecha_compra datetime NULL CONSTRAINT df_compras_fecha DEFAULT (getdate()),
        numero_factura_proveedor varchar(50) NOT NULL,
        subtotal decimal(10,2) NOT NULL CONSTRAINT df_compras_subtotal DEFAULT (0),
        iva decimal(10,2) NOT NULL CONSTRAINT df_compras_iva DEFAULT (0),
        total_compra decimal(10,2) NOT NULL,
        estado_pago varchar(20) NULL CONSTRAINT df_compras_estado_pago DEFAULT ('pendiente'),
        fecha_vencimiento date NULL,
        condicion_pago varchar(50) NULL,
        clasificacion varchar(50) NULL,
        estado_documento varchar(20) NULL CONSTRAINT df_compras_estado_documento DEFAULT ('registrada'),
        CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES dbo.proveedores(id_proveedor),
        CONSTRAINT fk_compras_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT ck_compras_montos CHECK (subtotal >= 0 AND iva >= 0 AND total_compra >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.compra_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.compra_detalle (
        id_compra int NOT NULL,
        id_insumo int NOT NULL,
        cantidad decimal(10,2) NOT NULL,
        costo_unitario decimal(10,4) NOT NULL,
        subtotal decimal(10,2) NOT NULL,
        CONSTRAINT pk_compra_detalle PRIMARY KEY (id_compra, id_insumo),
        CONSTRAINT fk_compradet_compra FOREIGN KEY (id_compra) REFERENCES dbo.compras(id_compra) ON DELETE CASCADE,
        CONSTRAINT fk_compradet_insumo FOREIGN KEY (id_insumo) REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT ck_compra_detalle_montos CHECK (cantidad > 0 AND costo_unitario >= 0 AND subtotal >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.pagos_compra', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pagos_compra (
        pagocompraid int IDENTITY(1,1) NOT NULL CONSTRAINT pk_pagos_compra PRIMARY KEY,
        id_compra int NOT NULL,
        monto decimal(10,2) NOT NULL,
        metodo_pago varchar(30) NOT NULL,
        referencia varchar(50) NULL,
        fecha datetime2(0) NOT NULL CONSTRAINT df_pagos_compra_fecha DEFAULT (sysdatetime()),
        id_usuario int NOT NULL,
        CONSTRAINT fk_pagos_compra_compra FOREIGN KEY (id_compra) REFERENCES dbo.compras(id_compra),
        CONSTRAINT fk_pagos_compra_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT ck_pagos_compra_monto CHECK (monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.reservas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.reservas (
        id_reserva int IDENTITY(1,1) NOT NULL CONSTRAINT pk_reservas PRIMARY KEY,
        mesaid int NOT NULL,
        id_cliente int NOT NULL,
        fecha_hora_inicio datetime2(0) NOT NULL,
        duracion_minutos int NOT NULL CONSTRAINT df_reservas_duracion DEFAULT (90),
        cantidad_personas int NOT NULL,
        estado varchar(20) NOT NULL CONSTRAINT df_reservas_estado DEFAULT ('pendiente'),
        notas varchar(255) NULL,
        creada_en datetime NOT NULL CONSTRAINT df_reservas_creada_en DEFAULT (getdate()),
        CONSTRAINT fk_reservas_mesa FOREIGN KEY (mesaid) REFERENCES dbo.mesas(mesaid),
        CONSTRAINT fk_reservas_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.clientes(id_cliente),
        CONSTRAINT ck_reservas_estado CHECK (estado IN ('pendiente','confirmada','cancelada','completada')),
        CONSTRAINT ck_reservas_personas CHECK (cantidad_personas > 0),
        CONSTRAINT ck_reservas_duracion CHECK (duracion_minutos BETWEEN 30 AND 480)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_planillas_periodo_tipo' AND object_id = OBJECT_ID(N'dbo.planillas'))
    CREATE UNIQUE INDEX ux_planillas_periodo_tipo ON dbo.planillas(tipo_planilla, periodo_inicio, periodo_fin);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_ventas_fecha_sucursal' AND object_id = OBJECT_ID(N'dbo.ventas'))
    CREATE INDEX ix_ventas_fecha_sucursal ON dbo.ventas(sucursalid, fecha_hora);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_movimientos_inventario_insumo_fecha' AND object_id = OBJECT_ID(N'dbo.movimientos_inventario'))
    CREATE INDEX ix_movimientos_inventario_insumo_fecha ON dbo.movimientos_inventario(insumoid, fecha DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_cajas_una_abierta_por_sucursal' AND object_id = OBJECT_ID(N'dbo.cajas'))
    CREATE UNIQUE INDEX ux_cajas_una_abierta_por_sucursal ON dbo.cajas(sucursalid)
        WHERE estado = 'abierta' AND sucursalid IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_usuarios_empleado' AND object_id = OBJECT_ID(N'dbo.usuarios'))
    CREATE UNIQUE INDEX ux_usuarios_empleado ON dbo.usuarios(id_empleado) WHERE id_empleado IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_clientes_dui' AND object_id = OBJECT_ID(N'dbo.clientes'))
    CREATE UNIQUE INDEX ux_clientes_dui ON dbo.clientes(dui) WHERE dui IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_clientes_nit' AND object_id = OBJECT_ID(N'dbo.clientes'))
    CREATE UNIQUE INDEX ux_clientes_nit ON dbo.clientes(nit) WHERE nit IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_usuarios_cliente' AND object_id = OBJECT_ID(N'dbo.usuarios'))
    CREATE UNIQUE INDEX ux_usuarios_cliente ON dbo.usuarios(id_cliente) WHERE id_cliente IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_reservas_mesa_fecha' AND object_id = OBJECT_ID(N'dbo.reservas'))
    CREATE INDEX ix_reservas_mesa_fecha ON dbo.reservas(mesaid, fecha_hora_inicio);
GO

/* Preserve the current global balances as the initial central-branch balances. */
INSERT INTO dbo.inventario_sucursal (sucursalid, insumoid, stock_actual, stock_minimo)
SELECT s.sucursalid, i.id_insumo, COALESCE(i.stock_actual, 0), COALESCE(i.stock_minimo, 0)
FROM dbo.sucursales s
CROSS JOIN dbo.insumos i
WHERE s.nombre = 'casa matriz'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.inventario_sucursal x
      WHERE x.sucursalid = s.sucursalid AND x.insumoid = i.id_insumo
  );
GO
