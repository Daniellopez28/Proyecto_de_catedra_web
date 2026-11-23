set xact_abort on;

begin try
    begin transaction;

    declare @casaMatrizId int =
        (select sucursalid from dbo.sucursales where lower(nombre) = 'casa matriz');
    declare @escalonId int =
        (select sucursalid from dbo.sucursales where lower(nombre) = 'escalon');

    if @casaMatrizId is null
    begin
        if @escalonId is null
            throw 51000, 'No se encontró la sucursal Escalon para los empleados.', 1;
        update dbo.sucursales
        set activo = 1
        where sucursalid = @escalonId;
    end
    else if @escalonId is not null and @escalonId <> @casaMatrizId
    begin
        if exists (select 1 from dbo.sucursales where lower(nombre) = 'escalon_legacy')
            throw 51001, 'Ya existe una sucursal escalon_legacy; revise el estado antes de continuar.', 1;

        if exists (select 1 from dbo.empleados where sucursalid = @escalonId)
            or exists (select 1 from dbo.usuarios where sucursalid = @escalonId)
            or exists (select 1 from dbo.inventario_sucursal where sucursalid = @escalonId)
            or exists (select 1 from dbo.movimientos_inventario where sucursalid = @escalonId)
            or exists (select 1 from dbo.ventas where sucursalid = @escalonId)
            or exists (select 1 from dbo.compras where sucursalid = @escalonId)
            or exists (select 1 from dbo.mesas where sucursalid = @escalonId)
            or exists (select 1 from dbo.cajas where sucursalid = @escalonId)
            throw 51002, 'La sucursal Escalon ya tiene datos; no se archivó ni se reasignó.', 1;

        update dbo.sucursales
        set nombre = 'escalon_legacy',
            activo = 0
        where sucursalid = @escalonId;
    end;

    update dbo.sucursales
    set nombre = 'escalon',
        activo = 1
    where sucursalid = @casaMatrizId;

    commit transaction;
end try
begin catch
    if xact_state() <> 0 rollback transaction;
    throw;
end catch;
