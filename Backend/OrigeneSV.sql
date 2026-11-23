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
