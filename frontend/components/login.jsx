import '../src/login.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';

//creacion de diseño para el inicio de sesion, hace falta la logica.
function Login() {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    //funcion que se ejecuta cuadno se da clic en el boton 'ACCEDER'
    const manejarLogin = async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        setError('');
        setCargando(true);

        try {
            // cambio: hacemos la petición a tu Backend
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correo, password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Si el login es correcto, guardamos el usuario en el navegador
                localStorage.setItem('usuarioLogueado', JSON.stringify(datos.usuario));
                alert('¡Bienvenido ' + datos.usuario.nombre_completo + '!');
                // Aquí a futuro él debería redirigir a la pantalla de Ventas
                // window.location.href = '/ventas'; 
            } else {
                // Si la contraseña está mal, mostramos el error
                setError(datos.mensaje);
            }
        } catch (error) {
            setError('Error al conectar con el servidor');
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
                                        <form>
                                            <div data-mdb-input-init className="form-outline mb-4" style={{ marginTop: '20px' }}>
                                                <label className="form-label fw-bold" htmlFor="form3Example3" style={{ fontSize: '16px' }}>Usuario</label>
                                                <input type="email" id="form3Example3" className="form-control" />
                                            </div>

                                            <div data-mdb-input-init className="form-outline mb-4">
                                                <label className="form-label fw-bold" htmlFor="form3Example4" style={{ fontSize: '16px' }}>Contraseña</label>
                                                <input type="password" id="form3Example4" className="form-control" />
                                            </div>
                                            <button type="submit" data-mdb-button-init data-mdb-ripple-init className="button-custom btn btn-block mb-4 p">
                                                
                                                {/*flecha para acceder*/}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-right-short mb-1" viewBox="0 0 16 16">
                                                    <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8" />
                                                </svg>

                                                <span className="m-1">Acceder</span>
                                            </button>

                                            <div data-mdb-input-init className="form-outline mb-4">
                                                {/*OJO FALTA PROGRAMAR BIEN LOS VALUE Y LA LOGICA */}
                                                <label className="form-label fw-bold" htmlFor="form3Example4" style={{ fontSize: '14px' }}>Sucursal de acceso</label>

                                                <label className="form-check mb-3 radio-options w-100" style={{ display: 'flex', alignItems: 'left' }}>
                                                    <div style={{ paddingLeft: '20px' }}>
                                                        <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                                        <span classnName='radio-span' style={{ color: 'black', fontSize: '16px' }} >
                                                            Escalon
                                                        </span>
                                                    </div>
                                                </label>

                                                <label className="form-check mb-3 radio-options w-100" style={{ display: 'flex', alignItems: 'left' }}>
                                                    <div style={{ paddingLeft: '20px' }}>
                                                        <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                                        <span classnName='radio-span' style={{ color: 'black', fontSize: '16px' }} >
                                                            Santa Tecla
                                                        </span>
                                                    </div>
                                                </label>

                                                <label className="form-check mb-3 radio-options w-100" style={{ display: 'flex', alignItems: 'left' }}>
                                                    <div style={{ paddingLeft: '20px' }}>
                                                        <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                                        <span classnName='radio-span' style={{ color: 'black', fontSize: '16px' }} >
                                                            Mejicanos
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>

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