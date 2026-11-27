-- Ejecutar solo en una base de desarrollo o pruebas.
-- Agrega datos de ejemplo sin borrar ni modificar registros existentes.
USE OrigeneSV;
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF (SELECT COUNT_BIG(*) FROM dbo.niveles_acceso) < 2
    BEGIN
        INSERT INTO dbo.niveles_acceso (codigo, descripcion)
        SELECT v.codigo, v.descripcion
        FROM (VALUES
            ('demo_nivel_1', 'Nivel de acceso de prueba 1'),
            ('demo_nivel_2', 'Nivel de acceso de prueba 2')
        ) AS v(codigo, descripcion)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.niveles_acceso n WHERE n.codigo = v.codigo
        );
    END;

    DECLARE @nivel1 int, @nivel2 int;
    SELECT @nivel1 = MIN(id_nivel), @nivel2 = MAX(id_nivel)
    FROM (SELECT TOP (2) id_nivel FROM dbo.niveles_acceso ORDER BY id_nivel) AS n;

    IF (SELECT COUNT_BIG(*) FROM dbo.permisos) < 2
    BEGIN
        INSERT INTO dbo.permisos (codigo, descripcion)
        SELECT v.codigo, v.descripcion
        FROM (VALUES
            ('demo_permiso_1', 'Permiso de prueba 1'),
            ('demo_permiso_2', 'Permiso de prueba 2')
        ) AS v(codigo, descripcion)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.permisos p WHERE p.codigo = v.codigo
        );
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.roles) < 2
    BEGIN
        INSERT INTO dbo.roles (nombre_rol, descripcion, es_administrativo, pantalla_inicio, id_nivel)
        SELECT v.nombre, v.descripcion, 0, 'inicio', v.id_nivel
        FROM (VALUES
            ('demo_rol_1', 'Rol de prueba 1', @nivel1),
            ('demo_rol_2', 'Rol de prueba 2', @nivel2)
        ) AS v(nombre, descripcion, id_nivel)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.roles r WHERE r.nombre_rol = v.nombre
        );
    END;

    DECLARE @rol1 int, @rol2 int;
    SELECT @rol1 = MIN(id_rol), @rol2 = MAX(id_rol)
    FROM (SELECT TOP (2) id_rol FROM dbo.roles ORDER BY id_rol) AS r;

    IF (SELECT COUNT_BIG(*) FROM dbo.sucursales) < 2
    BEGIN
        INSERT INTO dbo.sucursales (nombre, direccion, telefono, activo)
        SELECT v.nombre, v.direccion, v.telefono, 1
        FROM (VALUES
            ('Sucursal demo 1', 'Direccion de prueba 1', '7000-0001'),
            ('Sucursal demo 2', 'Direccion de prueba 2', '7000-0002')
        ) AS v(nombre, direccion, telefono)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.sucursales s WHERE s.nombre = v.nombre
        );
    END;

    DECLARE @sucursal1 int, @sucursal2 int;
    SELECT @sucursal1 = MIN(sucursalid), @sucursal2 = MAX(sucursalid)
    FROM (SELECT TOP (2) sucursalid FROM dbo.sucursales ORDER BY sucursalid) AS s;

    IF (SELECT COUNT_BIG(*) FROM dbo.empleados) < 2
    BEGIN
        INSERT INTO dbo.empleados (
            codigo_empleado, sucursalid, id_rol, nombres, apellido_paterno,
            nombre_completo, dui, fecha_nacimiento, cargo, tipo_planilla,
            salario_base, fecha_ingreso, activo
        )
        SELECT v.codigo, v.sucursalid, v.id_rol, v.nombres, v.apellido,
               CONCAT(v.nombres, ' ', v.apellido), v.dui, '1990-01-01',
               'Personal de prueba', 'mensual', 500.00, '2025-01-01', 1
        FROM (VALUES
            ('990001', @sucursal1, @rol1, 'Empleado demo 1', 'Prueba', '99999999-1'),
            ('990002', @sucursal2, @rol2, 'Empleado demo 2', 'Prueba', '99999999-2')
        ) AS v(codigo, sucursalid, id_rol, nombres, apellido, dui)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.empleados e WHERE e.codigo_empleado = v.codigo
        );
    END;

    DECLARE @empleado1 int, @empleado2 int;
    SELECT @empleado1 = MIN(id_empleado), @empleado2 = MAX(id_empleado)
    FROM (SELECT TOP (2) id_empleado FROM dbo.empleados ORDER BY id_empleado) AS e;

    IF (SELECT COUNT_BIG(*) FROM dbo.usuarios) < 2
    BEGIN
        INSERT INTO dbo.usuarios (
            id_rol, sucursalid, nombre_completo, correo, password_hash,
            debe_cambiar_password, activo
        )
        SELECT v.id_rol, v.sucursalid, v.nombre, v.correo,
               'CUENTA_DEMO_DESACTIVADA', 1, 0
        FROM (VALUES
            (@rol1, @sucursal1, 'Usuario demo 1', 'demo-usuario-1@example.invalid'),
            (@rol2, @sucursal2, 'Usuario demo 2', 'demo-usuario-2@example.invalid')
        ) AS v(id_rol, sucursalid, nombre, correo)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.usuarios u WHERE u.correo = v.correo
        );
    END;

    DECLARE @usuario1 int, @usuario2 int;
    SELECT @usuario1 = MIN(id_usuario), @usuario2 = MAX(id_usuario)
    FROM (SELECT TOP (2) id_usuario FROM dbo.usuarios ORDER BY id_usuario) AS u;

    IF (SELECT COUNT_BIG(*) FROM dbo.clientes) < 2
    BEGIN
        INSERT INTO dbo.clientes (nombre, apellido, telefono, correo)
        SELECT v.nombre, v.apellido, v.telefono, v.correo
        FROM (VALUES
            ('Cliente demo 1', 'Prueba', '7000-0101', 'demo-cliente-1@example.invalid'),
            ('Cliente demo 2', 'Prueba', '7000-0102', 'demo-cliente-2@example.invalid')
        ) AS v(nombre, apellido, telefono, correo)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.clientes c WHERE c.telefono = v.telefono
        );
    END;

    DECLARE @cliente1 int, @cliente2 int;
    SELECT @cliente1 = MIN(id_cliente), @cliente2 = MAX(id_cliente)
    FROM (SELECT TOP (2) id_cliente FROM dbo.clientes ORDER BY id_cliente) AS c;

    IF (SELECT COUNT_BIG(*) FROM dbo.proveedores) < 2
    BEGIN
        INSERT INTO dbo.proveedores (nombre_empresa, contacto_nombre, telefono, activo)
        SELECT v.nombre, v.contacto, v.telefono, 1
        FROM (VALUES
            ('Proveedor demo 1', 'Contacto demo 1', '7000-0201'),
            ('Proveedor demo 2', 'Contacto demo 2', '7000-0202')
        ) AS v(nombre, contacto, telefono)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.proveedores p WHERE p.nombre_empresa = v.nombre
        );
    END;

    DECLARE @proveedor1 int, @proveedor2 int;
    SELECT @proveedor1 = MIN(id_proveedor), @proveedor2 = MAX(id_proveedor)
    FROM (SELECT TOP (2) id_proveedor FROM dbo.proveedores ORDER BY id_proveedor) AS p;

    IF (SELECT COUNT_BIG(*) FROM dbo.insumos) < 2
    BEGIN
        INSERT INTO dbo.insumos (nombre, unidad_medida, stock_actual, stock_minimo, costo_promedio)
        SELECT v.nombre, v.unidad, 20, 2, 1.0000
        FROM (VALUES
            ('Insumo demo 1', 'unidad'),
            ('Insumo demo 2', 'unidad')
        ) AS v(nombre, unidad)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.insumos i WHERE i.nombre = v.nombre
        );
    END;

    DECLARE @insumo1 int, @insumo2 int;
    SELECT @insumo1 = MIN(id_insumo), @insumo2 = MAX(id_insumo)
    FROM (SELECT TOP (2) id_insumo FROM dbo.insumos ORDER BY id_insumo) AS i;

    IF (SELECT COUNT_BIG(*) FROM dbo.productos) < 2
    BEGIN
        INSERT INTO dbo.productos (
            nombre, descripcion, precio_venta, categoria, es_reventa, activo, stock_actual
        )
        VALUES
            ('Producto demo 1', 'Producto para pruebas', 5.00, 'Pruebas', 0, 1, 10),
            ('Producto demo 2', 'Producto para pruebas', 7.00, 'Pruebas', 0, 1, 10);
    END;

    DECLARE @producto1 int, @producto2 int;
    SELECT @producto1 = MIN(id_producto), @producto2 = MAX(id_producto)
    FROM (SELECT TOP (2) id_producto FROM dbo.productos ORDER BY id_producto) AS p;

    IF (SELECT COUNT_BIG(*) FROM dbo.modificadores) < 2
    BEGIN
        INSERT INTO dbo.modificadores (nombre, precio, activo)
        SELECT v.nombre, v.precio, 1
        FROM (VALUES
            ('Modificador demo 1', 0.50),
            ('Modificador demo 2', 1.00)
        ) AS v(nombre, precio)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.modificadores m WHERE m.nombre = v.nombre
        );
    END;

    DECLARE @modificador1 int, @modificador2 int;
    SELECT @modificador1 = MIN(modificadorid), @modificador2 = MAX(modificadorid)
    FROM (SELECT TOP (2) modificadorid FROM dbo.modificadores ORDER BY modificadorid) AS m;

    IF (SELECT COUNT_BIG(*) FROM dbo.mesas) < 2
    BEGIN
        INSERT INTO dbo.mesas (sucursalid, numero_mesa, capacidad, estado)
        SELECT v.sucursalid, v.numero, 4, 'libre'
        FROM (VALUES
            (@sucursal1, 'D-01'),
            (@sucursal2, 'D-02')
        ) AS v(sucursalid, numero)
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.mesas m
            WHERE m.sucursalid = v.sucursalid AND m.numero_mesa = v.numero
        );
    END;

    DECLARE @mesa1 int, @mesa2 int;
    SELECT @mesa1 = MIN(mesaid), @mesa2 = MAX(mesaid)
    FROM (SELECT TOP (2) mesaid FROM dbo.mesas ORDER BY mesaid) AS m;

    IF (SELECT COUNT_BIG(*) FROM dbo.planillas) < 2
    BEGIN
        INSERT INTO dbo.planillas (periodo_inicio, periodo_fin, tipo_planilla, total_pagar, estado)
        SELECT v.inicio, v.fin, v.tipo, 1000.00, 'generada'
        FROM (VALUES
            (CONVERT(date, '20980101', 112), CONVERT(date, '20980115', 112), 'quincenal'),
            (CONVERT(date, '20980116', 112), CONVERT(date, '20980131', 112), 'quincenal')
        ) AS v(inicio, fin, tipo)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.planillas p
            WHERE p.tipo_planilla = v.tipo
              AND p.periodo_inicio = v.inicio
              AND p.periodo_fin = v.fin
        );
    END;

    DECLARE @planilla1 int, @planilla2 int;
    SELECT @planilla1 = MIN(id_planilla), @planilla2 = MAX(id_planilla)
    FROM (SELECT TOP (2) id_planilla FROM dbo.planillas ORDER BY id_planilla) AS p;

    IF (SELECT COUNT_BIG(*) FROM dbo.nivel_permiso) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT n.id_nivel, p.id_permiso
            FROM (SELECT TOP (2) id_nivel FROM dbo.niveles_acceso ORDER BY id_nivel) AS n
            CROSS JOIN (SELECT TOP (2) id_permiso FROM dbo.permisos ORDER BY id_permiso) AS p
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.nivel_permiso np
                WHERE np.id_nivel = n.id_nivel AND np.id_permiso = p.id_permiso
            )
        )
        INSERT INTO dbo.nivel_permiso (id_nivel, id_permiso)
        SELECT TOP (2) id_nivel, id_permiso FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.planilla_detalle) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT p.id_planilla, e.id_empleado
            FROM (SELECT TOP (2) id_planilla FROM dbo.planillas ORDER BY id_planilla) AS p
            CROSS JOIN (SELECT TOP (2) id_empleado FROM dbo.empleados ORDER BY id_empleado) AS e
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.planilla_detalle d
                WHERE d.id_planilla = p.id_planilla AND d.id_empleado = e.id_empleado
            )
        )
        INSERT INTO dbo.planilla_detalle (
            id_planilla, id_empleado, salario_bruto, descuento_isss,
            descuento_afp, descuento_renta, salario_neto
        )
        SELECT TOP (2) id_planilla, id_empleado, 500.00, 15.00, 36.25, 0.00, 448.75
        FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.recetas_detalle) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT p.id_producto, i.id_insumo
            FROM (SELECT TOP (2) id_producto FROM dbo.productos ORDER BY id_producto) AS p
            CROSS JOIN (SELECT TOP (2) id_insumo FROM dbo.insumos ORDER BY id_insumo) AS i
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.recetas_detalle r
                WHERE r.id_producto = p.id_producto AND r.id_insumo = i.id_insumo
            )
        )
        INSERT INTO dbo.recetas_detalle (id_producto, id_insumo, cantidad_requerida)
        SELECT TOP (2) id_producto, id_insumo, 1.00 FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.inventario_sucursal) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT s.sucursalid, i.id_insumo
            FROM (SELECT TOP (2) sucursalid FROM dbo.sucursales ORDER BY sucursalid) AS s
            CROSS JOIN (SELECT TOP (2) id_insumo FROM dbo.insumos ORDER BY id_insumo) AS i
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.inventario_sucursal inv
                WHERE inv.sucursalid = s.sucursalid AND inv.insumoid = i.id_insumo
            )
        )
        INSERT INTO dbo.inventario_sucursal (sucursalid, insumoid, stock_actual, stock_minimo)
        SELECT TOP (2) sucursalid, id_insumo, 20.00, 2.00 FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.movimientos_inventario) < 2
    BEGIN
        INSERT INTO dbo.movimientos_inventario (
            sucursalid, insumoid, tipo_movimiento, cantidad, referencia, id_usuario
        )
        SELECT TOP (2) s.sucursalid, i.id_insumo, 'entrada', 5.00, 'Carga de prueba', @usuario1
        FROM (SELECT TOP (2) sucursalid FROM dbo.sucursales ORDER BY sucursalid) AS s
        CROSS JOIN (SELECT TOP (2) id_insumo FROM dbo.insumos ORDER BY id_insumo) AS i;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.ventas) < 2
    BEGIN
        INSERT INTO dbo.ventas (
            id_cliente, id_usuario, sucursalid, mesaid, nombre_cliente,
            tipo_documento, correlativo, subtotal, iva, total, descuento,
            estado, estado_pedido, notas_generales
        )
        SELECT v.id_cliente, v.id_usuario, v.sucursalid, v.mesaid, v.nombre,
               'ticket', v.correlativo, 10.00, 1.30, 11.30, 0.00,
               'pagada', 'pagado', 'Venta de prueba'
        FROM (VALUES
            (@cliente1, @usuario1, @sucursal1, @mesa1, 'Cliente demo 1', 'DEMO-VENTA-01'),
            (@cliente2, @usuario2, @sucursal2, @mesa2, 'Cliente demo 2', 'DEMO-VENTA-02')
        ) AS v(id_cliente, id_usuario, sucursalid, mesaid, nombre, correlativo)
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.ventas x WHERE x.correlativo = v.correlativo
        );
    END;

    DECLARE @venta1 int, @venta2 int;
    SELECT @venta1 = MIN(id_venta), @venta2 = MAX(id_venta)
    FROM (SELECT TOP (2) id_venta FROM dbo.ventas ORDER BY id_venta) AS v;

    IF (SELECT COUNT_BIG(*) FROM dbo.venta_detalle) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT v.id_venta, p.id_producto
            FROM (SELECT TOP (2) id_venta FROM dbo.ventas ORDER BY id_venta) AS v
            CROSS JOIN (SELECT TOP (2) id_producto FROM dbo.productos ORDER BY id_producto) AS p
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.venta_detalle d
                WHERE d.id_venta = v.id_venta AND d.id_producto = p.id_producto
            )
        )
        INSERT INTO dbo.venta_detalle (
            id_venta, id_producto, cantidad, precio_unitario, subtotal_linea, notas
        )
        SELECT TOP (2) id_venta, id_producto, 1, 10.00, 10.00, 'Detalle de prueba'
        FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.detalle_venta_modificadores) < 2
    BEGIN
        INSERT INTO dbo.detalle_venta_modificadores (
            id_venta, id_producto, modificadorid, precio_aplicado
        )
        SELECT TOP (2) d.id_venta, d.id_producto, m.modificadorid, 0.50
        FROM (SELECT TOP (2) id_venta, id_producto FROM dbo.venta_detalle ORDER BY id_venta, id_producto) AS d
        CROSS JOIN (SELECT TOP (2) modificadorid FROM dbo.modificadores ORDER BY modificadorid) AS m;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.pagos) < 2
    BEGIN
        INSERT INTO dbo.pagos (id_venta, metodo_pago, monto, referencia_transaccion)
        SELECT TOP (2) id_venta, 'efectivo', 11.30, 'DEMO-PAGO'
        FROM (SELECT TOP (2) id_venta FROM dbo.ventas ORDER BY id_venta) AS v;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.cajas) < 2
    BEGIN
        INSERT INTO dbo.cajas (
            id_usuario, sucursalid, nombre_caja, fecha_apertura, fecha_cierre,
            monto_apertura, monto_cierre_sistema, monto_cierre_fisico,
            diferencia, estado, observaciones_apertura, observaciones_cierre
        )
        SELECT TOP (2) u.id_usuario, s.sucursalid, 'Caja demo', SYSDATETIME(),
               SYSDATETIME(), 0.00, 0.00, 0.00, 0.00, 'cerrada',
               'Caja de prueba', 'Caja cerrada de prueba'
        FROM (SELECT TOP (2) id_usuario FROM dbo.usuarios ORDER BY id_usuario) AS u
        CROSS JOIN (SELECT TOP (2) sucursalid FROM dbo.sucursales ORDER BY sucursalid) AS s;
    END;

    DECLARE @caja1 int, @caja2 int;
    SELECT @caja1 = MIN(id_caja), @caja2 = MAX(id_caja)
    FROM (SELECT TOP (2) id_caja FROM dbo.cajas ORDER BY id_caja) AS c;

    IF (SELECT COUNT_BIG(*) FROM dbo.movimientos_caja) < 2
    BEGIN
        INSERT INTO dbo.movimientos_caja (
            cajaid, tipo_movimiento, monto, motivo, empleado_autoriza_id
        )
        VALUES
            (@caja1, 'ingreso_extra', 5.00, 'Movimiento de prueba 1', @empleado1),
            (@caja2, 'retiro', 2.00, 'Movimiento de prueba 2', @empleado2);
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.compras) < 2
    BEGIN
        INSERT INTO dbo.compras (
            id_proveedor, sucursalid, numero_factura_proveedor, subtotal,
            iva, total_compra, estado_pago, condicion_pago, clasificacion
        )
        VALUES
            (@proveedor1, @sucursal1, 'DEMO-COMPRA-01', 10.00, 1.30, 11.30, 'pendiente', 'contado', 'Insumos'),
            (@proveedor2, @sucursal2, 'DEMO-COMPRA-02', 20.00, 2.60, 22.60, 'pendiente', 'contado', 'Insumos');
    END;

    DECLARE @compra1 int, @compra2 int;
    SELECT @compra1 = MIN(id_compra), @compra2 = MAX(id_compra)
    FROM (SELECT TOP (2) id_compra FROM dbo.compras ORDER BY id_compra) AS c;

    IF (SELECT COUNT_BIG(*) FROM dbo.compra_detalle) < 2
    BEGIN
        ;WITH candidatos AS (
            SELECT c.id_compra, i.id_insumo
            FROM (SELECT TOP (2) id_compra FROM dbo.compras ORDER BY id_compra) AS c
            CROSS JOIN (SELECT TOP (2) id_insumo FROM dbo.insumos ORDER BY id_insumo) AS i
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.compra_detalle d
                WHERE d.id_compra = c.id_compra AND d.id_insumo = i.id_insumo
            )
        )
        INSERT INTO dbo.compra_detalle (id_compra, id_insumo, cantidad, costo_unitario, subtotal)
        SELECT TOP (2) id_compra, id_insumo, 2.00, 1.0000, 2.00 FROM candidatos;
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.pagos_compra) < 2
    BEGIN
        INSERT INTO dbo.pagos_compra (id_compra, monto, metodo_pago, referencia, id_usuario)
        VALUES
            (@compra1, 5.00, 'efectivo', 'DEMO-ABONO-01', @usuario1),
            (@compra2, 5.00, 'efectivo', 'DEMO-ABONO-02', @usuario2);
    END;

    IF (SELECT COUNT_BIG(*) FROM dbo.reservas) < 2
    BEGIN
        INSERT INTO dbo.reservas (
            mesaid, id_cliente, fecha_hora_inicio, duracion_minutos,
            cantidad_personas, estado, notas
        )
        VALUES
            (@mesa1, @cliente1, DATEADD(day, 1, SYSDATETIME()), 90, 2, 'pendiente', 'Reserva de prueba 1'),
            (@mesa2, @cliente2, DATEADD(day, 2, SYSDATETIME()), 90, 4, 'pendiente', 'Reserva de prueba 2');
    END;

    DECLARE @conteos TABLE (tabla sysname NOT NULL, cantidad bigint NOT NULL);
    INSERT INTO @conteos (tabla, cantidad)
    SELECT 'cajas', COUNT_BIG(*) FROM dbo.cajas
    UNION ALL SELECT 'clientes', COUNT_BIG(*) FROM dbo.clientes
    UNION ALL SELECT 'compra_detalle', COUNT_BIG(*) FROM dbo.compra_detalle
    UNION ALL SELECT 'compras', COUNT_BIG(*) FROM dbo.compras
    UNION ALL SELECT 'detalle_venta_modificadores', COUNT_BIG(*) FROM dbo.detalle_venta_modificadores
    UNION ALL SELECT 'empleados', COUNT_BIG(*) FROM dbo.empleados
    UNION ALL SELECT 'insumos', COUNT_BIG(*) FROM dbo.insumos
    UNION ALL SELECT 'inventario_sucursal', COUNT_BIG(*) FROM dbo.inventario_sucursal
    UNION ALL SELECT 'mesas', COUNT_BIG(*) FROM dbo.mesas
    UNION ALL SELECT 'modificadores', COUNT_BIG(*) FROM dbo.modificadores
    UNION ALL SELECT 'movimientos_caja', COUNT_BIG(*) FROM dbo.movimientos_caja
    UNION ALL SELECT 'movimientos_inventario', COUNT_BIG(*) FROM dbo.movimientos_inventario
    UNION ALL SELECT 'nivel_permiso', COUNT_BIG(*) FROM dbo.nivel_permiso
    UNION ALL SELECT 'niveles_acceso', COUNT_BIG(*) FROM dbo.niveles_acceso
    UNION ALL SELECT 'pagos', COUNT_BIG(*) FROM dbo.pagos
    UNION ALL SELECT 'pagos_compra', COUNT_BIG(*) FROM dbo.pagos_compra
    UNION ALL SELECT 'planilla_detalle', COUNT_BIG(*) FROM dbo.planilla_detalle
    UNION ALL SELECT 'planillas', COUNT_BIG(*) FROM dbo.planillas
    UNION ALL SELECT 'permisos', COUNT_BIG(*) FROM dbo.permisos
    UNION ALL SELECT 'productos', COUNT_BIG(*) FROM dbo.productos
    UNION ALL SELECT 'proveedores', COUNT_BIG(*) FROM dbo.proveedores
    UNION ALL SELECT 'recetas_detalle', COUNT_BIG(*) FROM dbo.recetas_detalle
    UNION ALL SELECT 'reservas', COUNT_BIG(*) FROM dbo.reservas
    UNION ALL SELECT 'roles', COUNT_BIG(*) FROM dbo.roles
    UNION ALL SELECT 'sucursales', COUNT_BIG(*) FROM dbo.sucursales
    UNION ALL SELECT 'usuarios', COUNT_BIG(*) FROM dbo.usuarios
    UNION ALL SELECT 'venta_detalle', COUNT_BIG(*) FROM dbo.venta_detalle
    UNION ALL SELECT 'ventas', COUNT_BIG(*) FROM dbo.ventas;

    IF EXISTS (SELECT 1 FROM @conteos WHERE cantidad < 2)
    BEGIN
        ;THROW 51000, 'Una o mas tablas siguen teniendo menos de dos registros.', 1;
    END;

    COMMIT TRANSACTION;

    SELECT tabla, cantidad
    FROM @conteos
    ORDER BY tabla;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
