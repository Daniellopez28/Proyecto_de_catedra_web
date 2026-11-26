Ejecución, estructura del frontend y arranque
Ejecutar en dos terminales
Desde la raíz del backend
npm run dev

Desde la terminal en frontend:
npm install
npm run dev
Abrir la dirección que muestra Vite por defecto http://localhost:5173

![alt text](estructura-1.png)
![alt text](estructura-2.png)

1.En el apartado del frontend encontramos el archivo de arranque main.jsx:

Importamos StrictMode y createRoot de React para encender la app, traemos los estilos globales de ./index.css y nuestro componente principal ./App.jsx, y al final montamos todo dentro del elemento root de la página.
![alt text](main.png)
Lo que toma para avanzar es que exista ese espacio root en la página y que carguen bien ./index.css y ./App.jsx; lo complementa StrictMode revisando que todo esté limpio en desarrollo, y así arranca la pantalla de la aplicación. 

2.En App.jsx tenemos el componente principal que revisa si ya hay una sesión guardada y decide qué mostrar:

Traemos useState para manejar el estado del usuario, cargamos App.css y llamamos a Login, SideNavbar y TopHeader; con obtenerUsuarioGuardado revisamos localStorage bajo 'usuarioLogueado' (y si el dato está dañado, lo borramos para evitar fallos).
![alt text](App-jsx.png)
Lo que toma para avanzar es el dato guardado en localStorage o que Login le pase el usuario al entrar; si no hay usuario te manda a <Login/>, y si ya entró te arma la vista con el menú lateral, el encabezado, la sucursal (con 'San Salvador · Escalón' por defecto) y el saludo con usuario.nombre_completo, complementado con onLogout que limpia todo al cerrar sesión y los estilos de App.css.

3.Inicio de sesión (components/login)
En components/login.jsx tenemos el formulario para iniciar sesión contra el backend: