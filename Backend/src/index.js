import enrutadorInventario from './rutas/inventarioRutas.js';
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

// Módulo Inventario y Recetas (Carlos)
app.use('/api/inventario', enrutadorInventario);

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

/*Endpoint de ventas*/
app.post('/api/ventas', async (req, res) => {

    try{
        /*1. Recibimos los datos del Frontend (cajero)
        tipoDocumento: "Factura o CCF"
        productos: arreglo con {id_producto, cantidad}*/
        const {tipoDocumento, id_usuario, productos, metodoPago, referenciaPago} = req.body;

        /*2. Validamos que manden datos (ni modo que aceptemos a si vacio)*/
        if(!productos || productos.length === 0){
            return res.status(400).json({mensaje: "No hay productos en la venta"});
        }

        /*3. Calculamos el total bruto (sumando precio * cantidad)*/
        let totalBruto = 0;
        const detallesParaGuardar = [];
        //arreglo para guardar los detalles calculados
        for(const item of productos){
            const productoDB = await prisma.productos.findUnique({
                where: {id_producto: item.id_producto}
            });

            if(!productoDB){
                return res.status(404).json({mensaje: `Producto ${item.id_producto} no existe`});
            }

            /*Convertimos el Decimal de SQL Server a Número para operar*/
            const precio = Number(productoDB.precio_venta);
            const subtotalLinea = precio * item.cantidad;
            totalBruto += subtotalLinea;

            /*Guardamos temporalmente el detalle con su precio real y subtotal*/
            detallesParaGuardar.push({
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: precio,
                subtotal_linea: subtotalLinea
            });
        }
      
        /*4. calculamos el desglose del IVA*/
        const {subtotal, iva} = calcularIVA(totalBruto);

        /*5. Generamos el correlativo (Factura o CCF)*/
        const correlativo = await generarCorrelativo(tipoDocumento);

        /*6. Guardamos la venta en la Base de datos con prisma*/
        const nuevaVenta = await prisma.ventas.create({
            data: {
                id_usuario: id_usuario,
                tipo_documento: tipoDocumento,
                correlativo: correlativo,
                subtotal: subtotal,
                iva: iva,
                total: totalBruto,
                estado: 'Pagada',
                venta_detalle: {
                    create: detallesParaGuardar
                }
            }
        });
    /*Guardamos el pago asociado a esta venta*/
    await prisma.pagos.create({
        data: {
            id_venta: nuevaVenta.id_venta, /*Lo vinculamos a la venta que acabamos de crear*/

            metodo_pago: metodoPago || 'Efectivo', /*Si no mandan método, por defecto
            es Efectivo*/

            monto: totalBruto,
            referencia_transaccion: referenciaPago || null /*Para el número de voucher
            o Chivo*/
        }
    });
    
    /*Desconectamis inventario (El código)*/
for(const item of productos){
const receta = await prisma.recetas_detalle.findMany({
    where: {id_producto: item.id_producto}
});

if(receta.length > 0){
for(const ingrediente of receta){
const cantidadUsada = Number(ingrediente.cantidad_requerida)* item.cantidad;

await prisma.insumos.update({
where: {id_insumo: ingrediente.id_insumo},
data: {stock_actual: {decrement: cantidadUsada}}
});
}
}
}

/*7. Respondemos al Frontend*/
res.status(201).json({
    mensaje: "Venta registrada exitosamente",
    correlativo: nuevaVenta.correlativo,
    total: nuevaVenta.total
});
    }catch(error){
        console.error(error);
        res.status(500).json({mensaje: "Error interno al registrar la venta"});
    }

});

/*Endpoint para iniciar sesión*/
app.post('/api/login', async (req,res) => {
    try{
        /*1. Recibir el correo y la contraseña que manda React*/
        const {correo, password }= req.body;

        /*2.Validamos que no venga vacío*/
        if(!correo || !password){
return res.status(400).json({mensaje: "El correo y la constraseña son obligatorios"});
        }

        /*3. Buscamos al usuario en la base de datos por su correo*/
        const usuarioEncontrado = await prisma.usuarios.findUnique({where: {correo: correo}});

        /*4. Si no existe el usuario o la contraseña no coincide,rebotamos*/
        if(!usuarioEncontrado || usuarioEncontrado.password_hash !== password){
            return res.status(401).json({mensaje: "Credenciales incorrectas"});
        }

        /*5. Si todo esta bien, quitamos la contraseña de la respuesta 
        por seguridad*/
        const {password_hash, ...usuarioSeguro} = usuarioEncontrado;

        /*6. Respondemos con exito y los datos del usuario*/
        res.status(200).json({
          mensaje: "Inicio de sesión exitoso",
          usuario: usuarioSeguro
        });
    }catch(error){
        console.error(error);
        res.status(500).json({mensaje: "Error interno del servidor"});
    }
});