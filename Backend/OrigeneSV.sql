--creamos la base de datos
--si la base ya existe (por una ejecucion anterior) se elimina y se vuelve a crear, para que el script siempre arranque desde cero
use master;
go

if db_id(N'origenesv') is not null
begin
    alter database origenesv set single_user with rollback immediate;
    drop database origenesv;
end;
go

create database origenesv;
go

use origenesv;
go

--generamos las tablas de la base de datos:
--tabla para almacenar los roles de los usuarios del sistema 
create table dbo.roles (
        id_rol int identity(1,1) not null constraint pk_roles primary key,
        nombre_rol varchar(50)  not null constraint uq_roles_nombre unique,
        descripcion varchar(max) null,
        es_administrativo bit not null constraint df_roles_es_admin default (0),
        pantalla_inicio   varchar(50) not null constraint df_roles_pantalla default ('panel_principal')
        );
go

--tablaa de sucursales, aca estan las sedes de los restaurantes
create table dbo.sucursales (
    sucursalid int identity(1,1) not null constraint pk_sucursales primary key,
    nombre varchar(100) not null constraint uq_sucursales_nombre unique,
    direccion varchar(255) not null,
    telefono varchar(20) null,
    activo bit not null constraint df_sucursales_activo default (1)
    );
go

--tabla de empleados, donde se gaurdara la ficha de el empleado (su informacion)
  create table dbo.empleados (
        id_empleado      int identity(1,1) not null constraint pk_empleados primary key,
        codigo_empleado  varchar(12)  not null constraint uq_empleados_codigo unique,
        sucursalid       int null,
        id_rol           int not null,
        nombres          varchar(100) not null,
        apellido_paterno varchar(50)  not null,
        apellido_materno varchar(50)  null,
        nombre_completo  varchar(250) not null,
        dui              varchar(10)  not null constraint uq_empleados_dui unique,
        fecha_nacimiento date not null,
        isss_numero      varchar(15)  null,
        afp_numero       varchar(20)  null,
        cargo            varchar(50)  not null,
        tipo_planilla    varchar(20)  not null,
        salario_base     decimal(10,2) not null,
        activo           bit not null constraint df_empleados_activo default (1),
        fecha_ingreso    date not null,
        correo           varchar(150) null,
        tipo_contrato    varchar(50)  null,
        jornada          varchar(50)  null,
        forma_pago       varchar(50)  null,
        constraint fk_empleados_sucursales foreign key (sucursalid) references dbo.sucursales(sucursalid),
        constraint fk_empleados_roles      foreign key (id_rol)      references dbo.roles(id_rol),
        constraint ck_empleados_salario    check (salario_base >= 0),
        constraint ck_empleados_planilla   check (tipo_planilla in ('quincenal', 'mensual'))
        );
go

--tabla de usuarios, aca estan las credenciales de ingreso o acceso
create table dbo.usuarios (
        id_usuario            int identity(1,1) not null constraint pk_usuarios primary key,
        id_rol                int not null,
        sucursalid            int null,
        id_empleado           int null,
        nombre_completo       varchar(150) not null,
        correo                varchar(150) not null constraint uq_usuarios_correo unique,
        password_hash         varchar(255) not null,
        password_salt         varchar(32)  null,
        debe_cambiar_password bit not null constraint df_usuarios_cambiar default (1),
        ultimo_acceso         datetime null,
        activo                bit not null constraint df_usuarios_activo default (1),
        creado_en             datetime not null constraint df_usuarios_creado_en default (getdate()),
        constraint fk_usuario_rol         foreign key (id_rol)      references dbo.roles(id_rol),
        constraint fk_usuarios_sucursales foreign key (sucursalid)  references dbo.sucursales(sucursalid),
        constraint fk_usuarios_empleados  foreign key (id_empleado) references dbo.empleados(id_empleado)
        );
go

--------seguimos con las tablas pero con plantillas para otras funciones--------
--tabla para almacenar las planillas de los empleados
create table dbo.planillas (
        id_planilla    int identity(1,1) not null constraint pk_planillas primary key,
        periodo_inicio date not null,
        periodo_fin    date not null,
        tipo_planilla  varchar(20) not null,
        total_pagar    decimal(10,2) not null,
        estado         varchar(20) null constraint df_planillas_estado default ('generada'),
        constraint ck_planillas_periodo check (periodo_fin >= periodo_inicio),
        constraint ck_planillas_total   check (total_pagar >= 0)
        );
go

--tabla de planilla de detalle, que guarda los detalles de cada empleado
create table dbo.planilla_detalle (
        id_planilla     int not null,
        id_empleado     int not null,
        salario_bruto   decimal(10,2) not null,
        descuento_isss  decimal(10,2) not null,
        descuento_afp   decimal(10,2) not null,
        descuento_renta decimal(10,2) not null,
        salario_neto    decimal(10,2) not null,
        constraint pk_planilla_detalle primary key (id_planilla, id_empleado),
        constraint fk_plandet_planilla foreign key (id_planilla)
            references dbo.planillas(id_planilla) on delete cascade,
        constraint fk_plandet_empleado foreign key (id_empleado)
            references dbo.empleados(id_empleado),
        constraint ck_planilla_detalle_montos check (
            salario_bruto >= 0 and descuento_isss >= 0 and descuento_afp >= 0
            and descuento_renta >= 0 and salario_neto >= 0
        )
        );
go

--------continuamos con las tablas pero ahora para otro publico--------
--tabla de clientes para guardar la informacion de los clientes
create table dbo.clientes (
        id_cliente       int identity(1,1) not null constraint pk_clientes primary key,
        nombre           varchar(150) not null,
        dui              varchar(10)  null,
        nit              varchar(17)  null,
        nrc              varchar(15)  null,
        telefono         varchar(20)  null,
        correo           varchar(150) null,
        direccion        varchar(max) null,
        giro             varchar(150) null,
        direccion_fiscal varchar(255) null,
        creado_en        datetime null constraint df_clientes_creado_en default (getdate())
        );
go

--tabla para proveedores para guardar la informacion 
create table dbo.proveedores (
        id_proveedor    int identity(1,1) not null constraint pk_proveedores primary key,
        nombre_empresa  varchar(150) not null,
        contacto_nombre varchar(100) null,
        nit             varchar(17)  null,
        telefono        varchar(20)  null,
        correo          varchar(150) null,
        direccion       varchar(max) null,
        activo          bit null constraint df_proveedores_activo default (1)
        );
go

--------ahora continuamos con las tablas de gestion de el local--------
--tabla de insumos para guaradar los insumos que se van a utilizar
create table dbo.insumos (
        id_insumo      int identity(1,1) not null constraint pk_insumos primary key,
        nombre         varchar(100) not null constraint uq_insumos_nombre unique,
        unidad_medida  varchar(20)  not null,
        stock_actual   decimal(10,2) null constraint df_insumos_stock default (0.00),
        stock_minimo   decimal(10,2) null constraint df_insumos_stock_minimo default (0.00),
        costo_promedio decimal(10,4) null constraint df_insumos_costo default (0.0000),
        activo         bit null constraint df_insumos_activo default (1),
        constraint ck_insumos_stock        check (stock_actual   is null or stock_actual   >= 0),
        constraint ck_insumos_stock_minimo check (stock_minimo   is null or stock_minimo   >= 0),
        constraint ck_insumos_costo        check (costo_promedio is null or costo_promedio >= 0)
        );
go

--tabla de gestion de productos para guardar los productos que se venden en el local
create table dbo.productos (
        id_producto  int identity(1,1) not null constraint pk_productos primary key,
        nombre       varchar(150) not null,
        descripcion  varchar(max) null,
        precio_venta decimal(10,2) not null,   -- precio con iva incluido
        categoria    varchar(50)  null,
        es_reventa   bit null constraint df_productos_es_reventa default (0),
        activo       bit null constraint df_productos_activo default (1),
        stock_actual decimal(10,2) null constraint df_productos_stock default (0.00),
        constraint ck_productos_precio check (precio_venta >= 0),
        constraint ck_productos_stock  check (stock_actual is null or stock_actual >= 0)
        );
go

--tabla de recetas a detalle de el menu, para saber los insumos que se utilizan
create table dbo.recetas_detalle (
        id_producto        int not null,
        id_insumo          int not null,
        cantidad_requerida decimal(10,2) not null,
        constraint pk_recetas_detalle primary key (id_producto, id_insumo),
        constraint fk_receta_producto foreign key (id_producto)
            references dbo.productos(id_producto) on delete cascade,
        constraint fk_receta_insumo foreign key (id_insumo)
            references dbo.insumos(id_insumo),
        constraint ck_recetas_cantidad check (cantidad_requerida > 0)
        );
go

--tabla de gestion de inventario dependiendo la sucrusal (esto puede variar en base a su sucrsal)
create table dbo.inventario_sucursal (
        inventarioid int identity(1,1) not null constraint pk_inventario_sucursal primary key,
        sucursalid   int not null,
        insumoid     int not null,
        stock_actual decimal(10,2) not null constraint df_inventario_sucursal_stock  default (0.00),
        stock_minimo decimal(10,2) not null constraint df_inventario_sucursal_minimo default (0.00),
        constraint uq_inventario_sucursal_insumo unique (sucursalid, insumoid),
        constraint fk_inventario_sucursal_sucursal foreign key (sucursalid)
            references dbo.sucursales(sucursalid),
        constraint fk_inventario_sucursal_insumo foreign key (insumoid)
            references dbo.insumos(id_insumo),
        constraint ck_inventario_sucursal_stock check (stock_actual >= 0 and stock_minimo >= 0)
        );
go

--Tabla de movimiento o historial de el inventario
create table dbo.movimientos_inventario (
        movimientoid    bigint identity(1,1) not null constraint pk_movimientos_inventario primary key,
        sucursalid      int not null,
        insumoid        int not null,
        tipo_movimiento varchar(20) not null,
        cantidad        decimal(10,2) not null,
        referencia      varchar(100) null,
        fecha           datetime2(0) not null constraint df_movimientos_inventario_fecha default (sysdatetime()),
        id_usuario      int null,
        constraint fk_movimientos_inventario_sucursal foreign key (sucursalid)
            references dbo.sucursales(sucursalid),
        constraint fk_movimientos_inventario_insumo foreign key (insumoid)
            references dbo.insumos(id_insumo),
        constraint fk_movimientos_inventario_usuario foreign key (id_usuario)
            references dbo.usuarios(id_usuario),
        constraint ck_movimientos_inventario_tipo     check (tipo_movimiento in ('entrada', 'salida', 'ajuste')),
        constraint ck_movimientos_inventario_cantidad check (cantidad > 0)
        );
go

--------tablas para los servicios de el restaurante--------
--tabla de mesas por sucrusal(esto tabien puede variar en base al tamanio de el local)
create table dbo.mesas (
        mesaid int identity(1,1) not null constraint pk_mesas primary key,
        sucursalid  int not null,
        numero_mesa varchar(20) not null,
        capacidad  int not null,
        estado varchar(20) not null constraint df_mesas_estado default ('libre'),
        constraint uq_mesas_sucursal_numero unique (sucursalid, numero_mesa),
        constraint fk_mesas_sucursal foreign key (sucursalid) references dbo.sucursales(sucursalid),
        constraint ck_mesas_capacidad check (capacidad > 0),
        constraint ck_mesas_estado    check (estado in ('libre', 'ocupada', 'reservada', 'inactiva'))
        );
go

--tabla de modificaciones de productos (si se agrega o algo un producto pasara por esta tabla)
create table dbo.modificadores (
        modificadorid int identity(1,1) not null constraint pk_modificadores primary key,
        nombre varchar(100) not null constraint uq_modificadores_nombre unique,
        precio decimal(10,2) not null,
        activo bit not null constraint df_modificadores_activo default (1),
        constraint ck_modificadores_precio check (precio >= 0)
        );
go

--------tablas dedicadas a la gestion de ventas y de pagos--------
--tabla de gestion de ventas que se realizan
create table dbo.ventas (
        id_venta        int identity(1,1) not null constraint pk_ventas primary key,
        id_cliente      int null,
        id_usuario      int not null,
        sucursalid      int null,
        mesaid          int null,
        fecha_hora      datetime null constraint df_ventas_fecha default (getdate()),
        tipo_documento  varchar(30) not null,
        correlativo     varchar(50) not null constraint uq_ventas_correlativo unique,
        subtotal        decimal(10,2) not null,
        iva             decimal(10,2) not null,
        total           decimal(10,2) not null,
        descuento       decimal(10,2) not null constraint df_ventas_descuento default (0.00),
        estado          varchar(20) null constraint df_ventas_estado default ('pagada'),
        estado_pedido   varchar(30) null constraint df_ventas_estado_pedido default ('pagado'),
        notas_generales varchar(255) null,
        constraint fk_venta_cliente  foreign key (id_cliente)
            references dbo.clientes(id_cliente) on delete set null,
        constraint fk_venta_usuario  foreign key (id_usuario) references dbo.usuarios(id_usuario),
        constraint fk_ventas_sucursal foreign key (sucursalid) references dbo.sucursales(sucursalid),
        constraint fk_ventas_mesa    foreign key (mesaid)     references dbo.mesas(mesaid),
        constraint ck_ventas_montos  check (subtotal >= 0 and iva >= 0 and total >= 0 and descuento >= 0),
        constraint ck_ventas_pedido  check (estado_pedido in ('abierto', 'en_cocina', 'servido', 'pagado', 'cancelado'))
        );
go

--tabla de los detalles de la venta
create table dbo.venta_detalle (
        id_venta        int not null,
        id_producto     int not null,
        cantidad        int not null,
        precio_unitario decimal(10,2) not null,
        subtotal_linea  decimal(10,2) not null,
        notas           varchar(255) null,
        constraint pk_venta_detalle primary key (id_venta, id_producto),
        constraint fk_detalle_venta foreign key (id_venta)
            references dbo.ventas(id_venta) on delete cascade,
        constraint fk_detalle_producto foreign key (id_producto)
            references dbo.productos(id_producto),
        constraint ck_venta_detalle_montos check (cantidad > 0 and precio_unitario >= 0 and subtotal_linea >= 0)
        );
go

--tabla por si sucede una modificacion en la venta (si se aplica algun extra que no se habia agregado previamente):
create table dbo.detalle_venta_modificadores (
        detalle_modificadoid int identity(1,1) not null constraint pk_detalle_venta_modificadores primary key,
        id_venta        int not null,
        id_producto     int not null,
        modificadorid   int not null,
        precio_aplicado decimal(10,2) not null,
        constraint fk_dvm_detalle foreign key (id_venta, id_producto)
            references dbo.venta_detalle(id_venta, id_producto) on delete cascade,
        constraint fk_dvm_modificador foreign key (modificadorid)
            references dbo.modificadores(modificadorid),
        constraint ck_dvm_precio check (precio_aplicado >= 0)
        );
go

--tabla de pago (el cobro de cada venta, si es en tarjeta o efectivo)
create table dbo.pagos (
    id_pagos               int identity(1,1) not null constraint pk_pagos primary key,
    id_venta               int not null,
    metodo_pago            varchar(50) not null,
    monto                  decimal(10,2) not null,
    referencia_transaccion varchar(100) null,
    fecha_pago             datetime null constraint df_pagos_fecha default (getdate()),
    constraint fk_pago_venta foreign key (id_venta)
        references dbo.ventas(id_venta) on delete cascade,
    constraint ck_pagos_montos check (monto > 0)
    );
go

--------continuamos con las tablas de cajas--------
--tabla de caja para la gestion de aperturas y cierres de turno de los empleados.
create table dbo.cajas (
    id_caja                int identity(1,1) not null constraint pk_cajas primary key,
    id_usuario             int not null,
    sucursalid             int null,
    nombre_caja            varchar(50) null,
    fecha_apertura         datetime null constraint df_cajas_apertura default (getdate()),
    fecha_cierre           datetime null,
    monto_apertura         decimal(10,2) not null,
    monto_cierre_sistema   decimal(10,2) null,
    monto_cierre_fisico    decimal(10,2) null,
    diferencia             decimal(10,2) null,
    estado                 varchar(20) null constraint df_cajas_estado default ('abierta'),
    observaciones_apertura varchar(255) null,
    observaciones_cierre   varchar(255) null,
    empleado_autoriza_id   int null,
    constraint fk_caja_usuario  foreign key (id_usuario)           references dbo.usuarios(id_usuario),
    constraint fk_caja_sucursal foreign key (sucursalid)           references dbo.sucursales(sucursalid),
    constraint fk_caja_autoriza foreign key (empleado_autoriza_id) references dbo.empleados(id_empleado),
    constraint ck_cajas_montos  check (monto_apertura >= 0),
    constraint ck_cajas_estado  check (estado in ('abierta', 'cerrada'))
    );
go

--tabla de movimientos de la caja, sean retiros, ingresos extra y pagos a proveedores con efectivo, esto ayuda a la gestion de cuanto ingresa y cuanto sale
create table dbo.movimientos_caja (
        movimientocajaid     bigint identity(1,1) not null constraint pk_movimientos_caja primary key,
        cajaid               int not null,
        tipo_movimiento      varchar(30) not null,
        monto                decimal(10,2) not null,
        motivo               varchar(255) null,
        empleado_autoriza_id int null,
        fecha                datetime2(0) not null constraint df_movimientos_caja_fecha default (sysdatetime()),
        constraint fk_movimientos_caja_caja foreign key (cajaid) references dbo.cajas(id_caja),
        constraint fk_movimientos_caja_empleado foreign key (empleado_autoriza_id)
            references dbo.empleados(id_empleado),
        constraint ck_movimientos_caja_tipo  check (tipo_movimiento in ('retiro', 'ingreso_extra', 'pago_proveedor')),
        constraint ck_movimientos_caja_monto check (monto > 0)
        );
go

--------continuamos con las tablas de compras, pagos a proveedores--------
--tabla de compras (es la factura para los proveedores)
    create table dbo.compras (
        id_compra                int identity(1,1) not null constraint pk_compras primary key,
        id_proveedor             int not null,
        sucursalid               int null,
        fecha_compra             datetime null constraint df_compras_fecha default (getdate()),
        numero_factura_proveedor varchar(50) not null,
        subtotal                 decimal(10,2) not null constraint df_compras_subtotal default (0.00),
        iva                      decimal(10,2) not null constraint df_compras_iva default (0.00),
        total_compra             decimal(10,2) not null,
        estado_pago              varchar(20) null constraint df_compras_estado_pago default ('pendiente'),
        fecha_vencimiento        date null,
        condicion_pago           varchar(50) null,
        clasificacion            varchar(50) null,
        estado_documento         varchar(20) null constraint df_compras_estado_documento default ('registrada'),
        constraint fk_compra_proveedor foreign key (id_proveedor) references dbo.proveedores(id_proveedor),
        constraint fk_compras_sucursal foreign key (sucursalid)   references dbo.sucursales(sucursalid),
        constraint ck_compras_montos   check (subtotal >= 0 and iva >= 0 and total_compra >= 0)
        );
go

--tabla de detalles de la compra (osea el inventario que se compro)
create table dbo.compra_detalle (
        id_compra      int not null,
        id_insumo      int not null,
        cantidad       decimal(10,2) not null,
        costo_unitario decimal(10,4) not null,
        subtotal       decimal(10,2) not null,
        constraint pk_compra_detalle primary key (id_compra, id_insumo),
        constraint fk_compradet_compra foreign key (id_compra)
            references dbo.compras(id_compra) on delete cascade,
        constraint fk_compradet_insumo foreign key (id_insumo) references dbo.insumos(id_insumo),
        constraint ck_compra_detalle_montos check (cantidad > 0 and costo_unitario >= 0 and subtotal >= 0)
        );
go

--tabla de pagos para la compra (el abono o pago de una compra dada)
create table dbo.pagos_compra (
        pagocompraid int identity(1,1) not null constraint pk_pagos_compra primary key,
        id_compra    int not null,
        monto        decimal(10,2) not null,
        metodo_pago  varchar(30) not null,
        referencia   varchar(50) null,
        fecha        datetime2(0) not null constraint df_pagos_compra_fecha default (sysdatetime()),
        id_usuario   int not null,
        constraint fk_pagos_compra_compra  foreign key (id_compra)  references dbo.compras(id_compra),
        constraint fk_pagos_compra_usuario foreign key (id_usuario) references dbo.usuarios(id_usuario),
        constraint ck_pagos_compra_monto   check (monto > 0)
        );
go


