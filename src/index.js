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