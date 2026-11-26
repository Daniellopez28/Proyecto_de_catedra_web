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