
IF DB_ID(N'OrigeneSV') IS NULL
BEGIN
    CREATE DATABASE OrigeneSV;
END;
GO

USE OrigeneSV;
GO

/* Catalogos y acceso */
IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
        id_rol INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
        nombre_rol VARCHAR(50) NOT NULL CONSTRAINT UQ_roles_nombre UNIQUE,
        descripcion VARCHAR(MAX) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.sucursales', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sucursales (
        sucursalid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_sucursales PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL CONSTRAINT UQ_sucursales_nombre UNIQUE,
        direccion VARCHAR(255) NOT NULL,
        telefono VARCHAR(20) NULL,
        activo BIT NOT NULL CONSTRAINT DF_sucursales_activo DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios (
        id_usuario INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_usuarios PRIMARY KEY,
        id_rol INT NOT NULL,
        sucursalid INT NULL,
        nombre_completo VARCHAR(150) NOT NULL,
        correo VARCHAR(150) NOT NULL CONSTRAINT UQ_usuarios_correo UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        activo BIT NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT (1),
        creado_en DATETIME NOT NULL CONSTRAINT DF_usuarios_creado_en DEFAULT (GETDATE()),
        CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES dbo.roles(id_rol),
        CONSTRAINT FK_usuarios_sucursales FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid)
    );
END;
GO

/* Personal y planillas */
IF OBJECT_ID(N'dbo.empleados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.empleados (
        id_empleado INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_empleados PRIMARY KEY,
        sucursalid INT NULL,
        nombre_completo VARCHAR(150) NOT NULL,
        dui VARCHAR(10) NOT NULL CONSTRAINT UQ_empleados_dui UNIQUE,
        isss_numero VARCHAR(15) NULL,
        afp_numero VARCHAR(20) NULL,
        cargo VARCHAR(50) NOT NULL,
        tipo_planilla VARCHAR(20) NOT NULL,
        salario_base DECIMAL(10,2) NOT NULL,
        activo BIT NOT NULL CONSTRAINT DF_empleados_activo DEFAULT (1),
        fecha_ingreso DATE NOT NULL,
        correo VARCHAR(150) NULL,
        tipo_contrato VARCHAR(50) NULL,
        jornada VARCHAR(50) NULL,
        forma_pago VARCHAR(50) NULL,
        CONSTRAINT FK_empleados_sucursales FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT CK_empleados_salario CHECK (salario_base >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.planillas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.planillas (
        id_planilla INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_planillas PRIMARY KEY,
        periodo_inicio DATE NOT NULL,
        periodo_fin DATE NOT NULL,
        tipo_planilla VARCHAR(20) NOT NULL,
        total_pagar DECIMAL(10,2) NOT NULL,
        estado VARCHAR(20) NULL CONSTRAINT DF_planillas_estado DEFAULT ('Generada'),
        CONSTRAINT CK_planillas_periodo CHECK (periodo_fin >= periodo_inicio),
        CONSTRAINT CK_planillas_total CHECK (total_pagar >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.planilla_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.planilla_detalle (
        id_planilla INT NOT NULL,
        id_empleado INT NOT NULL,
        salario_bruto DECIMAL(10,2) NOT NULL,
        descuento_isss DECIMAL(10,2) NOT NULL,
        descuento_afp DECIMAL(10,2) NOT NULL,
        descuento_renta DECIMAL(10,2) NOT NULL,
        salario_neto DECIMAL(10,2) NOT NULL,
        CONSTRAINT PK_planilla_detalle PRIMARY KEY (id_planilla, id_empleado),
        CONSTRAINT FK_plandet_planilla FOREIGN KEY (id_planilla)
            REFERENCES dbo.planillas(id_planilla) ON DELETE CASCADE,
        CONSTRAINT FK_plandet_empleado FOREIGN KEY (id_empleado)
            REFERENCES dbo.empleados(id_empleado),
        CONSTRAINT CK_planilla_detalle_montos CHECK (
            salario_bruto >= 0 AND descuento_isss >= 0 AND descuento_afp >= 0
            AND descuento_renta >= 0 AND salario_neto >= 0
        )
    );
END;
GO

/* Clientes, proveedores, inventario y menu */
IF OBJECT_ID(N'dbo.clientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.clientes (
        id_cliente INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_clientes PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        dui VARCHAR(10) NULL CONSTRAINT UQ_clientes_dui UNIQUE,
        nit VARCHAR(17) NULL CONSTRAINT UQ_clientes_nit UNIQUE,
        nrc VARCHAR(15) NULL,
        telefono VARCHAR(20) NULL,
        correo VARCHAR(150) NULL,
        direccion VARCHAR(MAX) NULL,
        giro VARCHAR(150) NULL,
        direccion_fiscal VARCHAR(255) NULL,
        creado_en DATETIME NULL CONSTRAINT DF_clientes_creado_en DEFAULT (GETDATE())
    );
END;
GO

IF OBJECT_ID(N'dbo.proveedores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.proveedores (
        id_proveedor INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_proveedores PRIMARY KEY,
        nombre_empresa VARCHAR(150) NOT NULL,
        contacto_nombre VARCHAR(100) NULL,
        nit VARCHAR(17) NULL,
        telefono VARCHAR(20) NULL,
        correo VARCHAR(150) NULL,
        direccion VARCHAR(MAX) NULL,
        activo BIT NULL CONSTRAINT DF_proveedores_activo DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.insumos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.insumos (
        id_insumo INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_insumos PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL CONSTRAINT UQ_insumos_nombre UNIQUE,
        unidad_medida VARCHAR(20) NOT NULL,
        stock_actual DECIMAL(10,2) NULL CONSTRAINT DF_insumos_stock DEFAULT (0.00),
        stock_minimo DECIMAL(10,2) NULL CONSTRAINT DF_insumos_stock_minimo DEFAULT (0.00),
        costo_promedio DECIMAL(10,4) NULL CONSTRAINT DF_insumos_costo DEFAULT (0.0000),
        activo BIT NULL CONSTRAINT DF_insumos_activo DEFAULT (1),
        CONSTRAINT CK_insumos_stock CHECK (stock_actual IS NULL OR stock_actual >= 0),
        CONSTRAINT CK_insumos_stock_minimo CHECK (stock_minimo IS NULL OR stock_minimo >= 0),
        CONSTRAINT CK_insumos_costo CHECK (costo_promedio IS NULL OR costo_promedio >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.productos (
        id_producto INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_productos PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        descripcion VARCHAR(MAX) NULL,
        precio_venta DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(50) NULL,
        es_reventa BIT NULL CONSTRAINT DF_productos_es_reventa DEFAULT (0),
        activo BIT NULL CONSTRAINT DF_productos_activo DEFAULT (1),
        stock_actual DECIMAL(10,2) NULL CONSTRAINT DF_productos_stock DEFAULT (0.00),
        CONSTRAINT CK_productos_precio CHECK (precio_venta >= 0),
        CONSTRAINT CK_productos_stock CHECK (stock_actual IS NULL OR stock_actual >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.recetas_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.recetas_detalle (
        id_producto INT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad_requerida DECIMAL(10,2) NOT NULL,
        CONSTRAINT PK_recetas_detalle PRIMARY KEY (id_producto, id_insumo),
        CONSTRAINT FK_receta_producto FOREIGN KEY (id_producto)
            REFERENCES dbo.productos(id_producto) ON DELETE CASCADE,
        CONSTRAINT FK_receta_insumo FOREIGN KEY (id_insumo)
            REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT CK_recetas_cantidad CHECK (cantidad_requerida > 0)
    );
END;
GO

/* Existencias por sede y trazabilidad de movimientos */
IF OBJECT_ID(N'dbo.inventario_sucursal', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventario_sucursal (
        inventarioid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_inventario_sucursal PRIMARY KEY,
        sucursalid INT NOT NULL,
        insumoid INT NOT NULL,
        stock_actual DECIMAL(10,2) NOT NULL CONSTRAINT DF_inventario_sucursal_stock DEFAULT (0.00),
        stock_minimo DECIMAL(10,2) NOT NULL CONSTRAINT DF_inventario_sucursal_minimo DEFAULT (0.00),
        CONSTRAINT UQ_inventario_sucursal_insumo UNIQUE (sucursalid, insumoid),
        CONSTRAINT FK_inventario_sucursal_sucursal FOREIGN KEY (sucursalid)
            REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT FK_inventario_sucursal_insumo FOREIGN KEY (insumoid)
            REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT CK_inventario_sucursal_stock CHECK (stock_actual >= 0 AND stock_minimo >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.movimientos_inventario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_inventario (
        movimientoid BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_movimientos_inventario PRIMARY KEY,
        sucursalid INT NOT NULL,
        insumoid INT NOT NULL,
        tipo_movimiento VARCHAR(20) NOT NULL,
        cantidad DECIMAL(10,2) NOT NULL,
        referencia VARCHAR(100) NULL,
        fecha DATETIME2(0) NOT NULL CONSTRAINT DF_movimientos_inventario_fecha DEFAULT (SYSDATETIME()),
        id_usuario INT NULL,
        CONSTRAINT FK_movimientos_inventario_sucursal FOREIGN KEY (sucursalid)
            REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT FK_movimientos_inventario_insumo FOREIGN KEY (insumoid)
            REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT FK_movimientos_inventario_usuario FOREIGN KEY (id_usuario)
            REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT CK_movimientos_inventario_tipo CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
        CONSTRAINT CK_movimientos_inventario_cantidad CHECK (cantidad > 0)
    );
END;
GO

/* Servicio de salon */
IF OBJECT_ID(N'dbo.mesas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.mesas (
        mesaid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_mesas PRIMARY KEY,
        sucursalid INT NOT NULL,
        numero_mesa VARCHAR(20) NOT NULL,
        capacidad INT NOT NULL,
        estado VARCHAR(20) NOT NULL CONSTRAINT DF_mesas_estado DEFAULT ('libre'),
        CONSTRAINT UQ_mesas_sucursal_numero UNIQUE (sucursalid, numero_mesa),
        CONSTRAINT FK_mesas_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT CK_mesas_capacidad CHECK (capacidad > 0),
        CONSTRAINT CK_mesas_estado CHECK (estado IN ('libre', 'ocupada', 'reservada', 'inactiva'))
    );
END;
GO

IF OBJECT_ID(N'dbo.modificadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.modificadores (
        modificadorid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_modificadores PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL CONSTRAINT UQ_modificadores_nombre UNIQUE,
        precio DECIMAL(10,2) NOT NULL,
        activo BIT NOT NULL CONSTRAINT DF_modificadores_activo DEFAULT (1),
        CONSTRAINT CK_modificadores_precio CHECK (precio >= 0)
    );
END;
GO

/* Ventas, detalle, pagos y caja */
IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas (
        id_venta INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ventas PRIMARY KEY,
        id_cliente INT NULL,
        id_usuario INT NOT NULL,
        sucursalid INT NULL,
        mesaid INT NULL,
        fecha_hora DATETIME NULL CONSTRAINT DF_ventas_fecha DEFAULT (GETDATE()),
        tipo_documento VARCHAR(30) NOT NULL,
        correlativo VARCHAR(50) NOT NULL CONSTRAINT UQ_ventas_correlativo UNIQUE,
        subtotal DECIMAL(10,2) NOT NULL,
        iva DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        descuento DECIMAL(10,2) NOT NULL CONSTRAINT DF_ventas_descuento DEFAULT (0.00),
        estado VARCHAR(20) NULL CONSTRAINT DF_ventas_estado DEFAULT ('Pagada'),
        estado_pedido VARCHAR(30) NULL CONSTRAINT DF_ventas_estado_pedido DEFAULT ('pagado'),
        notas_generales VARCHAR(255) NULL,
        CONSTRAINT FK_venta_cliente FOREIGN KEY (id_cliente)
            REFERENCES dbo.clientes(id_cliente) ON DELETE SET NULL,
        CONSTRAINT FK_venta_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT FK_ventas_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT FK_ventas_mesa FOREIGN KEY (mesaid) REFERENCES dbo.mesas(mesaid),
        CONSTRAINT CK_ventas_montos CHECK (
            subtotal >= 0 AND iva >= 0 AND total >= 0 AND descuento >= 0
        ),
        CONSTRAINT CK_ventas_pedido CHECK (
            estado_pedido IN ('abierto', 'en_cocina', 'servido', 'pagado', 'cancelado')
        )
    );
END;
GO

IF OBJECT_ID(N'dbo.venta_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.venta_detalle (
        id_venta INT NOT NULL,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        subtotal_linea DECIMAL(10,2) NOT NULL,
        notas VARCHAR(255) NULL,
        CONSTRAINT PK_venta_detalle PRIMARY KEY (id_venta, id_producto),
        CONSTRAINT FK_detalle_venta FOREIGN KEY (id_venta)
            REFERENCES dbo.ventas(id_venta) ON DELETE CASCADE,
        CONSTRAINT FK_detalle_producto FOREIGN KEY (id_producto)
            REFERENCES dbo.productos(id_producto),
        CONSTRAINT CK_venta_detalle_montos CHECK (
            cantidad > 0 AND precio_unitario >= 0 AND subtotal_linea >= 0
        )
    );
END;
GO

IF OBJECT_ID(N'dbo.detalle_venta_modificadores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalle_venta_modificadores (
        detalle_modificadoid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_detalle_venta_modificadores PRIMARY KEY,
        id_venta INT NOT NULL,
        id_producto INT NOT NULL,
        modificadorid INT NOT NULL,
        precio_aplicado DECIMAL(10,2) NOT NULL,
        CONSTRAINT FK_dvm_detalle FOREIGN KEY (id_venta, id_producto)
            REFERENCES dbo.venta_detalle(id_venta, id_producto) ON DELETE CASCADE,
        CONSTRAINT FK_dvm_modificador FOREIGN KEY (modificadorid)
            REFERENCES dbo.modificadores(modificadorid),
        CONSTRAINT CK_dvm_precio CHECK (precio_aplicado >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.pagos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pagos (
        id_pago INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_pagos PRIMARY KEY,
        id_venta INT NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        referencia_transaccion VARCHAR(100) NULL,
        fecha_pago DATETIME NULL CONSTRAINT DF_pagos_fecha DEFAULT (GETDATE()),
        CONSTRAINT FK_pago_venta FOREIGN KEY (id_venta)
            REFERENCES dbo.ventas(id_venta) ON DELETE CASCADE,
        CONSTRAINT CK_pagos_monto CHECK (monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.cajas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajas (
        id_caja INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_cajas PRIMARY KEY,
        id_usuario INT NOT NULL,
        sucursalid INT NULL,
        nombre_caja VARCHAR(50) NULL,
        fecha_apertura DATETIME NULL CONSTRAINT DF_cajas_apertura DEFAULT (GETDATE()),
        fecha_cierre DATETIME NULL,
        monto_apertura DECIMAL(10,2) NOT NULL,
        monto_cierre_sistema DECIMAL(10,2) NULL,
        monto_cierre_fisico DECIMAL(10,2) NULL,
        diferencia DECIMAL(10,2) NULL,
        estado VARCHAR(20) NULL CONSTRAINT DF_cajas_estado DEFAULT ('Abierta'),
        observaciones_apertura VARCHAR(255) NULL,
        observaciones_cierre VARCHAR(255) NULL,
        empleado_autoriza_id INT NULL,
        CONSTRAINT FK_caja_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT FK_caja_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT FK_caja_autoriza FOREIGN KEY (empleado_autoriza_id) REFERENCES dbo.empleados(id_empleado),
        CONSTRAINT CK_cajas_montos CHECK (monto_apertura >= 0),
        CONSTRAINT CK_cajas_estado CHECK (estado IN ('Abierta', 'Cerrada'))
    );
END;
GO

IF OBJECT_ID(N'dbo.movimientos_caja', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos_caja (
        movimientocajaid BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_movimientos_caja PRIMARY KEY,
        cajaid INT NOT NULL,
        tipo_movimiento VARCHAR(30) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        motivo VARCHAR(255) NULL,
        empleado_autoriza_id INT NULL,
        fecha DATETIME2(0) NOT NULL CONSTRAINT DF_movimientos_caja_fecha DEFAULT (SYSDATETIME()),
        CONSTRAINT FK_movimientos_caja_caja FOREIGN KEY (cajaid) REFERENCES dbo.cajas(id_caja),
        CONSTRAINT FK_movimientos_caja_empleado FOREIGN KEY (empleado_autoriza_id)
            REFERENCES dbo.empleados(id_empleado),
        CONSTRAINT CK_movimientos_caja_tipo CHECK (
            tipo_movimiento IN ('retiro', 'ingreso_extra', 'pago_proveedor')
        ),
        CONSTRAINT CK_movimientos_caja_monto CHECK (monto > 0)
    );
END;
GO

/* Compras y pagos a proveedores */
IF OBJECT_ID(N'dbo.compras', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.compras (
        id_compra INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_compras PRIMARY KEY,
        id_proveedor INT NOT NULL,
        sucursalid INT NULL,
        fecha_compra DATETIME NULL CONSTRAINT DF_compras_fecha DEFAULT (GETDATE()),
        numero_factura_proveedor VARCHAR(50) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL CONSTRAINT DF_compras_subtotal DEFAULT (0.00),
        iva DECIMAL(10,2) NOT NULL CONSTRAINT DF_compras_iva DEFAULT (0.00),
        total_compra DECIMAL(10,2) NOT NULL,
        estado_pago VARCHAR(20) NULL CONSTRAINT DF_compras_estado_pago DEFAULT ('Pendiente'),
        fecha_vencimiento DATE NULL,
        condicion_pago VARCHAR(50) NULL,
        clasificacion VARCHAR(50) NULL,
        estado_documento VARCHAR(20) NULL CONSTRAINT DF_compras_estado_documento DEFAULT ('registrada'),
        CONSTRAINT FK_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES dbo.proveedores(id_proveedor),
        CONSTRAINT FK_compras_sucursal FOREIGN KEY (sucursalid) REFERENCES dbo.sucursales(sucursalid),
        CONSTRAINT CK_compras_montos CHECK (subtotal >= 0 AND iva >= 0 AND total_compra >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.compra_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.compra_detalle (
        id_compra INT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad DECIMAL(10,2) NOT NULL,
        costo_unitario DECIMAL(10,4) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        CONSTRAINT PK_compra_detalle PRIMARY KEY (id_compra, id_insumo),
        CONSTRAINT FK_compradet_compra FOREIGN KEY (id_compra)
            REFERENCES dbo.compras(id_compra) ON DELETE CASCADE,
        CONSTRAINT FK_compradet_insumo FOREIGN KEY (id_insumo) REFERENCES dbo.insumos(id_insumo),
        CONSTRAINT CK_compra_detalle_montos CHECK (cantidad > 0 AND costo_unitario >= 0 AND subtotal >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.pagos_compra', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pagos_compra (
        pagocompraid INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_pagos_compra PRIMARY KEY,
        id_compra INT NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(30) NOT NULL,
        referencia VARCHAR(50) NULL,
        fecha DATETIME2(0) NOT NULL CONSTRAINT DF_pagos_compra_fecha DEFAULT (SYSDATETIME()),
        id_usuario INT NOT NULL,
        CONSTRAINT FK_pagos_compra_compra FOREIGN KEY (id_compra) REFERENCES dbo.compras(id_compra),
        CONSTRAINT FK_pagos_compra_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT CK_pagos_compra_monto CHECK (monto > 0)
    );
END;
GO

/* Indices para consultas frecuentes y reglas que dependen de periodos */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_planillas_periodo_tipo' AND object_id = OBJECT_ID(N'dbo.planillas')
)
BEGIN
    CREATE UNIQUE INDEX UX_planillas_periodo_tipo
        ON dbo.planillas(tipo_planilla, periodo_inicio, periodo_fin);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ventas_fecha_sucursal' AND object_id = OBJECT_ID(N'dbo.ventas')
)
BEGIN
    CREATE INDEX IX_ventas_fecha_sucursal ON dbo.ventas(sucursalid, fecha_hora);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_movimientos_inventario_insumo_fecha'
      AND object_id = OBJECT_ID(N'dbo.movimientos_inventario')
)
BEGIN
    CREATE INDEX IX_movimientos_inventario_insumo_fecha
        ON dbo.movimientos_inventario(insumoid, fecha DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_cajas_una_abierta_por_sucursal'
      AND object_id = OBJECT_ID(N'dbo.cajas')
)
BEGIN
    CREATE UNIQUE INDEX UX_cajas_una_abierta_por_sucursal
        ON dbo.cajas(sucursalid)
        WHERE estado = 'Abierta' AND sucursalid IS NOT NULL;
END;
GO

/* Datos de referencia: no se inserta ningun usuario ni contrasena predeterminada. */
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre_rol = 'Administrador')
    INSERT INTO dbo.roles (nombre_rol, descripcion)
    VALUES ('Administrador', 'Administracion del sistema');
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre_rol = 'Cajero')
    INSERT INTO dbo.roles (nombre_rol, descripcion)
    VALUES ('Cajero', 'Ventas y operaciones de caja');
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre_rol = 'Mesero')
    INSERT INTO dbo.roles (nombre_rol, descripcion)
    VALUES ('Mesero', 'Pedidos y atencion en salon');
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre_rol = 'Cocinero')
    INSERT INTO dbo.roles (nombre_rol, descripcion)
    VALUES ('Cocinero', 'Consulta y preparacion de pedidos');
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre_rol = 'RRHH')
    INSERT INTO dbo.roles (nombre_rol, descripcion)
    VALUES ('RRHH', 'Personal y planillas');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.sucursales WHERE nombre = 'Casa Matriz')
    INSERT INTO dbo.sucursales (nombre, direccion) VALUES ('Casa Matriz', 'Direccion pendiente');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE nombre = 'Cafe en grano')
    INSERT INTO dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
    VALUES ('Cafe en grano', 'g', 5000, 500, 0.0200);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE nombre = 'Leche entera')
    INSERT INTO dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
    VALUES ('Leche entera', 'ml', 20000, 2000, 0.0015);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE nombre = 'Vaso 16oz')
    INSERT INTO dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
    VALUES ('Vaso 16oz', 'unidad', 1000, 100, 0.0500);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE nombre = 'Galleta de chocolate para reventa')
    INSERT INTO dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
    VALUES ('Galleta de chocolate para reventa', 'unidad', 60, 10, 0.6000);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.productos WHERE nombre = 'Latte Grande')
    INSERT INTO dbo.productos (nombre, descripcion, precio_venta, categoria, es_reventa)
    VALUES ('Latte Grande', 'Cafe con leche', 3.50, 'Bebida Caliente', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.productos WHERE nombre = 'Galleta de Chocolate')
    INSERT INTO dbo.productos (nombre, descripcion, precio_venta, categoria, es_reventa)
    VALUES ('Galleta de Chocolate', 'Producto empacado de reventa', 1.25, 'Reventa', 1);
GO

INSERT INTO dbo.recetas_detalle (id_producto, id_insumo, cantidad_requerida)
SELECT p.id_producto, i.id_insumo, r.cantidad
FROM (VALUES
    ('Latte Grande', 'Cafe en grano', CAST(18.00 AS DECIMAL(10,2))),
    ('Latte Grande', 'Leche entera', CAST(250.00 AS DECIMAL(10,2))),
    ('Latte Grande', 'Vaso 16oz', CAST(1.00 AS DECIMAL(10,2))),
    ('Galleta de Chocolate', 'Galleta de chocolate para reventa', CAST(1.00 AS DECIMAL(10,2)))
) AS r(producto, insumo, cantidad)
JOIN dbo.productos p ON p.nombre = r.producto
JOIN dbo.insumos i ON i.nombre = r.insumo
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.recetas_detalle rd
    WHERE rd.id_producto = p.id_producto AND rd.id_insumo = i.id_insumo
);
GO

/* Inicializa el saldo por sucursal para los insumos de ejemplo. */
INSERT INTO dbo.inventario_sucursal (sucursalid, insumoid, stock_actual, stock_minimo)
SELECT s.sucursalid, i.id_insumo, i.stock_actual, i.stock_minimo
FROM dbo.sucursales s
CROSS JOIN dbo.insumos i
WHERE s.nombre = 'Casa Matriz'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.inventario_sucursal x
      WHERE x.sucursalid = s.sucursalid AND x.insumoid = i.id_insumo
  );
GO

/* Vistas de consulta */
CREATE OR ALTER VIEW dbo.v_reporte_alertas_stock
AS
    SELECT id_insumo, nombre AS insumo, unidad_medida, stock_actual, stock_minimo,
           CASE WHEN stock_minimo > stock_actual THEN stock_minimo - stock_actual ELSE 0 END AS cantidad_faltante
    FROM dbo.insumos
    WHERE activo = 1 AND stock_actual <= stock_minimo;
GO

CREATE OR ALTER VIEW dbo.v_reporte_ventas_sucursal
AS
    SELECT COALESCE(s.nombre, 'Sin sucursal') AS sucursal,
           v.tipo_documento,
           COUNT_BIG(*) AS cantidad_ventas,
           SUM(v.subtotal) AS total_subtotal,
           SUM(v.iva) AS total_iva,
           SUM(v.total) AS total_facturado
    FROM dbo.ventas v
    LEFT JOIN dbo.sucursales s ON s.sucursalid = v.sucursalid
    GROUP BY COALESCE(s.nombre, 'Sin sucursal'), v.tipo_documento;
GO

CREATE OR ALTER VIEW dbo.v_reporte_planilla
AS
    SELECT pl.id_planilla, pl.periodo_inicio, pl.periodo_fin, pl.estado,
           e.id_empleado, e.nombre_completo, e.cargo,
           pd.salario_bruto, pd.descuento_isss, pd.descuento_afp,
           pd.descuento_renta, pd.salario_neto
    FROM dbo.planilla_detalle pd
    JOIN dbo.planillas pl ON pl.id_planilla = pd.id_planilla
    JOIN dbo.empleados e ON e.id_empleado = pd.id_empleado;
GO

/* Comprobacion basica de que las tablas principales existen. */
SELECT N'OrigeneSV' AS base_datos,
       (SELECT COUNT(*) FROM dbo.roles) AS roles,
       (SELECT COUNT(*) FROM dbo.sucursales) AS sucursales,
       (SELECT COUNT(*) FROM dbo.insumos) AS insumos,
       (SELECT COUNT(*) FROM dbo.productos) AS productos;
GO


--Para el que quiera ver los distintos uesuarios que hay 
USE OrigeneSV;
SELECT id_usuario, correo, password_hash, activo FROM dbo.usuarios;