/*Enrutador de Express*/
import { Router } from 'express';
/*Controlador de reporte consolidado*/
import { reporteConsolidadoControlador } from '../controladores/reporteControlador.js';

/*Crea router para endpoints de reportes*/
const router = Router();

/*Endpoint GET /api/reportes/consolidado*/
router.get('/consolidado', reporteConsolidadoControlador);

/*Exporta el router de reportes*/
export default router;