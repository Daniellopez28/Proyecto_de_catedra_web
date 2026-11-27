USE OrigeneSV;
GO

IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    ;THROW 50001, 'No existe la tabla dbo.ventas en OrigeneSV.', 1;
END;
GO

IF COL_LENGTH(N'dbo.ventas', N'nombre_cliente') IS NULL
BEGIN
    ALTER TABLE dbo.ventas ADD nombre_cliente VARCHAR(150) NULL;
    PRINT N'Se agregó dbo.ventas.nombre_cliente.';
END
ELSE
BEGIN
    PRINT N'dbo.ventas.nombre_cliente ya existe; no se realizaron cambios.';
END;
GO
