import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Antes de montar React: inicializa i18next con el locale de localStorage,
// asi el primer render ya sale en el idioma correcto (incluido el login,
// donde todavia no hay JWT para consultar la preferencia al backend).
import './shared/i18n';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);