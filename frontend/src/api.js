// CORRECCIÓN: centraliza llamadas al backend, token de sesión y manejo de errores HTTP.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.mensaje || `Error HTTP ${response.status}`);
  }
  return body;
}

export async function iniciarSesion(correo, password) {
  return apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ correo, password })
  });
}
