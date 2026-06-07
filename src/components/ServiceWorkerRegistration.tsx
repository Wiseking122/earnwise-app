import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW registration successful with scope: ', registration.scope);
      }).catch((err) => {
        console.log('SW registration failed: ', err);
      });
    }
  }, []);

  return null;
}
