
--Base de datos en SQL server
--Identity(1,1) significa que el campo es autoincrementable y empieza en 1 y se incrementa de 1 en 1

create database Restaurante_Origenes_SV;
go

use Restaurante_Origenes_SV;
go

CREATE TABLE roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,-- nombre del rol
    descripcion VARCHAR(MAX)-- descripción del rol
);

CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del usuario 
    id_rol INT NOT NULL,-- identificador del rol del usuario
    nombre_completo VARCHAR(150) NOT NULL,-- nombre completo del usuario
    correo VARCHAR(150) UNIQUE NOT NULL,-- correo electrónico del usuario
    password_hash VARCHAR(255) NOT NULL,-- hash de la contraseña del usuario
    activo BIT DEFAULT 1,-- indica si el usuario está activo o no
    creado_en DATETIME DEFAULT GETDATE(),-- fecha y hora de creación del usuario
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)--muuestra a id_rol como llave foránea de la tabla roles
     ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE clientes (
    id_cliente INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del cliente
    nombre VARCHAR(150) NOT NULL,-- nombre del cliente
    dui VARCHAR(10) UNIQUE,--00000000-0
    nit VARCHAR(17) UNIQUE,--0000-000000-000-0
    nrc VARCHAR(15),--0000000000000
    telefono VARCHAR(20),-- número de teléfono del cliente
    correo VARCHAR(150),-- correo electrónico del cliente
    direccion VARCHAR(MAX),-- dirección del cliente
    creado_en DATETIME DEFAULT GETDATE()--devuelve la fecha y hora actual del sistema
);

CREATE TABLE proveedores (
    id_proveedor INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del proveedor
    nombre_empresa VARCHAR(150) NOT NULL,-- nombre de la empresa proveedora
    contacto_nombre VARCHAR(100),-- nombre del contacto del proveedor
    telefono VARCHAR(20),-- número de teléfono del proveedor
    correo VARCHAR(150),-- correo electrónico del proveedor
    direccion VARCHAR(MAX),-- dirección del proveedor
    activo BIT DEFAULT 1-- indica si el proveedor está activo o no
);

CREATE TABLE insumos (
    id_insumo INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del insumo
    nombre VARCHAR(100) NOT NULL UNIQUE,-- nombre del insumo
    unidad_medida VARCHAR(20) NOT NULL,-- unidad de medida del insumo (ej. kg, l, unidad)
    stock_actual DECIMAL(10,2) DEFAULT 0.00,-- stock actual del insumo
    stock_minimo DECIMAL(10,2) DEFAULT 0.00,-- stock mínimo del insumo
    costo_promedio DECIMAL(10,4) DEFAULT 0.0000,-- costo promedio del insumo
    activo BIT DEFAULT 1-- indica si el insumo está activo o no
);

CREATE TABLE productos (
    id_producto INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del producto
    nombre VARCHAR(150) NOT NULL,-- nombre del producto
    descripcion VARCHAR(MAX),-- descripción del producto
    precio_venta DECIMAL(10,2) NOT NULL,-- precio de venta del producto
    categoria VARCHAR(50),-- categoría del producto
    es_reventa BIT DEFAULT 0,-- indica si el producto es de reventa
    activo BIT DEFAULT 1-- indica si el producto está activo o no
);

CREATE TABLE recetas_detalle (
    id_producto INT NOT NULL,-- identificador del producto
    id_insumo INT NOT NULL,-- identificador del insumo
    cantidad_requerida DECIMAL(10,2) NOT NULL,-- cantidad requerida del insumo para el producto
    PRIMARY KEY (id_producto, id_insumo),-- clave primaria compuesta por id_producto e id_insumo
    CONSTRAINT fk_receta_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT fk_receta_insumo FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE NO ACTION
);

CREATE TABLE ventas (
    id_venta INT IDENTITY(1,1) PRIMARY KEY,-- identificador único de la venta
    id_cliente INT,-- identificador del cliente
    id_usuario INT NOT NULL,-- identificador del usuario
    fecha_hora DATETIME DEFAULT GETDATE(),-- fecha y hora de la venta
    tipo_documento VARCHAR(30) NOT NULL,-- tipo de documento de la venta
    correlativo VARCHAR(50) UNIQUE NOT NULL,-- correlativo de la venta
    subtotal DECIMAL(10,2) NOT NULL,-- subtotal de la venta
    iva DECIMAL(10,2) NOT NULL,-- IVA de la venta
    total DECIMAL(10,2) NOT NULL,-- total de la venta
    estado VARCHAR(20) DEFAULT 'Pagada',-- estado de la venta
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE NO ACTION
);

CREATE TABLE venta_detalle (
    id_venta INT NOT NULL,-- identificador de la venta
    id_producto INT NOT NULL,-- identificador del producto
    cantidad INT NOT NULL,-- cantidad vendida del producto
    precio_unitario DECIMAL(10,2) NOT NULL,-- precio unitario del producto
    subtotal_linea DECIMAL(10,2) NOT NULL,-- subtotal de la línea de venta
    PRIMARY KEY (id_venta, id_producto),-- clave primaria compuesta por id_venta e id_producto
    CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE NO ACTION
);

CREATE TABLE pagos (
    id_pago INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del pago
    id_venta INT NOT NULL,-- identificador de la venta
    metodo_pago VARCHAR(50) NOT NULL,-- método de pago
    monto DECIMAL(10,2) NOT NULL,-- monto del pago
    referencia_transaccion VARCHAR(100),-- referencia de la transacción
    fecha_pago DATETIME DEFAULT GETDATE(),-- fecha y hora del pago
    CONSTRAINT fk_pago_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE
);

CREATE TABLE cajas (
    id_caja INT IDENTITY(1,1) PRIMARY KEY,-- identificador único de la caja
    id_usuario INT NOT NULL,-- identificador del usuario
    fecha_apertura DATETIME DEFAULT GETDATE(),-- fecha y hora de apertura de la caja
    fecha_cierre DATETIME,-- fecha y hora de cierre de la caja
    monto_apertura DECIMAL(10,2) NOT NULL,-- monto de apertura de la caja
    monto_cierre_sistema DECIMAL(10,2),-- monto de cierre del sistema
    monto_cierre_fisico DECIMAL(10,2),-- monto de cierre físico
    diferencia DECIMAL(10,2),-- diferencia entre el cierre del sistema y el cierre físico
    estado VARCHAR(20) DEFAULT 'Abierta',-- estado de la caja
    CONSTRAINT fk_caja_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE NO ACTION
);

CREATE TABLE compras (
    id_compra INT IDENTITY(1,1) PRIMARY KEY,-- identificador único de la compra
    id_proveedor INT NOT NULL,-- identificador del proveedor
    fecha_compra DATETIME DEFAULT GETDATE(),-- fecha de la compra
    numero_factura_proveedor VARCHAR(50) NOT NULL,-- número de factura del proveedor
    total_compra DECIMAL(10,2) NOT NULL,-- total de la compra
    estado_pago VARCHAR(20) DEFAULT 'Pagado',-- estado del pago
    CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE NO ACTION
);

CREATE TABLE compra_detalle (
    id_compra INT NOT NULL,-- identificador de la compra
    id_insumo INT NOT NULL,-- identificador del insumo
    cantidad DECIMAL(10,2) NOT NULL,-- cantidad comprada del insumo
    costo_unitario DECIMAL(10,4) NOT NULL,-- costo unitario del insumo
    subtotal DECIMAL(10,2) NOT NULL,-- subtotal de la línea de compra
    PRIMARY KEY (id_compra, id_insumo),
    CONSTRAINT fk_compradet_compra FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
    CONSTRAINT fk_compradet_insumo FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE NO ACTION
);

CREATE TABLE empleados (
    id_empleado INT IDENTITY(1,1) PRIMARY KEY,-- identificador único del empleado
    nombre_completo VARCHAR(150) NOT NULL,-- nombre completo del empleado
    dui VARCHAR(10) UNIQUE NOT NULL,-- número de documento de identidad
    isss_numero VARCHAR(15),-- número de seguro social
    afp_numero VARCHAR(20),-- número de AFP
    cargo VARCHAR(50) NOT NULL,-- cargo del empleado
    tipo_planilla VARCHAR(20) NOT NULL,-- tipo de planilla
    salario_base DECIMAL(10,2) NOT NULL,-- salario base del empleado
    activo BIT DEFAULT 1,-- estado del empleado
    fecha_ingreso DATE NOT NULL-- fecha de ingreso del empleado
);

CREATE TABLE planillas (
    id_planilla INT IDENTITY(1,1) PRIMARY KEY,-- identificador único de la planilla
    periodo_inicio DATE NOT NULL,-- fecha de inicio del periodo
    periodo_fin DATE NOT NULL,-- fecha de fin del periodo
    tipo_planilla VARCHAR(20) NOT NULL,-- tipo de planilla
    total_pagar DECIMAL(10,2) NOT NULL,-- total a pagar
    estado VARCHAR(20) DEFAULT 'Generada'-- estado de la planilla
);

CREATE TABLE planilla_detalle (
    id_planilla INT NOT NULL,-- identificador de la planilla
    id_empleado INT NOT NULL,-- identificador del empleado
    salario_bruto DECIMAL(10,2) NOT NULL,-- salario bruto del empleado
    descuento_isss DECIMAL(10,2) NOT NULL,-- descuento de ISSS
    descuento_afp DECIMAL(10,2) NOT NULL,-- descuento de AFP
    descuento_renta DECIMAL(10,2) NOT NULL,-- descuento de renta
    salario_neto DECIMAL(10,2) NOT NULL,-- salario neto del empleado
    PRIMARY KEY (id_planilla, id_empleado),-- clave primaria compuesta por id_planilla e id_empleado
    CONSTRAINT fk_plandet_planilla FOREIGN KEY (id_planilla) REFERENCES planillas(id_planilla) ON DELETE CASCADE,
    CONSTRAINT fk_plandet_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE NO ACTION
);

-- Roles básicos
INSERT INTO roles (nombre_rol, descripcion) VALUES 
('Administrador', 'Acceso total al sistema'),
('Cajero', 'Acceso a POS y Caja'),
('Mesero', 'Toma de pedidos'),
('Cocinero', 'Vista de pedidos en cocina'),
('RRHH', 'Gestión de empleados y planilla');

-- Usuario Administrador (Password: admin123 - En producción usar bcrypt)
INSERT INTO usuarios (id_rol, nombre_completo, correo, password_hash) VALUES 
(1, 'Administrador', 'admin@origenes.com', 'admin123');

-- Productos de ejemplo (Uno fabricado, uno de reventa)
INSERT INTO productos (nombre, descripcion, precio_venta, categoria, es_reventa) VALUES 
('Latte Grande', 'Café de especialidad con leche', 3.50, 'Bebida Caliente',0),
('Galleta de Chocolate', 'Galleta empaquetada', 1.25, 'Reventa',1);

-- Insumos
INSERT INTO insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio) VALUES 
('Café en grano', 'g', 5000, 500, 0.02),
('Leche entera', 'ml', 20000, 2000, 0.0015),
('Vaso 16oz', 'unidad', 1000, 100, 0.05);

INSERT INTO recetas_detalle (id_producto, id_insumo, cantidad_requerida) VALUES 
(1, 1, 18.00), -- 18g de café
(1, 2, 250.00), -- 250ml de leche
(1, 3, 1.00);   -- 1 vaso