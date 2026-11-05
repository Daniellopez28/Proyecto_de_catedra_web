import '../src/login.css';
import 'bootstrap/dist/css/bootstrap.min.css';

//creacion de diseño para el inicio de sesion, hace falta la logica.
function Login() {
    return (
        <section className='loginSection'>
            <div className='mainContainer'>
            <div className="px-4 py-5 px-md-5 text-center text-lg-start" style={{}}>
                <div className="container">
                    <div className="row gx-lg-5 align-items-center">
                        <div className="col-lg-6 mb-5 mb-lg-0">
                            <h1 className="my-5 display-3 fw-bold ls-tight">
                                Todo listo <br />
                                <span className=" " style={{color: '#B95136'}}>para un buen servicio</span>
                            </h1>
                            <p style={{ color: 'hsl(217, 10%, 50.8%)' }}>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                                Eveniet, itaque accusantium odio, soluta, corrupti aliquam
                                quibusdam tempora at cupiditate quis eum maiores libero
                                veritatis? Dicta facilis sint aliquid ipsum atque?
                            </p>
                        </div>

                        <div className="col-lg-6 mb-5 mb-lg-0">
                            <div className="card">
                                <div className="card-body py-5 px-md-5">
                                    <form>
                                        <div data-mdb-input-init className="form-outline mb-4">
                                            <input type="email" id="form3Example3" className="form-control" />
                                            <label className="form-label" htmlFor="form3Example3">Email address</label>
                                        </div>

                                        <div data-mdb-input-init className="form-outline mb-4">
                                            <input type="password" id="form3Example4" className="form-control" />
                                            <label className="form-label" htmlFor="form3Example4">Password</label>
                                        </div>

                                        <button type="submit" data-mdb-button-init data-mdb-ripple-init className="btn btn-block mb-4" style={{color:'#FFFFFF',backgroundColor: '#B95136'}}>
                                            Acceder 
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