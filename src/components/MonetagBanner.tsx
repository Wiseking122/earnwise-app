import React, { useEffect } from 'react';

export const MonetagBanner = () => {
  useEffect(() => {
    // Only inject script once to prevent duplication
    const scriptSrc = 'https://nap5k.com/tag.min.js';
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement('script');
      script.dataset.zone = '11109974';
      script.src = scriptSrc;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="block bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 p-8 rounded-[2.5rem] shadow-xl mb-4 overflow-hidden relative">
        {/* Monetag Native Banner container */}
        <div data-zone="11109974" className="relative z-10" />
    </div>
  );
};
