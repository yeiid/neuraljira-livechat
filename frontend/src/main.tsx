import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registro automático del Service Worker para la PWA
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nueva versión disponible. Actualizando...');
  },
  onOfflineReady() {
    console.log('[PWA] App lista para funcionar offline.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
