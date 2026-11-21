/*Módulo de enrutamiento de Express*/
import { Router } from 'express';
/*Controladores de stock y ventas para el punto de venta*/
import {
  crearVentaPosControlador,
  validarStockPosControlador,
} from '../controladores/posControlador.js';

/*Crea una instancia de router para los endpoints del POS*/
const router = Router();

/*Endpoint para verificar en tiempo real si el carrito tiene stock suficiente*/
router.post('/validar-stock', validarStockPosControlador);

/*Endpoint principal para registrar una venta en el POS*/
router.post('/ventas', crearVentaPosControlador);

/*Exporta el router para montarlo en la aplicación principal de Express*/
export default router;