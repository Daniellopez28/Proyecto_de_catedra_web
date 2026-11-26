import { Router } from 'express';
import {
    explotarMateriales,
    simularExplosionMateriales,
    consultarAlertasStock,
    consultarInsumos,
    consultarCatalogoInsumos,
    consultarRecetas,
    consultarRecetaDeProducto,
    registrarInsumo,
    actualizarInsumo,
    ajustarInventario,
    consultarMovimientosInventario
} from '../controladores/inventarioControlador.js';
import { requerirPermiso } from '../middleware/autenticacion.js';

const enrutadorInventario = Router();

enrutadorInventario.post('/explosion', requerirPermiso('gestionar_inventario'), explotarMateriales);
enrutadorInventario.post('/explosion/simulacion', requerirPermiso('ver_inventario'), simularExplosionMateriales);
enrutadorInventario.get('/alertas', requerirPermiso('ver_inventario'), consultarAlertasStock);
enrutadorInventario.get('/insumos/catalogo', requerirPermiso('gestionar_inventario'), consultarCatalogoInsumos);
enrutadorInventario.get('/insumos', requerirPermiso('ver_inventario'), consultarInsumos);
enrutadorInventario.get('/recetas', requerirPermiso('gestionar_inventario'), consultarRecetas);
enrutadorInventario.get('/recetas/:id_producto', requerirPermiso('gestionar_inventario'), consultarRecetaDeProducto);
enrutadorInventario.post('/insumos', requerirPermiso('gestionar_inventario'), registrarInsumo);
enrutadorInventario.patch('/insumos/:id', requerirPermiso('gestionar_inventario'), actualizarInsumo);
enrutadorInventario.post('/ajustes', requerirPermiso('gestionar_inventario'), ajustarInventario);
enrutadorInventario.get('/movimientos', requerirPermiso('ver_inventario'), consultarMovimientosInventario);

export default enrutadorInventario;