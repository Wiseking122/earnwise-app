import { useEffect } from 'react';

export function useAdsterraScript() {
  useEffect(() => {
    // 1. Inject Style for Adsterra-specific elements to ensure top positioning
    const style = document.createElement('style');
    style.id = 'adsterra-style-enforcement';
    style.textContent = `
      iframe[src*="sturgeonvelocity.com"], 
      .social-bar-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);

    // 2. Inject Script
    const script = document.createElement('script');
    script.src = 'https://sturgeonvelocity.com/6c/69/bf/6c69bfc6dac990e7f98735f23ad91fbf.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);

    return () => {
      // Clean up if necessary
      const s = document.querySelector('script[src*="sturgeonvelocity.com"]');
      if (s) s.remove();
      const st = document.getElementById('adsterra-style-enforcement');
      if (st) st.remove();
    };
  }, []);
}
