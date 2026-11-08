import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initReportSync } from './services/reportSync.ts';

createRoot(document.getElementById('root')!).render(<App />);

// Initialize automatic pending reports delivery
initReportSync();

// Register Service Worker for offline capabilities & fast shell loading
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] ServiceWorker registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('[SW] ServiceWorker registration failed:', err);
      });
  });
}
