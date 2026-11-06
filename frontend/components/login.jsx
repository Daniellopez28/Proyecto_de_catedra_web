import '../src/login.css';
import 'bootstrap/dist/css/bootstrap.min.css';

//creacion de diseño para el inicio de sesion, hace falta la logica.
function Login() {
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

                                            <button type="submit" data-mdb-button-init data-mdb-ripple-init className="btn btn-block mb-4" style={{ color: '#FFFFFF', backgroundColor: '#B95136' }}>
                                                Acceder
                                            </button>

                                            <div data-mdb-input-init className="form-outline mb-4">
                                                {/*OJO FALTA PROGRAMAR BIEN LOS VALUE Y LA LOGICA */}
                                                <label className="form-label fw-bold" htmlFor="form3Example4" style={{ fontSize: '14px' }}>Sucursal de acceso</label>
                                                
                                                <div className="form-check mb-3  radio-options">
                                                    <div style={{ paddingLeft: '20px' }}>
                                                    <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1"  />
                                                    <span style={{ color: '#7A7D75', fontSize: '16px' }} >
                                                        Escalon
                                                    </span>
                                                    </div>
                                                </div>

                                                 <div className="form-check mb-3 radio-options">
                                                    <div style={{ paddingLeft: '20px' }}>
                                                    <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                                    <span style={{ color: '#7A7D75', fontSize: '16px' }} >
                                                        Santa Tecla
                                                    </span>
                                                    </div>
                                                </div>

                                                 <div className="form-check mb-3 radio-options">
                                                    <div style={{ paddingLeft: '20px' }}>
                                                    <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                                    <span style={{ color: '#7A7D75', fontSize: '16px' }} >
                                                        San Miguel
                                                    </span>
                                                    </div>
                                                </div>
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