import '../src/login.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import { guardarSesion, solicitudApi } from '../src/api.js';

function Login({ onLogin }) {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [sucursalid, setSucursalid] = useState('');
    const [sucursales, setSucursales] = useState([]);
    const [cargandoSucursales, setCargandoSucursales] = useState(true);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        let activo = true;
        solicitudApi('/sucursales')
            .then((respuesta) => {
                if (activo) setSucursales(respuesta.sucursales);
            })
            .catch((fallo) => {
                if (activo) setError(fallo.message);
            })
            .finally(() => {
                if (activo) setCargandoSucursales(false);
            });
        return () => { activo = false; };
    }, []);

    //funcion que se ejecuta cuadno se da clic en el boton 'ACCEDER'
    const manejarLogin = async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        setError('');
        setCargando(true);

        try {
            const sesion = await solicitudApi('/login', {
                method: 'POST',
                body: { correo: correo.trim(), password, sucursalid: Number(sucursalid) }
            });
            guardarSesion(sesion);
            onLogin(sesion);
        } catch (error) {
            setError(error.message || 'No se pudo iniciar sesión.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <section className='loginSection'>
            <div className='mainContainer'>
                <div className="px-4 py-5 px-md-5 text-center text-lg-start" >
                    <div className="container" >
                        <div className="row gx-lg-5 align-items-center" >
                            <div className="col-lg-6 mb-5 mb-lg-5">
                                <img className="login-brand-logo" src="/brand/origenes-logo.png" alt="Orígenes SV" />
                                <h1 className="my-5 display-3 fw-bold ls-tight">
                                    Todo listo <br />
                                    <span className=" " style={{ color: '#B95136' }}>para un buen servicio</span>
                                </h1>
                                <p style={{ color: '#7A7D75' }}>
                                    Ingresa a tu espacio de trabajo para continuar la
                                    operación de tu sucursal.
                                </p>
                            </div>

                            <div className="col-lg-6 mb-5 mb-lg-0" >
                                <div className="card" style={{ borderRadius: '16px' }}>
                                    <div className="card-body py-5 px-md-5">
                                        <h3 className="fw-bold ls-tight">Iniciar sesión</h3>
                                        <span style={{ color: '#7A7D75', fontSize: '16px' }}>Usa las credenciales de tu cuenta para iniciar sesión.</span>
                                        <form onSubmit={manejarLogin}>
                                            <div data-mdb-input-init className="form-outline mb-4" style={{ marginTop: '20px' }}>
                                                <label className="form-label fw-bold" htmlFor="form3Example3" style={{ fontSize: '16px' }}>Correo o código de empleado</label>
                                                <input
                                                    type="text"
                                                    id="form3Example3"
                                                    className="form-control"
                                                    value={correo}
                                                    onChange={(event) => setCorreo(event.target.value)}
                                                    autoComplete="username"
                                                    maxLength={150}
                                                    required
                                                />
                                            </div>

                                            <div className="form-outline mb-4">
                                                <label className="form-label fw-bold" htmlFor="sucursal-login" style={{ fontSize: '16px' }}>Sucursal</label>
                                                <select
                                                    id="sucursal-login"
                                                    className="form-select"
                                                    value={sucursalid}
                                                    onChange={(event) => setSucursalid(event.target.value)}
                                                    autoComplete="organization"
                                                    required
                                                    disabled={cargandoSucursales || sucursales.length === 0}
                                                >
                                                    <option value="">
                                                        {cargandoSucursales ? 'Cargando sucursales…' : 'Selecciona tu sucursal'}
                                                    </option>
                                                    {sucursales.map((sucursal) => (
                                                        <option key={sucursal.sucursalid} value={sucursal.sucursalid}>
                                                            {sucursal.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div data-mdb-input-init className="form-outline mb-4">
                                                <label className="form-label fw-bold" htmlFor="form3Example4" style={{ fontSize: '16px' }}>Contraseña</label>
                                                <input
                                                    type="password"
                                                    id="form3Example4"
                                                    className="form-control"
                                                    value={password}
                                                    onChange={(event) => setPassword(event.target.value)}
                                                    autoComplete="current-password"
                                                    required
                                                />
                                            </div>
                                            {error && <div className="alert alert-danger" role="alert">{error}</div>}
                                            <button
                                                type="submit"
                                                data-mdb-button-init
                                                data-mdb-ripple-init
                                                className="button-custom btn btn-block mb-4 p"
                                                disabled={cargando || cargandoSucursales || !sucursalid}
                                            >
                                                
                                                {/*flecha para acceder*/}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-arrow-right-short mb-1" viewBox="0 0 16 16">
                                                    <path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8" />
                                                </svg>

                                                <span className="m-1">{cargando ? 'Ingresando...' : 'Acceder'}</span>
                                            </button>

                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        

    );
}

export default Login;