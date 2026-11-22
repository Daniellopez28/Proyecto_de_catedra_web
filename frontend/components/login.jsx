// CORRECCIÓN: autentica contra el backend y conserva el token para las llamadas protegidas.
import { useState } from 'react';
import '../src/login.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { iniciarSesion } from '../src/api.js';

function Login({ onLogin }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(event) {
    event.preventDefault();
    setError('');
    setCargando(true);
    try {
      const resultado = await iniciarSesion(correo.trim(), password);
      onLogin({ usuario: resultado.usuario, token: resultado.token });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="loginSection">
      <div className="mainContainer">
        <div className="px-4 py-5 px-md-5 text-center text-lg-start">
          <div className="container">
            <div className="row gx-lg-5 align-items-center">
              <div className="col-lg-6 mb-5">
                <h1 className="my-5 display-3 fw-bold ls-tight">
                  Todo listo <br />
                  <span style={{ color: '#B95136' }}>para un buen servicio</span>
                </h1>
                <p style={{ color: '#7A7D75' }}>
                  Ingresa a tu espacio de trabajo para continuar la operación de tu sucursal.
                </p>
              </div>
              <div className="col-lg-6 mb-5 mb-lg-0">
                <div className="card" style={{ borderRadius: '16px' }}>
                  <div className="card-body py-5 px-md-5">
                    <h3 className="fw-bold">Iniciar sesión</h3>
                    <form onSubmit={manejarLogin}>
                      <div className="mb-4 mt-4">
                        <label className="form-label fw-bold" htmlFor="correo">Correo</label>
                        <input
                          id="correo"
                          className="form-control"
                          type="email"
                          autoComplete="username"
                          required
                          value={correo}
                          onChange={(event) => setCorreo(event.target.value)}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="form-label fw-bold" htmlFor="password">Contraseña</label>
                        <input
                          id="password"
                          className="form-control"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                      </div>
                      {error && <div className="alert alert-danger" role="alert">{error}</div>}
                      <button className="button-custom btn btn-block mb-4" type="submit" disabled={cargando}>
                        {cargando ? 'Ingresando...' : 'Acceder'}
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
