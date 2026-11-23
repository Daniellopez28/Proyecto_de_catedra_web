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