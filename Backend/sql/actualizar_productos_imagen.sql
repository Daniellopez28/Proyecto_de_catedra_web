USE [OrigeneSV];
GO

SET XACT_ABORT ON;

IF OBJECT_ID('dbo.productos', 'U') IS NULL
    THROW 50001, 'No existe la tabla dbo.productos en OrigeneSV.', 1;
GO

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.productos', 'imagen') IS NULL
    ALTER TABLE dbo.productos ADD imagen varbinary(max) NULL;

IF COL_LENGTH('dbo.productos', 'imagen_mime') IS NULL
    ALTER TABLE dbo.productos ADD imagen_mime varchar(50) NULL;

COMMIT TRANSACTION;
GO
