import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

router.get('/ventas', requerirPermiso('ver_reportes'), async (req, res) => {
    try {
        const ventas = req.auth.usuario.sucursalid
            ? await prisma.$queryRaw`
                SELECT s.nombre AS sucursal, v.tipo_documento,
                       COUNT_BIG(*) AS cantidad_ventas,
                       SUM(v.subtotal) AS total_subtotal,
                       SUM(v.iva) AS total_iva,
                       SUM(v.total) AS total_facturado
                FROM dbo.ventas v
                INNER JOIN dbo.sucursales s ON s.sucursalid = v.sucursalid
                WHERE v.sucursalid = ${req.auth.usuario.sucursalid}
                GROUP BY s.nombre, v.tipo_documento
                ORDER BY s.nombre, v.tipo_documento
            `
            : await prisma.$queryRaw`
            SELECT sucursal, tipo_documento, cantidad_ventas, total_subtotal, total_iva, total_facturado
            FROM dbo.v_reporte_ventas_sucursal
            ORDER BY sucursal, tipo_documento
        `;
        return res.json({
            total: ventas.length,
            ventas: ventas.map((venta) => ({
                ...venta,
                cantidad_ventas: Number(venta.cantidad_ventas)
            }))
        });
    } catch (error) {
        console.error('Error al consultar reporte de ventas:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar el reporte de ventas' });
    }
});

router.get('/inventario', requerirPermiso('ver_reportes'), async (req, res) => {
    try {
        const alertas = req.auth.usuario.sucursalid
            ? await prisma.$queryRaw`
                SELECT i.insumoid AS id_insumo, s.nombre AS insumo, s.unidad_medida,
                       i.stock_actual, i.stock_minimo,
                       CASE WHEN i.stock_minimo > i.stock_actual
                            THEN i.stock_minimo - i.stock_actual ELSE 0 END AS cantidad_faltante
                FROM dbo.inventario_sucursal i
                INNER JOIN dbo.insumos s ON s.id_insumo = i.insumoid
                WHERE i.sucursalid = ${req.auth.usuario.sucursalid}
                  AND s.activo = 1
                  AND i.stock_actual <= i.stock_minimo
                ORDER BY cantidad_faltante DESC, s.nombre
            `
            : await prisma.$queryRaw`
            SELECT id_insumo, insumo, unidad_medida, stock_actual, stock_minimo, cantidad_faltante
            FROM dbo.v_reporte_alertas_stock
            ORDER BY cantidad_faltante DESC, insumo
        `;
        return res.json({ total: alertas.length, alertas });
    } catch (error) {
        console.error('Error al consultar reporte de inventario:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar el reporte de inventario' });
    }
});

router.get('/planillas', requerirPermiso('ver_reportes'), async (req, res) => {
    const idPlanilla = req.query.id_planilla === undefined ? null : Number(req.query.id_planilla);
    if (idPlanilla !== null && (!Number.isInteger(idPlanilla) || idPlanilla <= 0)) {
        return res.status(400).json({ mensaje: 'El id_planilla no es válido' });
    }

    try {
        const sucursalid = req.auth.usuario.sucursalid;
        const filas = idPlanilla === null
            ? sucursalid
                ? await prisma.$queryRaw`
                    SELECT r.id_planilla, r.periodo_inicio, r.periodo_fin, r.estado, r.id_empleado,
                           r.codigo_empleado, r.nombre_completo, r.cargo, r.salario_bruto,
                           r.descuento_isss, r.descuento_afp, r.descuento_renta, r.salario_neto
                    FROM dbo.v_reporte_planilla r
                    INNER JOIN dbo.empleados e ON e.id_empleado = r.id_empleado
                    WHERE e.sucursalid = ${sucursalid}
                    ORDER BY r.periodo_inicio DESC, r.nombre_completo
                `
                : await prisma.$queryRaw`
                SELECT id_planilla, periodo_inicio, periodo_fin, estado, id_empleado, codigo_empleado,
                       nombre_completo, cargo, salario_bruto, descuento_isss, descuento_afp,
                       descuento_renta, salario_neto
                FROM dbo.v_reporte_planilla
                ORDER BY periodo_inicio DESC, nombre_completo
            `
            : sucursalid
                ? await prisma.$queryRaw`
                    SELECT r.id_planilla, r.periodo_inicio, r.periodo_fin, r.estado, r.id_empleado,
                           r.codigo_empleado, r.nombre_completo, r.cargo, r.salario_bruto,
                           r.descuento_isss, r.descuento_afp, r.descuento_renta, r.salario_neto
                    FROM dbo.v_reporte_planilla r
                    INNER JOIN dbo.empleados e ON e.id_empleado = r.id_empleado
                    WHERE e.sucursalid = ${sucursalid} AND r.id_planilla = ${idPlanilla}
                    ORDER BY r.nombre_completo
                `
                : await prisma.$queryRaw`
                SELECT id_planilla, periodo_inicio, periodo_fin, estado, id_empleado, codigo_empleado,
                       nombre_completo, cargo, salario_bruto, descuento_isss, descuento_afp,
                       descuento_renta, salario_neto
                FROM dbo.v_reporte_planilla
                WHERE id_planilla = ${idPlanilla}
                ORDER BY nombre_completo
            `;
        return res.json({ total: filas.length, filas });
    } catch (error) {
        console.error('Error al consultar reporte de planillas:', error);
        return res.status(500).json({ mensaje: 'No se pudo consultar el reporte de planillas' });
    }
});

export default router;
