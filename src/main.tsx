import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App.tsx';
import { ProveedorTema } from '@/app/tema/ProveedorTema';

import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <ProveedorTema>
      <App />
    </ProveedorTema>
  </StrictMode>,
);
