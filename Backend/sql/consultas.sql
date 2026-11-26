--solicitar actualizacion de usuarios:
USE OrigeneSV;

SELECT correo, activo, debe_cambiar_password, ultimo_acceso
FROM dbo.usuarios
WHERE correo = 'correo-del-usuario';