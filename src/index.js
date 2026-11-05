import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';

const app = express();
app.use(cors());
app.use(express.json());

//Rutas de ventas
app.get('/', (req, res) =>{
    res.send('API del Restaurante Orígenes SV - Módulo de Ventas funcionando');
});

const PORT = 3000;
app.listen(PORT,() => {
    console.log(`Servidor POS corriendo en http://localhost:${PORT}`);
});

/*Función para calcular el IVA hacia atras (porque ya viene en el precio)*/
function calcularIVA(totalConIva){
//Redondeamosa  2 decimales para evitar problemas con decimales flotantes
const subtotal = Number((totalConIva / 1.13).toFixed(2));
const iva = Number((totalConIva - subtotal).toFixed(2));

return {subtotal, iva};
}

/*Función para generar el siguiente correlativo (Ej: F-001)*/
async function generarCorrelativo(tipoDocumento){
//Buscamos la última venta de este tipo de documento
const ultimaVenta = await prisma.ventas.findFirst({
    where: {tipo_documento : tipoDocumento},
    orderBy : {id_venta: 'desc'}
});

if(!ultimaVenta){
    //si no hay ventas, empezamos en 1
    return tipoDocumento === 'CCF' ? 'CCF-0001' : 'F-0001';
}

/*Si ya hay, extraemos el número, le sumamos 1 y lo volvemos a armar
Ejemplo: si es "F-0005", sacamos el 5, lo volvemos 6 y queda "F-0006" */
const partes = ultimaVenta.correlativo.split('-');
const numero = parseInt(partes[1], 10) + 1;
const numeroFormateado = numero.toString().padStart(4, '0');

return `${tipoDocumento}-${numeroFormateado}`;
}