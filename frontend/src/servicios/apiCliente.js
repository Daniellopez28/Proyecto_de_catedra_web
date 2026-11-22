/*URL base del backend tomada de variables de entorno de Vite o localhost por defecto*/
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/*Clave usada en localStorage para persistir el usuario autenticado*/
const CLAVE_SESION = 'origenes_sv_sesion';

/*Guarda los datos de sesión en localStorage*/
export function guardarSesion(datosSesion) {
  /*Serializa la sesión del usuario en almacenamiento local del navegador*/
  localStorage.setItem(CLAVE_SESION, JSON.stringify(datosSesion));
}

/*Recupera la sesión actual si existe y es válida*/
export function obtenerSesion() {
  /*Lee el valor guardado en localStorage*/
  const raw = localStorage.getItem(CLAVE_SESION);
  if (!raw) {
    /*Retorna null cuando no hay sesión iniciada*/
    return null;
  }

  try {
    /*Convierte el texto JSON de vuelta a objeto*/
    return JSON.parse(raw);
  } catch {
    /*Limpia datos corruptos si el JSON no es válido*/
    localStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

/*Cierra la sesión eliminando los datos guardados*/
export function cerrarSesion() {
  /*Borra la sesión activa del localStorage*/
  localStorage.removeItem(CLAVE_SESION);
}

/*Ejecuta peticiones JSON hacia el backend de Express*/
export async function peticionApi(ruta, opciones = {}) {
  /*Arma la URL completa evitando dobles barras*/
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;

  /*Realiza la petición fetch con encabezados JSON*/
  const respuesta = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
    ...opciones,
  });

  /*Intenta parsear la respuesta como JSON*/
  const datos = await respuesta.json().catch(() => ({}));

  /*Lanza error legible si el servidor responde con estado no exitoso*/
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || `Error HTTP ${respuesta.status}`);
  }

  /*Retorna el cuerpo JSON ya validado*/
  return datos;
}