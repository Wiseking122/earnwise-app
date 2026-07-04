import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign cross-origin script errors which are common with third-party iframe providers
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || event.message?.includes('Script error') || !event.filename) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('Silenced cross-origin third-party script error.');
    return;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (msg === 'Script error.' || msg.includes('Script error')) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('Silenced cross-origin third-party unhandled rejection.');
    return;
  }
}, true);

const originalOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
  if (String(message).toLowerCase().includes('script error')) {
    console.warn('Ignored cross-origin iframe error: Script error.');
    return true; // prevent default behavior
  }
  if (originalOnError) {
    return originalOnError.apply(this, arguments as any);
  }
  return false;
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
