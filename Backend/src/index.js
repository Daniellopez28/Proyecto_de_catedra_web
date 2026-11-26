import enrutadorInventario from './rutas/inventarioRutas.js';
import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';
import planilla_routes from './routes/planilla.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import empleadosRoutes from './routes/empleados.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import cajaRoutes from './routes/caja.routes.js';
import productosRoutes from './routes/productos.routes.js';
import comprasRoutes from './routes/compras.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import mesasRoutes from './routes/mesas.routes.js';
import modificadoresRoutes from './routes/modificadores.routes.js';
import administracionRoutes from './routes/administracion.routes.js';
import {
    etiquetaSucursalEmpleado,
    nombresBaseSucursalesEmpleados,
    sucursalesEmpleados
} from './constants/sucursalesEmpleados.js';
import {
    cerrarSesion,
    crearSesion,
    requerirAutenticacion
} from './middleware/autenticacion.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/planillas', planilla_routes);
app.use('/api/ventas', requerirAutenticacion, ventasRoutes);
app.use('/api/empleados', requerirAutenticacion, empleadosRoutes);
app.use('/api/reservas', requerirAutenticacion, reservasRoutes);
app.use('/api/caja', requerirAutenticacion, cajaRoutes);
app.use('/api/productos', requerirAutenticacion, productosRoutes);
app.use('/api/compras', requerirAutenticacion, comprasRoutes);
app.use('/api/proveedores', requerirAutenticacion, proveedoresRoutes);
app.use('/api/reportes', requerirAutenticacion, reportesRoutes);
app.use('/api/usuarios', requerirAutenticacion, usuariosRoutes);
app.use('/api/mesas', requerirAutenticacion, mesasRoutes);
app.use('/api/modificadores', requerirAutenticacion, modificadoresRoutes);
app.use('/api/administracion', requerirAutenticacion, administracionRoutes);

app.get('/', (_req, res) => {
    res.send('API del Restaurante Orígenes SV - Módulo de Ventas funcionando');
});

app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1 AS disponible`;
        return res.status(200).json({ estado: 'ok', base_datos: 'conectada' });
    } catch (error) {
        console.error('No se pudo consultar la base de datos:', error);
        return res.status(503).json({ estado: 'error', base_datos: 'no disponible' });
    }
});

app.get('/api/sucursales', async (_req, res) => {
    try {
        const sucursales = await prisma.sucursales.findMany({
            where: {
                activo: true,
                nombre: { in: nombresBaseSucursalesEmpleados }
            },
            select: { sucursalid: true, nombre: true }
        });
        const porNombre = new Map(sucursales.map((sucursal) => [
            sucursal.nombre.trim().toLocaleLowerCase('es-SV'),
            sucursal
        ]));
        return res.json({
            sucursales: sucursalesEmpleados.flatMap((sucursal) => {
                const encontrada = porNombre.get(sucursal.nombreBase);
                return encontrada
                    ? [{
                        sucursalid: encontrada.sucursalid,
                        nombre: etiquetaSucursalEmpleado(encontrada.nombre)
                    }]
                    : [];
            })
        });
    } catch (error) {
        console.error('Error al consultar sucursales para iniciar sesión:', error);
        return res.status(500).json({ mensaje: 'No se pudieron consultar las sucursales' });
    }
});

// Módulo Inventario y Recetas (Carlos)
app.use('/api/inventario', requerirAutenticacion, enrutadorInventario);

/*Endpoint para iniciar sesión*/
app.post('/api/login', async (req,res) => {
    try{
        /*1. Recibir el correo y la contraseña que manda React*/
        const {correo, password, sucursalid }= req.body ?? {};
        const idSucursal = Number(sucursalid);

        /*2.Validamos que no venga vacío*/
        if(typeof correo !== 'string' || !correo.trim() || typeof password !== 'string' || !password ||
            !Number.isInteger(idSucursal) || idSucursal <= 0){
            return res.status(400).json({mensaje: 'El usuario, la contraseña y una sucursal válida son obligatorios'});
        }

        const sucursalSeleccionada = await prisma.sucursales.findFirst({
            where: {
                sucursalid: idSucursal,
                activo: true,
                nombre: { in: nombresBaseSucursalesEmpleados }
            },
            select: { sucursalid: true }
        });
        if (!sucursalSeleccionada) {
            return res.status(400).json({ mensaje: 'Selecciona una de las sucursales disponibles' });
        }

        /*3. El procedimiento valida el hash con salt y registra el ultimo acceso*/
        let [usuarioEncontrado] = await prisma.$queryRaw`
            EXEC dbo.sp_login_empleado
                @identificador = ${correo.trim()},
                @password = ${password},
                @sucursalid = ${sucursalSeleccionada.sucursalid}
        `;

        if(!usuarioEncontrado){
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas o usuario no registrado en esta sucursal'
            });
        }

        const filasPermisos = await prisma.$queryRaw`
            EXEC dbo.sp_permisos_usuario @id_usuario = ${usuarioEncontrado.id_usuario}
        `;
        const permisos = filasPermisos.map((permiso) => permiso.codigo);
        const token = crearSesion(usuarioEncontrado, permisos);

        res.status(200).json({
          mensaje: "Inicio de sesión exitoso",
          token,
          usuario: { ...usuarioEncontrado, permisos }
        });
    }catch(error){
        console.error(error);
        res.status(500).json({mensaje: "Error interno del servidor"});
    }
});

app.post('/api/logout', requerirAutenticacion, (req, res) => {
    cerrarSesion(req.auth.token);
    return res.json({ mensaje: 'Sesión cerrada' });
});

app.get('/api/session', requerirAutenticacion, (req, res) => {
    return res.json({
        token: req.auth.token,
        usuario: { ...req.auth.usuario, permisos: [...req.auth.permisos] }
    });
});

app.post('/api/cambiar-password', requerirAutenticacion, async (req, res) => {
    const { password_actual, password_nueva } = req.body ?? {};
    if (typeof password_actual !== 'string' || !password_actual ||
        typeof password_nueva !== 'string' || password_nueva.length < 8 || password_nueva.length > 100) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe tener entre 8 y 100 caracteres' });
    }

    try {
        await prisma.$queryRaw`
            EXEC dbo.sp_cambiar_password
                @id_usuario = ${req.auth.usuario.id_usuario},
                @password_actual = ${password_actual},
                @password_nueva = ${password_nueva}
        `;
        req.auth.usuario.debe_cambiar_password = false;
        return res.json({ mensaje: 'Contraseña actualizada' });
    } catch (error) {
        const numeroError = error.originalError?.info?.number ?? error.number;
        if (numeroError === 50011) {
            return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });
        }
        console.error('Error al cambiar contraseña:', error);
        return res.status(500).json({ mensaje: 'No se pudo cambiar la contraseña' });
    }
});

app.use((req, res) => {
    return res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la solicitud debe ser JSON válido' });
    }
    console.error('Error no controlado en la API:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535');
}

async function iniciarServidor() {
    await prisma.$connect();
    app.listen(PORT, () => {
        console.log(`Servidor POS corriendo en http://localhost:${PORT}`);
    });
}

iniciarServidor().catch(async (error) => {
    console.error('No se pudo iniciar el servidor o conectar con la base de datos:', error);
    await prisma.$disconnect();
    process.exitCode = 1;
});