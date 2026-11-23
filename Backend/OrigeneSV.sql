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