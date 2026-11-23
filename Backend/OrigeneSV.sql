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

--------desarrollo de indices para encontrar datos especificos, los dejare comentados para que funciona cada uno--------
--ajustes de sesion requeridos para crear indices filtrados
set ansi_nulls on; --Este es para comparar valores nulos en los indices
set ansi_padding on; --este es para rellenar valores nulos
set ansi_warnings on; --Este es para mostrar advertencias de ANSI para optimizar consultas
set arithabort on; --Este es para abortas las consultas si hay errores
set concat_null_yields_null on; --este para concatenar valores nulos en los indices
set quoted_identifier on; --este es para permitir el uso de identificadores 
set numeric_roundabort off; --este para evitar errores de redondeo en los indices

--indice planilla por tipo y periordo (este busca ecitar generar dos veces la misma)
if not exists (
    select 1
    from sys.indexes
    where name = N'ux_planillas_periodo_tipo'
      and object_id = object_id(N'dbo.planillas')
)
    create unique index ux_planillas_periodo_tipo
    on dbo.planillas (tipo_planilla, periodo_inicio, periodo_fin);
go

--indice que acelera reportes de ventas por sucursal (enetrega la sucursal y la fecha en la que se realiza)
if not exists (
    select 1
    from sys.indexes
    where name = N'ix_ventas_fecha_sucursal'
      and object_id = object_id(N'dbo.ventas')
)
    create index ix_ventas_fecha_sucursal
    on dbo.ventas (sucursalid, fecha_hora);
go

--indice que acelera el historial de movimientos de un insumo
if not exists (
    select 1
    from sys.indexes
    where name = N'ix_movimientos_inventario_insumo_fecha'
      and object_id = object_id(N'dbo.movimientos_inventario')
)
    create index ix_movimientos_inventario_insumo_fecha
    on dbo.movimientos_inventario (insumoid, fecha desc);
go

--indice que sa una caja por sucursal (esto significa que solo puede haber una sesion de caja abierta por sucursal)
if not exists (
    select 1
    from sys.indexes
    where name = N'ux_cajas_una_abierta_por_sucursal'
      and object_id = object_id(N'dbo.cajas')
)
    create unique index ux_cajas_una_abierta_por_sucursal
    on dbo.cajas (sucursalid)
        where estado = 'abierta' and sucursalid is not null;
go

--indice de empleado que tiene solo un usuario (este busca de que un empleado tiene un usuario y ya, no mas para evitar duplicidad)
if not exists (
    select 1
    from sys.indexes
    where name = N'ux_usuarios_empleado'
      and object_id = object_id(N'dbo.usuarios')
)
    create unique index ux_usuarios_empleado
    on dbo.usuarios (id_empleado)
        where id_empleado is not null;
go

--indice de dui y nit , evita duplicidad (no pueden haber dos usuarios con el mismo dui o nit)
if not exists (
    select 1
    from sys.indexes
    where name = N'ux_clientes_dui'
      and object_id = object_id(N'dbo.clientes')
)
    create unique index ux_clientes_dui
    on dbo.clientes (dui)
        where dui is not null;
go

if not exists (
    select 1
    from sys.indexes
    where name = N'ux_clientes_nit'
      and object_id = object_id(N'dbo.clientes')
)
    create unique index ux_clientes_nit
    on dbo.clientes (nit)
        where nit is not null;
go

--------Niveles de acceso y permisos--------
create table dbo.niveles_acceso (
    id_nivel    int identity(1,1) not null constraint pk_niveles_acceso primary key,
    codigo      varchar(20)  not null constraint uq_niveles_acceso_codigo unique,  -- administrador | gerente | empleado | cliente
    descripcion varchar(255) null
);
go

--permisos: cada accion que se puede controlar (ej. ver_menu, generar_planillas)
create table dbo.permisos (
    id_permiso  int identity(1,1) not null constraint pk_permisos primary key,
    codigo      varchar(50)  not null constraint uq_permisos_codigo unique,
    descripcion varchar(255) null
);
go

--nivel_permiso: que permisos tiene cada nivel
create table dbo.nivel_permiso (
    id_nivel   int not null,
    id_permiso int not null,
    constraint pk_nivel_permiso primary key (id_nivel, id_permiso),
    constraint fk_nivel_permiso_nivel   foreign key (id_nivel)   references dbo.niveles_acceso(id_nivel) on delete cascade,
    constraint fk_nivel_permiso_permiso foreign key (id_permiso) references dbo.permisos(id_permiso)     on delete cascade
);
go

--roles: cada rol de puesto pertenece a un nivel (columna nueva, se llena mas abajo con el update de roles)
alter table dbo.roles add id_nivel int null;
go

alter table dbo.roles add constraint fk_roles_nivel foreign key (id_nivel) references dbo.niveles_acceso(id_nivel);
go

--usuarios: un cliente tambien tiene cuenta (columna nueva id_cliente). una cuenta es de un empleado o de un cliente, nunca de ambos
alter table dbo.usuarios add id_cliente int null;
go

alter table dbo.usuarios add constraint fk_usuarios_clientes foreign key (id_cliente) references dbo.clientes(id_cliente);
alter table dbo.usuarios add constraint ck_usuarios_un_solo_origen check (id_empleado is null or id_cliente is null);
go

--un cliente tiene una sola cuenta (filtrado: permite varios usuarios sin cliente)
if not exists (select 1 from sys.indexes where name = N'ux_usuarios_cliente' and object_id = object_id(N'dbo.usuarios'))
    create unique index ux_usuarios_cliente on dbo.usuarios (id_cliente) where id_cliente is not null;
go

--reservas: necesaria para que el cliente y el empleado puedan consultar reservas
create table dbo.reservas (
    id_reserva        int identity(1,1) not null constraint pk_reservas primary key,
    mesaid            int not null,                  -- la sucursal se obtiene de la mesa
    id_cliente        int not null,
    fecha_hora_inicio datetime2(0) not null,
    duracion_minutos  int not null constraint df_reservas_duracion default (90),
    cantidad_personas int not null,
    estado            varchar(20) not null constraint df_reservas_estado default ('pendiente'),
    notas             varchar(255) null,
    creada_en         datetime not null constraint df_reservas_creada_en default (getdate()),
    constraint fk_reservas_mesa    foreign key (mesaid)     references dbo.mesas(mesaid),
    constraint fk_reservas_cliente foreign key (id_cliente) references dbo.clientes(id_cliente),
    constraint ck_reservas_estado    check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada')),
    constraint ck_reservas_personas  check (cantidad_personas > 0),
    constraint ck_reservas_duracion  check (duracion_minutos between 30 and 480)
);
go

--acelera la busqueda de disponibilidad por mesa y hora
if not exists (select 1 from sys.indexes where name = N'ix_reservas_mesa_fecha' and object_id = object_id(N'dbo.reservas'))
    create index ix_reservas_mesa_fecha on dbo.reservas (mesaid, fecha_hora_inicio);
go

--------seccion de datos de referencias--------
--rol de pantalla_inicio, para que lso roles tengan la pantalla de inicio
insert into dbo.roles (nombre_rol, descripcion, es_administrativo, pantalla_inicio)
select v.nombre, v.descripcion, v.es_admin, v.pantalla
from (values
    ('administrador', 'administracion del sistema',            1, 'panel_principal'),
    ('rrhh',          'personal y planillas',                  1, 'empleados'),
    ('cajero',        'ventas y operaciones de caja',          0, 'caja'),
    ('mesero',        'pedidos y atencion en salon',           0, 'toma_pedidos'),
    ('cocinero',      'consulta y preparacion de pedidos',     0, 'cocina')
) as v(nombre, descripcion, es_admin, pantalla)
where not exists (select 1 from dbo.roles r where r.nombre_rol = v.nombre);
go

--Sucursales, son 3, escalon, mejicanos y santa elena 
insert into dbo.sucursales (nombre, direccion)
select v.nombre, 'direccion pendiente'
from (values ('escalon'), ('mejicanos'), ('santa elena')) as v(nombre)
where not exists (select 1 from dbo.sucursales s where s.nombre = v.nombre);
go

--Insumos, estos son los que usaremos para el menu
insert into dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
select v.nombre, v.unidad, v.stock, v.minimo, v.costo
from (values
    ('cafe en grano',                     'g',      5000, 500,  0.0200),
    ('leche entera',                      'ml',    20000, 2000, 0.0015),
    ('vaso 16oz',                         'unidad', 1000, 100,  0.0500),
    ('galleta de chocolate para reventa', 'unidad',   60, 10,   0.6000)
) as v(nombre, unidad, stock, minimo, costo)
where not exists (select 1 from dbo.insumos i where i.nombre = v.nombre);
go

--Productos de el menu
insert into dbo.productos (nombre, descripcion, precio_venta, categoria, es_reventa)
select v.nombre, v.descripcion, v.precio, v.categoria, v.reventa
from (values
    ('latte grande',         'cafe con leche',              3.50, 'bebida caliente', 0),
    ('galleta de chocolate', 'producto empacado de reventa', 1.25, 'reventa',         1)
) as v(nombre, descripcion, precio, categoria, reventa)
where not exists (select 1 from dbo.productos p where p.nombre = v.nombre);
go

--Recetas y su consumo
insert into dbo.recetas_detalle (id_producto, id_insumo, cantidad_requerida)
select p.id_producto, i.id_insumo, r.cantidad
from (values
    ('latte grande',         'cafe en grano',                     cast(18.00  as decimal(10,2))),
    ('latte grande',         'leche entera',                      cast(250.00 as decimal(10,2))),
    ('latte grande',         'vaso 16oz',                         cast(1.00   as decimal(10,2))),
    ('galleta de chocolate', 'galleta de chocolate para reventa', cast(1.00   as decimal(10,2)))
) as r(producto, insumo, cantidad)
join dbo.productos p on p.nombre = r.producto
join dbo.insumos   i on i.nombre = r.insumo
where not exists (
    select 1
    from dbo.recetas_detalle rd
    where rd.id_producto = p.id_producto
      and rd.id_insumo   = i.id_insumo
);
go

--Saldo inicial de el inventario por sucursal
insert into dbo.inventario_sucursal (sucursalid, insumoid, stock_actual, stock_minimo)
select s.sucursalid, i.id_insumo, i.stock_actual, i.stock_minimo
from dbo.sucursales s
cross join dbo.insumos i
where s.nombre = 'escalon'
  and not exists (
      select 1
      from dbo.inventario_sucursal x
      where x.sucursalid = s.sucursalid
        and x.insumoid   = i.id_insumo
  );
go

--Los niveles de acceso con sus permisos y desc
insert into dbo.niveles_acceso (codigo, descripcion)
select v.codigo, v.descripcion
from (values
    ('administrador', 'puede ver y hacer todo en el sistema'),
    ('gerente',       'hace las tareas de gerente: operacion, compras, inventario, personal y reportes'),
    ('empleado',      've reservas y lo relacionado a su trabajo y su propia informacion'),
    ('cliente',       'solo ve el menu, las reservas disponibles y sus propias reservas')
) as v(codigo, descripcion)
where not exists (select 1 from dbo.niveles_acceso n where n.codigo = v.codigo);
go

--catalogo de permisos (para agregar uno nuevo: insertarlo aqui y asignarlo a un nivel mas abajo)
insert into dbo.permisos (codigo, descripcion)
select v.codigo, v.descripcion
from (values

    --lo que puede ver un cliente
    ('ver_menu',                 'consultar el menu de productos'),
    ('ver_reservas_disponibles', 'consultar mesas y horarios disponibles para reservar'),
    ('ver_mis_reservas',         'ver las reservas propias del cliente'),
    ('ver_mi_perfil',            'ver los datos propios de la cuenta'),

    --lo que puede hacer un empleado
    ('ver_reservas',             'ver todas las reservas de la sucursal'),
    ('ver_mesas',                'ver el estado de las mesas'),
    ('tomar_pedidos',            'registrar pedidos en salon'),
    ('ver_pedidos_cocina',       'ver los pedidos pendientes en cocina'),
    ('ver_mi_ficha',             'ver la ficha laboral propia'),
    ('ver_mi_planilla',          'ver la planilla o boleta propia'),

    --lo que puede hacer un gerente (ademas de lo del empleado)
    ('gestionar_reservas',       'crear, confirmar y cancelar reservas'),
    ('ver_empleados',            'ver el listado y las fichas de los empleados'),
    ('registrar_empleados',      'registrar nuevos empleados'),
    ('ver_planillas',            'ver las planillas generadas'),
    ('generar_planillas',        'generar la planilla de un periodo'),
    ('ver_inventario',           'ver el inventario de insumos'),
    ('gestionar_inventario',     'ajustar y administrar el inventario'),
    ('ver_compras',              'ver las compras a proveedores'),
    ('registrar_compras',        'registrar compras a proveedores'),
    ('ver_proveedores',          'ver el listado de proveedores'),
    ('ver_ventas',               'ver las ventas realizadas'),
    ('operar_caja',              'abrir y cerrar caja y registrar movimientos'),
    ('ver_reportes',             'ver los reportes del negocio'),
    ('gestionar_productos',      'crear y editar productos del menu y sus recetas'),

    --solo el administrador
    ('gestionar_usuarios',       'crear, desactivar y administrar cuentas de usuario'),
    ('gestionar_sucursales',     'crear y editar sucursales'),
    ('gestionar_roles_permisos', 'administrar roles, niveles y permisos')
) as v(codigo, descripcion)
where not exists (select 1 from dbo.permisos p where p.codigo = v.codigo);
go

--permisos del cliente (usuario normal): solo ver menu, reservas disponibles y lo suyo
--(para que el cliente tambien pueda reservar, crear un permiso 'crear_reserva' y asignarlo aqui)
insert into dbo.nivel_permiso (id_nivel, id_permiso)
select n.id_nivel, p.id_permiso
from (values
    ('cliente', 'ver_menu'),
    ('cliente', 'ver_reservas_disponibles'),
    ('cliente', 'ver_mis_reservas'),
    ('cliente', 'ver_mi_perfil')
) as v(nivel, permiso)
join dbo.niveles_acceso n on n.codigo = v.nivel
join dbo.permisos       p on p.codigo = v.permiso
where not exists (select 1 from dbo.nivel_permiso x where x.id_nivel = n.id_nivel and x.id_permiso = p.id_permiso);
go

--permisos del empleado: ver reservas y cosas relacionadas a el empleado
insert into dbo.nivel_permiso (id_nivel, id_permiso)
select n.id_nivel, p.id_permiso
from (values
    ('empleado', 'ver_menu'),
    ('empleado', 'ver_reservas_disponibles'),
    ('empleado', 'ver_reservas'),
    ('empleado', 'ver_mesas'),
    ('empleado', 'tomar_pedidos'),
    ('empleado', 'ver_pedidos_cocina'),
    ('empleado', 'ver_mi_ficha'),
    ('empleado', 'ver_mi_planilla'),
    ('empleado', 'ver_mi_perfil')
) as v(nivel, permiso)
join dbo.niveles_acceso n on n.codigo = v.nivel
join dbo.permisos       p on p.codigo = v.permiso
where not exists (select 1 from dbo.nivel_permiso x where x.id_nivel = n.id_nivel and x.id_permiso = p.id_permiso);
go

--permisos del gerente: todo lo del empleado (se hereda) mas las cosas de gerente
insert into dbo.nivel_permiso (id_nivel, id_permiso)
select g.id_nivel, np.id_permiso
from dbo.niveles_acceso g
join dbo.niveles_acceso e  on e.codigo = 'empleado'
join dbo.nivel_permiso  np on np.id_nivel = e.id_nivel
where g.codigo = 'gerente'
  and not exists (select 1 from dbo.nivel_permiso x where x.id_nivel = g.id_nivel and x.id_permiso = np.id_permiso);
go

insert into dbo.nivel_permiso (id_nivel, id_permiso)
select n.id_nivel, p.id_permiso
from (values
    ('gerente', 'gestionar_reservas'),
    ('gerente', 'ver_empleados'),
    ('gerente', 'registrar_empleados'),
    ('gerente', 'ver_planillas'),
    ('gerente', 'generar_planillas'),
    ('gerente', 'ver_inventario'),
    ('gerente', 'gestionar_inventario'),
    ('gerente', 'ver_compras'),
    ('gerente', 'registrar_compras'),
    ('gerente', 'ver_proveedores'),
    ('gerente', 'ver_ventas'),
    ('gerente', 'operar_caja'),
    ('gerente', 'ver_reportes'),
    ('gerente', 'gestionar_productos')
) as v(nivel, permiso)
join dbo.niveles_acceso n on n.codigo = v.nivel
join dbo.permisos       p on p.codigo = v.permiso
where not exists (select 1 from dbo.nivel_permiso x where x.id_nivel = n.id_nivel and x.id_permiso = p.id_permiso);
go

--permisos del administrador: todos los permisos del catalogo
insert into dbo.nivel_permiso (id_nivel, id_permiso)
select a.id_nivel, p.id_permiso
from dbo.niveles_acceso a
cross join dbo.permisos p
where a.codigo = 'administrador'
  and not exists (select 1 from dbo.nivel_permiso x where x.id_nivel = a.id_nivel and x.id_permiso = p.id_permiso);
go

--roles nuevos: gerente y cliente (los nombres van en minuscula para coincidir con los roles ya existentes)
insert into dbo.roles (nombre_rol, descripcion, es_administrativo, pantalla_inicio)
select v.nombre, v.descripcion, v.es_admin, v.pantalla
from (values
    ('gerente', 'gerente de sucursal: operacion, compras, inventario y personal', 1, 'panel_gerente'),
    ('cliente', 'cliente: consulta el menu y las reservas disponibles',           0, 'menu_reservas')
) as v(nombre, descripcion, es_admin, pantalla)
where not exists (select 1 from dbo.roles r where r.nombre_rol = v.nombre);
go

--a que nivel pertenece cada rol (rrhh queda en el nivel gerente; se puede cambiar con un update)
update r
set r.id_nivel = n.id_nivel
from dbo.roles r
join (values
    ('administrador', 'administrador'),
    ('gerente',       'gerente'),
    ('rrhh',          'gerente'),
    ('cajero',        'empleado'),
    ('mesero',        'empleado'),
    ('cocinero',      'empleado'),
    ('cliente',       'cliente')
) as m(rol, nivel) on m.rol = r.nombre_rol
join dbo.niveles_acceso n on n.codigo = m.nivel
where r.id_nivel is null;
go

--desde ahora todo rol debe tener nivel (solo se aplica si ningun rol quedo sin nivel)
if not exists (select 1 from dbo.roles where id_nivel is null)
    alter table dbo.roles alter column id_nivel int not null;
go

--------sentencias para el login y registro de los empleados--------
--normalizamos el texto que se ingrese:
create or alter function dbo.fn_normalizar_texto (@texto nvarchar(200))
returns varchar(200)
as
begin
    declare @t nvarchar(200) = lower(isnull(@texto, N''));
    set @t = replace(@t, nchar(225), N'a');
    set @t = replace(@t, nchar(233), N'e');
    set @t = replace(@t, nchar(237), N'i');
    set @t = replace(@t, nchar(243), N'o');
    set @t = replace(@t, nchar(250), N'u');
    set @t = replace(@t, nchar(252), N'u');
    set @t = replace(@t, nchar(241), N'n');
    declare @pos int = patindex(N'%[^a-z0-9]%', @t collate latin1_general_bin);
    while @pos > 0
    begin
        set @t = stuff(@t, @pos, 1, N'');
        set @pos = patindex(N'%[^a-z0-9]%', @t collate latin1_general_bin);
    end;
    return cast(@t as varchar(200));
end;
go

--funcion para la contrasenia
create or alter function dbo.fn_hash_password (@password varchar(100), @salt varchar(32))
returns varchar(64)
as
begin
    return convert(varchar(64), hashbytes('sha2_256', @salt + @password), 2);
end;
go

--generador de codigo para cada empleado (este cumple una regla especifica, son 6 digitos no repetibles entre empleados)
create or alter procedure dbo.sp_generar_codigo_empleado
    @codigo varchar(6) output
as
begin
    set nocount on;
    declare @intentos int = 0, @candidato varchar(6);
    set @codigo = null;
    while @intentos < 200
    begin
        set @intentos += 1;
        set @candidato = cast(100000 + abs(cast(crypt_gen_random(4) as bigint) % 900000) as varchar(6));
        if not exists (select 1 from dbo.empleados with (updlock, holdlock) where codigo_empleado = @candidato)
        begin
            set @codigo = @candidato;
            return;
        end;
    end;
    throw 50006, 'no se pudo generar un codigo de empleado unico. intente de nuevo.', 1;
end;
go

--registro de empleado:
create or alter procedure dbo.sp_registrar_empleado
    @nombres          nvarchar(100),
    @apellido_paterno nvarchar(50),
    @apellido_materno nvarchar(50) = null,
    @dui              varchar(10),
    @fecha_nacimiento date,
    @nombre_rol       varchar(50),
    @cargo            varchar(50),
    @tipo_planilla    varchar(20),
    @salario_base     decimal(10,2),
    @fecha_ingreso    date,
    @sucursalid       int = null,
    @isss_numero      varchar(15) = null,
    @afp_numero       varchar(20) = null,
    @tipo_contrato    varchar(50) = null,
    @jornada          varchar(50) = null,
    @forma_pago       varchar(50) = null,
    @codigo_empleado  varchar(6)  = null   --opcional: si no se indica, se genera uno aleatorio de 6 digitos
as
begin
    set nocount on;
    set xact_abort on;

    --hago una limpieza previa de datos de entrada
    set @nombres          = ltrim(rtrim(isnull(@nombres, N'')));
    set @apellido_paterno = ltrim(rtrim(isnull(@apellido_paterno, N'')));
    set @apellido_materno = nullif(ltrim(rtrim(isnull(@apellido_materno, N''))), N'');
    set @tipo_planilla    = ltrim(rtrim(isnull(@tipo_planilla, '')));

    --validamos los datos, roles y demas para ver si son correctos
    declare @id_rol int, @es_admin bit, @rol_db varchar(50);
    select @id_rol = id_rol, @es_admin = es_administrativo, @rol_db = nombre_rol
    from dbo.roles where nombre_rol = @nombre_rol;
    if @id_rol is null
        throw 50001, 'el rol indicado no existe.', 1;

--empleado no puede tener el rol de un cliente como tal
    if exists (select 1
               from dbo.roles r
               join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
               where r.id_rol = @id_rol and n.codigo = 'cliente')
        throw 50007, 'un empleado no puede tener el rol de cliente.', 1;

    if @nombres = N'' or @apellido_paterno = N''
        throw 50002, 'el nombre y el apellido paterno son obligatorios.', 1;
    if @fecha_nacimiento is null or @fecha_nacimiento > cast(getdate() as date)
        throw 50003, 'la fecha de nacimiento es obligatoria y no puede ser futura.', 1;
    if lower(@tipo_planilla) not in ('quincenal', 'mensual')
        throw 50004, 'el tipo de planilla debe ser quincenal o mensual.', 1;

    --preparamos el correo y contrasenia
    declare @primer_nombre nvarchar(100) = left(@nombres, charindex(N' ', @nombres + N' ') - 1);
    declare @ini_nombre varchar(3)   = left(dbo.fn_normalizar_texto(@primer_nombre), 3);  
    declare @ape_pat    varchar(100) = dbo.fn_normalizar_texto(@apellido_paterno);         
    declare @ini_pat    varchar(3)   = left(@ape_pat, 3);                                  
    declare @ini_mat    varchar(3)   = left(dbo.fn_normalizar_texto(@apellido_materno), 3); 
    if @ini_nombre = '' or @ape_pat = ''
        throw 50005, 'el nombre y el apellido deben contener letras.', 1;

    --fecha de nacimiento de la forma ddmmaaaa
    declare @fecha_txt varchar(8) = replace(convert(varchar(10), @fecha_nacimiento, 105), '-', '');

    --contrasenia personal por cada uno
    declare @password_inicial varchar(40) =
        case when @es_admin = 1
             then @ini_nombre + @ini_pat + @fecha_txt  
             else @fecha_txt                          
        end;
    declare @nombre_completo varchar(250) =
        @nombres + ' ' + @apellido_paterno + isnull(' ' + @apellido_materno, '');
    begin try
        begin tran;

       --aca esta el generador de el correo unico (esto ayuda a evitar la duplicidad de correos)
        declare @base   varchar(100) = @ini_nombre + @ape_pat;
        declare @correo varchar(150) = @base + '@origene.sv';
        if exists (select 1 from dbo.usuarios with (updlock, holdlock) where correo = @correo)
        begin

            --si es que ya eiste entonces agregan las 3 primeras letras del segundo apellido.
            set @base   = @base + @ini_mat;
            set @correo = @base + '@origene.sv';

            -- si aun existe (o no hay segundo apellido): numero al final.
            declare @n int = 1;
            while exists (select 1 from dbo.usuarios with (updlock, holdlock) where correo = @correo)
            begin
                set @n += 1;
                set @correo = @base + cast(@n as varchar(5)) + '@origene.sv';
            end;
        end;

        --para cada empleado generamos un codigo de 6 digitos
        --si se indico un codigo fijo (empleados de prueba) se valida y se usa; si no, se genera uno aleatorio
        declare @codigo varchar(6) = nullif(ltrim(rtrim(@codigo_empleado)), '');
        if @codigo is null
        begin
            exec dbo.sp_generar_codigo_empleado @codigo = @codigo output;
        end
        else if @codigo not like '[0-9][0-9][0-9][0-9][0-9][0-9]'
                or exists (select 1 from dbo.empleados where codigo_empleado = @codigo)
            throw 50008, 'el codigo indicado no tiene 6 digitos o ya lo usa otro empleado.', 1;

        --guardamos la ficha de el empleado agregado
        insert into dbo.empleados
            (codigo_empleado, sucursalid, id_rol, nombres, apellido_paterno, apellido_materno,
             nombre_completo, dui, fecha_nacimiento, isss_numero, afp_numero, cargo,
             tipo_planilla, salario_base, fecha_ingreso, correo, tipo_contrato, jornada, forma_pago)
        values
            (@codigo, @sucursalid, @id_rol, @nombres, @apellido_paterno, @apellido_materno,
             @nombre_completo, @dui, @fecha_nacimiento, @isss_numero, @afp_numero, @cargo,
             @tipo_planilla, @salario_base, @fecha_ingreso, @correo, @tipo_contrato, @jornada, @forma_pago);
        declare @id_empleado int = scope_identity();

        --creamos el usuario con su contrasenia
        declare @salt varchar(32) = convert(varchar(32), crypt_gen_random(16), 2);
        insert into dbo.usuarios
            (id_rol, sucursalid, id_empleado, nombre_completo, correo,
             password_hash, password_salt, debe_cambiar_password)
        values
            (@id_rol, @sucursalid, @id_empleado, @nombre_completo, @correo,
             dbo.fn_hash_password(@password_inicial, @salt), @salt, 1);
        commit tran;
        select @id_empleado      as id_empleado,
               @codigo           as codigo_empleado,
               @nombre_completo  as nombre_completo,
               @correo           as correo,
               @rol_db           as rol,
               @password_inicial as password_inicial;
    end try
    begin catch
        if xact_state() <> 0 rollback tran;
        throw;
    end catch;
end;
go

--------procedimiento para el login--------
create or alter procedure dbo.sp_login_empleado
    @identificador varchar(150),
    @password      varchar(100),
    @sucursalid    int
as
begin
    set nocount on;
    declare @id_usuario int, @salt varchar(32), @hash varchar(255), @ok bit = 0;
    set @identificador = lower(ltrim(rtrim(isnull(@identificador, ''))));

    --busca por codigo o correo
    select top (1)
           @id_usuario = u.id_usuario,
           @salt       = u.password_salt,
           @hash       = u.password_hash
    from dbo.usuarios u
    join dbo.empleados e on e.id_empleado = u.id_empleado
    where u.activo = 1
      and e.activo = 1
      and u.sucursalid = @sucursalid
      and e.sucursalid = @sucursalid
      and (e.codigo_empleado = @identificador or u.correo = @identificador);

    --verificacion de la contrasenia
    if @id_usuario is not null and @hash = dbo.fn_hash_password(isnull(@password, ''), @salt)
        set @ok = 1;
    if @ok = 0
        return;

    --registra el acceso
    update dbo.usuarios set ultimo_acceso = getdate() where id_usuario = @id_usuario;

    --devuelve los datos de la sesion
    select u.id_usuario,
           e.id_empleado,
           e.codigo_empleado,
           e.nombre_completo,
           u.correo,
           r.nombre_rol        as rol,
           r.es_administrativo,
           r.pantalla_inicio,
           n.codigo            as nivel_acceso,
           e.cargo,
           e.sucursalid,
           s.nombre            as sucursal,
           u.debe_cambiar_password
    from dbo.usuarios u
    join dbo.empleados e on e.id_empleado = u.id_empleado
    join dbo.roles r     on r.id_rol = e.id_rol
    join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
    left join dbo.sucursales s on s.sucursalid = e.sucursalid
    where u.id_usuario = @id_usuario
      and u.sucursalid = @sucursalid
      and e.sucursalid = @sucursalid;
end;
go

--procedimiento para el cambio de contrasenia si se olvida:
create or alter procedure dbo.sp_cambiar_password
    @id_usuario      int,
    @password_actual varchar(100),
    @password_nueva  varchar(100)
as
begin
    set nocount on;
    if len(isnull(@password_nueva, '')) < 8
        throw 50010, 'la nueva contrasenia debe tener al menos 8 caracteres.', 1;
    declare @salt varchar(32), @hash varchar(255);
    select @salt = password_salt, @hash = password_hash
    from dbo.usuarios
    where id_usuario = @id_usuario and activo = 1;
    if @hash is null or @hash <> dbo.fn_hash_password(isnull(@password_actual, ''), @salt)
        throw 50011, 'la contrasena actual no es correcta.', 1;
    declare @nueva_salt varchar(32) = convert(varchar(32), crypt_gen_random(16), 2);
    update dbo.usuarios
    set password_salt = @nueva_salt,
        password_hash = dbo.fn_hash_password(@password_nueva, @nueva_salt),
        debe_cambiar_password = 0
    where id_usuario = @id_usuario;
    select 1 as cambiado;
end;
go

--registro de un cliente (usuario normal): crea el cliente y su cuenta en una sola transaccion
create or alter procedure dbo.sp_registrar_cliente_usuario
    @nombre   nvarchar(150),
    @correo   varchar(150),
    @password varchar(100),
    @telefono varchar(20) = null
as
begin
    set nocount on;
    set xact_abort on;
    set @nombre   = ltrim(rtrim(isnull(@nombre, N'')));
    set @correo   = lower(ltrim(rtrim(isnull(@correo, ''))));
    set @telefono = nullif(ltrim(rtrim(isnull(@telefono, ''))), '');
    if @nombre = N''
        throw 50020, 'el nombre es obligatorio.', 1;
    if @correo not like '_%@_%._%' or @correo like '% %'
        throw 50021, 'el correo no tiene un formato valido.', 1;
    if len(isnull(@password, '')) < 8
        throw 50022, 'la contrasena debe tener al menos 8 caracteres.', 1;

    --los correos @origene.sv se generan solo para empleados: un cliente no puede usarlos
    if @correo like '%@origene.sv'
        throw 50023, 'los correos @origene.sv son solo para empleados.', 1;
    declare @id_rol int;
    select @id_rol = id_rol from dbo.roles where nombre_rol = 'cliente';
    if @id_rol is null
        throw 50024, 'no existe el rol cliente.', 1;
    begin try
        begin tran;
        if exists (select 1 from dbo.usuarios with (updlock, holdlock) where correo = @correo)
            throw 50025, 'ese correo ya esta registrado.', 1;
        insert into dbo.clientes (nombre, telefono, correo)
        values (@nombre, @telefono, @correo);
        declare @id_cliente int = scope_identity();
        declare @salt varchar(32) = convert(varchar(32), crypt_gen_random(16), 2);

        --el cliente elige su propia contrasena, por eso no se exige cambiarla (debe_cambiar_password = 0)
        insert into dbo.usuarios
            (id_rol, id_cliente, nombre_completo, correo, password_hash, password_salt, debe_cambiar_password)
        values
            (@id_rol, @id_cliente, @nombre, @correo, dbo.fn_hash_password(@password, @salt), @salt, 0);
        declare @id_usuario int = scope_identity();
        commit tran;
        select @id_usuario as id_usuario,
               @id_cliente as id_cliente,
               @nombre     as nombre_completo,
               @correo     as correo,
               'cliente'   as rol,
               'cliente'   as nivel_acceso;
    end try
    begin catch
        if xact_state() <> 0 rollback tran;
        throw;
    end catch;
end;
go

--login del cliente: devuelve una fila si el correo y la contrasena son correctos; cero filas si no
create or alter procedure dbo.sp_login_cliente
    @correo   varchar(150),
    @password varchar(100)
as
begin
    set nocount on;
    declare @id_usuario int, @salt varchar(32), @hash varchar(255), @ok bit = 0;
    set @correo = lower(ltrim(rtrim(isnull(@correo, ''))));

    --solo cuentas de cliente (id_cliente no nulo): un empleado no entra por aqui
    select top (1)
           @id_usuario = u.id_usuario,
           @salt       = u.password_salt,
           @hash       = u.password_hash
    from dbo.usuarios u
    where u.activo = 1
      and u.id_cliente is not null
      and u.correo = @correo;
    if @id_usuario is not null and @hash = dbo.fn_hash_password(isnull(@password, ''), @salt)
        set @ok = 1;
    if @ok = 0
        return;
    update dbo.usuarios set ultimo_acceso = getdate() where id_usuario = @id_usuario;
    select u.id_usuario,
           c.id_cliente,
           c.nombre          as nombre_completo,
           u.correo,
           r.nombre_rol      as rol,
           n.codigo          as nivel_acceso,
           r.pantalla_inicio,
           u.debe_cambiar_password
    from dbo.usuarios u
    join dbo.clientes c       on c.id_cliente = u.id_cliente
    join dbo.roles r          on r.id_rol = u.id_rol
    join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
    where u.id_usuario = @id_usuario;
end;
go

--funcion para ver si un usuario tiene un permiso (el administrador siempre tiene todos)
create or alter function dbo.fn_tiene_permiso (@id_usuario int, @codigo_permiso varchar(50))
returns bit
as
begin
    declare @resultado bit = 0;
    if exists (
        select 1
        from dbo.usuarios u
        join dbo.roles r          on r.id_rol = u.id_rol
        join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
        where u.id_usuario = @id_usuario and u.activo = 1 and n.codigo = 'administrador'
    )
    begin
        set @resultado = 1;
    end
    else if exists (
        select 1
        from dbo.usuarios u
        join dbo.roles r          on r.id_rol = u.id_rol
        join dbo.nivel_permiso np on np.id_nivel = r.id_nivel
        join dbo.permisos p       on p.id_permiso = np.id_permiso
        where u.id_usuario = @id_usuario and u.activo = 1 and p.codigo = @codigo_permiso
    )
    begin
        set @resultado = 1;
    end;
    return @resultado;
end;
go

--lista de permisos de un usuario: el frontend la usa para mostrar solo las opciones que le corresponden
create or alter procedure dbo.sp_permisos_usuario
    @id_usuario int
as
begin
    set nocount on;
    select p.codigo, p.descripcion
    from dbo.usuarios u
    join dbo.roles r          on r.id_rol = u.id_rol
    join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
    join dbo.permisos p       on n.codigo = 'administrador'
                              or exists (select 1 from dbo.nivel_permiso np
                                         where np.id_nivel = n.id_nivel and np.id_permiso = p.id_permiso)
    where u.id_usuario = @id_usuario and u.activo = 1
    order by p.codigo;
end;
go

--mesas disponibles para una fecha y hora: excluye mesas inactivas, pequenas para el grupo y las que ya tienen
--una reserva (pendiente o confirmada) que se cruce con el horario pedido
create or alter function dbo.fn_mesas_disponibles
    (@sucursalid int, @fecha_hora datetime2(0), @personas int, @duracion_minutos int)
returns table
as
return (
    select m.mesaid, m.sucursalid, m.numero_mesa, m.capacidad
    from dbo.mesas m
    where m.sucursalid = @sucursalid
      and m.estado <> 'inactiva'
      and m.capacidad >= @personas
      and not exists (
          select 1
          from dbo.reservas r
          where r.mesaid = m.mesaid
            and r.estado in ('pendiente', 'confirmada')
            and r.fecha_hora_inicio < dateadd(minute, @duracion_minutos, @fecha_hora)
            and dateadd(minute, r.duracion_minutos, r.fecha_hora_inicio) > @fecha_hora
      )
);
go

--migracion de datos y limpieza(convierte los codigos viejos que puedan existir esto es solo si hay conflicto de codigo previo)
declare @id_pendiente int, @codigo_nuevo varchar(6);
while exists (
    select 1
    from dbo.empleados
    where codigo_empleado is null
       or codigo_empleado not like '[0-9][0-9][0-9][0-9][0-9][0-9]'
)
begin
    select top (1) @id_pendiente = id_empleado
    from dbo.empleados
    where codigo_empleado is null
       or codigo_empleado not like '[0-9][0-9][0-9][0-9][0-9][0-9]'
    order by id_empleado;
    exec dbo.sp_generar_codigo_empleado @codigo = @codigo_nuevo output;
    update dbo.empleados
    set codigo_empleado = @codigo_nuevo
    where id_empleado = @id_pendiente;
end;
go

if not exists (
    select 1
    from sys.check_constraints
    where name = N'ck_empleados_codigo_6_digitos'
      and parent_object_id = object_id(N'dbo.empleados')
)
    alter table dbo.empleados
        add constraint ck_empleados_codigo_6_digitos
        check (codigo_empleado like '[0-9][0-9][0-9][0-9][0-9][0-9]');
go

if exists (
    select 1
    from sys.sequences
    where name = N'seq_codigo_empleado'
      and schema_id = schema_id(N'dbo')
)
    drop sequence dbo.seq_codigo_empleado;
go

--------vistas de consulta--------
--consulta cuando este por debajo de el minimo o en el minimo.
create or alter view dbo.v_reporte_alertas_stock
as
    select id_insumo,
           nombre as insumo,
           unidad_medida,
           stock_actual,
           stock_minimo,
           case when stock_minimo > stock_actual then stock_minimo - stock_actual else 0 end as cantidad_faltante
    from dbo.insumos
    where activo = 1
      and stock_actual <= stock_minimo;
go

--ventas agrupadas por su sucursal.
create or alter view dbo.v_reporte_ventas_sucursal
as
    select coalesce(s.nombre, 'sin sucursal') as sucursal,
           v.tipo_documento,
           count_big(*)    as cantidad_ventas,
           sum(v.subtotal) as total_subtotal,
           sum(v.iva)      as total_iva,
           sum(v.total)    as total_facturado
    from dbo.ventas v
    left join dbo.sucursales s on s.sucursalid = v.sucursalid
    group by coalesce(s.nombre, 'sin sucursal'), v.tipo_documento;
go

--detalle de cada planilla de los empleados
create or alter view dbo.v_reporte_planilla
as
    select pl.id_planilla,
           pl.periodo_inicio,
           pl.periodo_fin,
           pl.estado,
           e.id_empleado,
           e.codigo_empleado,
           e.nombre_completo,
           e.cargo,
           pd.salario_bruto,
           pd.descuento_isss,
           pd.descuento_afp,
           pd.descuento_renta,
           pd.salario_neto
    from dbo.planilla_detalle pd
    join dbo.planillas pl on pl.id_planilla = pd.id_planilla
    join dbo.empleados e  on e.id_empleado  = pd.id_empleado;
go

--listado de empleados (esta contiene el rol, su sucrsal y correo de acceso, no expone la contrasenia)
create or alter view dbo.v_empleados_detalle
as
    select e.id_empleado,
           e.codigo_empleado,
           e.nombre_completo,
           e.cargo,
           r.nombre_rol as rol,
           s.nombre as sucursal,
           e.activo,
           e.tipo_contrato,
           e.jornada,
           e.forma_pago,
           e.tipo_planilla,
           e.salario_base,
           e.fecha_ingreso,
           e.isss_numero,
           e.afp_numero,
           u.correo as correo_login,
           u.ultimo_acceso
    from dbo.empleados e
    join dbo.roles r on r.id_rol = e.id_rol
    left join dbo.sucursales s on s.sucursalid = e.sucursalid
    left join dbo.usuarios u   on u.id_empleado = e.id_empleado;
go

--solo productos activos y solo datos de cara al publico: no muestra stock, costos ni recetas
create or alter view dbo.v_menu_publico
as
    select p.id_producto,
           p.nombre,
           p.descripcion,
           p.categoria,
           p.precio_venta
    from dbo.productos p
    where p.activo = 1;
go

--------datos de prueba utilizados para la bd--------
set nocount on;
declare @escalon int = (select sucursalid from dbo.sucursales where nombre = 'escalon');

--tabla temporal para guardar las credenciales de los empleados de prueba
--si quedo de una ejecucion anterior en la misma ventana, se elimina
if object_id(N'tempdb..#credenciales') is not null
    drop table #credenciales;
create table #credenciales (
    id_empleado      int,
    codigo_empleado  varchar(12),
    nombre_completo  varchar(250),
    correo           varchar(150),
    rol              varchar(50),
    password_inicial varchar(40)
);

-- administrador del sistema -> admsistema@origene.sv / admsis01011990
if not exists (select 1 from dbo.empleados where dui = '00000001-1')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'admin', @apellido_paterno = N'sistema', @dui = '00000001-1',
        @fecha_nacimiento = '1990-01-01', @nombre_rol = 'administrador',
        @cargo = 'administrador del sistema', @tipo_planilla = 'mensual',
        @salario_base = 1500, @fecha_ingreso = '2024-01-01', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'mensual',
        @codigo_empleado = '100001';

-- rrhh -> davbarahona@origene.sv / davbar11121983 (entra directo a empleados)
if not exists (select 1 from dbo.empleados where dui = '00000002-2')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'david alejandro', @apellido_paterno = N'barahona', @apellido_materno = N'lopez',
        @dui = '00000002-2', @fecha_nacimiento = '1983-12-11', @nombre_rol = 'rrhh',
        @cargo = 'jefe de rrhh', @tipo_planilla = 'mensual', @salario_base = 1200,
        @fecha_ingreso = '2024-03-10', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'mensual',
        @codigo_empleado = '100002';

-- mismo nombre y primer apellido -> usa el segundo apellido: davbarahonaguz@origene.sv
if not exists (select 1 from dbo.empleados where dui = '00000003-3')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'david enrique', @apellido_paterno = N'barahona', @apellido_materno = N'guzman',
        @dui = '00000003-3', @fecha_nacimiento = '1990-06-05', @nombre_rol = 'cajero',
        @cargo = 'cajero', @tipo_planilla = 'quincenal', @salario_base = 550,
        @fecha_ingreso = '2025-02-05', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'quincenal',
        @codigo_empleado = '100003';

-- mesera -> camrios@origene.sv / 22031995 (entra directo a toma de pedidos)
if not exists (select 1 from dbo.empleados where dui = '00000004-4')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'camila andrea', @apellido_paterno = N'rios', @apellido_materno = N'mejia',
        @dui = '00000004-4', @fecha_nacimiento = '1995-03-22', @nombre_rol = 'mesero',
        @cargo = 'mesera', @tipo_planilla = 'quincenal', @salario_base = 575,
        @fecha_ingreso = '2025-11-12', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'quincenal',
        @codigo_empleado = '100004';

-- cocinero -> serperez@origene.sv / 14091988 (entra directo a cocina)
if not exists (select 1 from dbo.empleados where dui = '00000005-5')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'sergio', @apellido_paterno = N'perez', @apellido_materno = N'alas',
        @dui = '00000005-5', @fecha_nacimiento = '1988-09-14', @nombre_rol = 'cocinero',
        @cargo = 'cocinero', @tipo_planilla = 'quincenal', @salario_base = 600,
        @fecha_ingreso = '2026-08-03', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'quincenal',
        @codigo_empleado = '100005';

--gerente de prueba
if not exists (select 1 from dbo.empleados where dui = '00000006-6')
    insert into #credenciales
    exec dbo.sp_registrar_empleado
        @nombres = N'laura beatriz', @apellido_paterno = N'campos', @apellido_materno = N'rivas',
        @dui = '00000006-6', @fecha_nacimiento = '1985-04-17', @nombre_rol = 'gerente',
        @cargo = 'gerente de sucursal', @tipo_planilla = 'mensual', @salario_base = 1300,
        @fecha_ingreso = '2024-05-01', @sucursalid = @escalon,
        @tipo_contrato = 'indefinido', @jornada = 'completa', @forma_pago = 'mensual',
        @codigo_empleado = '100006';

-- credenciales iniciales de lo registrado en esta ejecucion (con sus codigos de 6 digitos).
select * from #credenciales order by id_empleado;
drop table #credenciales;

-------- cliente de prueba -> cliente.prueba@correo.com / cliente2026 --------
if not exists (select 1 from dbo.usuarios where correo = 'cliente.prueba@correo.com')
    exec dbo.sp_registrar_cliente_usuario
        @nombre = N'cliente de prueba', @correo = 'cliente.prueba@correo.com',
        @password = 'cliente2026', @telefono = '7000-0000';
go

-- conteo basico para confirmar que la instalacion termino bien.
select N'origenesv' as base_datos,
       (select count(*) from dbo.roles)      as roles,
       (select count(*) from dbo.sucursales) as sucursales,
       (select count(*) from dbo.empleados)  as empleados,
       (select count(*) from dbo.usuarios)   as usuarios,
       (select count(*) from dbo.insumos)    as insumos,
       (select count(*) from dbo.productos)  as productos;
go

-- empleados con su codigo, rol y correo de acceso.
select codigo_empleado, nombre_completo, rol, correo_login, activo
from dbo.v_empleados_detalle
order by codigo_empleado;
go

-- comprobacion: no debe haber codigos repetidos ni con formato incorrecto (ambas deben devolver 0 filas).
select codigo_empleado, count(*) as veces from dbo.empleados group by codigo_empleado having count(*) > 1;
select codigo_empleado from dbo.empleados where codigo_empleado not like '[0-9][0-9][0-9][0-9][0-9][0-9]';
go


--que rol pertenece a que nivel, a que pantalla entra y cuantos permisos tiene su nivel
select r.nombre_rol as rol,
       n.codigo     as nivel_acceso,
       r.pantalla_inicio,
       (select count(*) from dbo.nivel_permiso np where np.id_nivel = r.id_nivel) as permisos_del_nivel
from dbo.roles r
join dbo.niveles_acceso n on n.id_nivel = r.id_nivel
order by n.id_nivel, r.nombre_rol;
go


-- para ver los usuarios existentes (nunca muestre password_hash en pantallas):
select id_usuario, correo, activo, debe_cambiar_password, ultimo_acceso from dbo.usuarios;
go




