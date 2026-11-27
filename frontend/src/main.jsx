import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './brand.css'
import ConsentimientoCookies from './components/ConsentimientoCookies.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <>
      <App />
      <ConsentimientoCookies />
    </>
  </StrictMode>,
)
