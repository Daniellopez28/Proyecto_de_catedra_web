import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const router = Router();

function textoOpcional(valor, limite) {
    return valor === undefined || valor === null || (typeof valor === 'string' && valor.length <= limite);
}

router.get('/', requerirPermiso('ver_proveedores'), async (req, res) => {
    try {
        const proveedores = await prisma.proveedores.findMany({
            where: { activo: true },
            orderBy: { nombre_empresa: 'asc' }
        });
        return res.json({ total: proveedores.length, proveedores });
    } catch (error) {
        console.error('Error al consultar proveedores:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar los proveedores' });
    }
});

router.post('/', requerirPermiso('registrar_compras'), async (req, res) => {
    const { nombre_empresa, contacto_nombre, nit, telefono, correo, direccion } = req.body ?? {};
    if (typeof nombre_empresa !== 'string' || !nombre_empresa.trim() || nombre_empresa.length > 150 ||
        !textoOpcional(contacto_nombre, 100) || !textoOpcional(nit, 17) ||
        !textoOpcional(telefono, 20) || !textoOpcional(correo, 150) ||
        !textoOpcional(direccion, 4000)) {
        return res.status(400).json({ mensaje: 'Revisa los datos del proveedor' });
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
    }

    try {
        const proveedor = await prisma.proveedores.create({
            data: {
                nombre_empresa: nombre_empresa.trim(),
                contacto_nombre: contacto_nombre?.trim() || null,
                nit: nit?.trim() || null,
                telefono: telefono?.trim() || null,
                correo: correo?.trim() || null,
                direccion: direccion?.trim() || null
            }
        });
        return res.status(201).json({ mensaje: 'Proveedor registrado', proveedor });
    } catch (error) {
        console.error('Error al registrar proveedor:', error);
        return res.status(500).json({ mensaje: 'No se pudo registrar el proveedor' });
    }
});

router.patch('/:id', requerirPermiso('registrar_compras'), async (req, res) => {
    const idProveedor = Number(req.params.id);
    const { nombre_empresa, contacto_nombre, nit, telefono, correo, direccion, activo } = req.body ?? {};
    const campos = { nombre_empresa, contacto_nombre, nit, telefono, correo, direccion, activo };
    if (!Number.isInteger(idProveedor) || idProveedor <= 0 ||
        Object.values(campos).every((valor) => valor === undefined) ||
        (nombre_empresa !== undefined &&
            (typeof nombre_empresa !== 'string' || !nombre_empresa.trim() || nombre_empresa.length > 150)) ||
        !textoOpcional(contacto_nombre, 100) || !textoOpcional(nit, 17) ||
        !textoOpcional(telefono, 20) || !textoOpcional(correo, 150) ||
        !textoOpcional(direccion, 4000) || (activo !== undefined && typeof activo !== 'boolean')) {
        return res.status(400).json({ mensaje: 'Revisa el id y los campos del proveedor' });
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
    }

    try {
        const proveedor = await prisma.proveedores.update({
            where: { id_proveedor: idProveedor },
            data: {
                ...(nombre_empresa !== undefined ? { nombre_empresa: nombre_empresa.trim() } : {}),
                ...(contacto_nombre !== undefined ? { contacto_nombre: contacto_nombre?.trim() || null } : {}),
                ...(nit !== undefined ? { nit: nit?.trim() || null } : {}),
                ...(telefono !== undefined ? { telefono: telefono?.trim() || null } : {}),
                ...(correo !== undefined ? { correo: correo?.trim() || null } : {}),
                ...(direccion !== undefined ? { direccion: direccion?.trim() || null } : {}),
                ...(activo !== undefined ? { activo } : {})
            }
        });
        return res.json({ mensaje: 'Proveedor actualizado', proveedor });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        console.error('Error al actualizar proveedor:', error);
        return res.status(500).json({ mensaje: 'No se pudo actualizar el proveedor' });
    }
});

export default router;
