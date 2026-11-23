create or alter procedure dbo.sp_login_empleado
    @identificador varchar(150),
    @password      varchar(100),
    @sucursalid    int
as
begin
    set nocount on;
    declare @id_usuario int, @salt varchar(32), @hash varchar(255), @ok bit = 0;
    set @identificador = lower(ltrim(rtrim(isnull(@identificador, ''))));

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

    if @id_usuario is not null and @hash = dbo.fn_hash_password(isnull(@password, ''), @salt)
        set @ok = 1;
    if @ok = 0
        return;

    update dbo.usuarios
    set ultimo_acceso = getdate()
    where id_usuario = @id_usuario;

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
