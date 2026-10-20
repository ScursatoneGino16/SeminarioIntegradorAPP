import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProveedorSesion } from './sesion';
import { ProveedorPreferencias } from './preferencias';
import { ProveedorBatalla } from './animaciones';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorPreferencias>
          <ProveedorBatalla>
            <App />
          </ProveedorBatalla>
        </ProveedorPreferencias>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
