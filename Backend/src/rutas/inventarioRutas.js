import { Router } from 'express';
import {
    explotarMateriales,
    simularExplosionMateriales,
    consultarAlertasStock,
    consultarInsumos,
    consultarRecetas,
    consultarRecetaDeProducto
} from '../controladores/inventarioControlador.js';

const enrutadorInventario = Router();

enrutadorInventario.post('/explosion', explotarMateriales);
enrutadorInventario.post('/explosion/simulacion', simularExplosionMateriales);
enrutadorInventario.get('/alertas', consultarAlertasStock);
enrutadorInventario.get('/insumos', consultarInsumos);
enrutadorInventario.get('/recetas', consultarRecetas);
enrutadorInventario.get('/recetas/:id_producto', consultarRecetaDeProducto);

export default enrutadorInventario;