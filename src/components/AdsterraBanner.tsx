import React, { useEffect, useRef } from 'react';

interface AdsterraBannerProps {
  type: 'native' | 'iframe';
}

export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({ type }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    // Prevent duplicate injection
    if (currentRef.children.length > 0) return;

    const script = document.createElement('script');
    script.async = true;
    script.onerror = () => {
      console.warn(`Failed to load Adsterra ${type} ad. This might be due to an ad blocker.`);
    };
    
    if (type === 'native') {
      // Config for Code 1: Native Container
      script.async = true;
      script.dataset.cfasync = 'false';
      script.src = 'https://sturgeonvelocity.com/6ed51d6a0308b91327d83ade173f1aa5/invoke.js';
      
      const adContainer = document.createElement('div');
      adContainer.id = 'container-6ed51d6a0308b91327d83ade173f1aa5';
      currentRef.appendChild(adContainer);
      currentRef.appendChild(script);
    } else {
      // Config for Code 2: 160x300 IFrame
      // 1. Set global options
      (window as any).atOptions = {
        'key' : 'dde86cd45f7bfcfcc96137effdc5cb39',
        'format' : 'iframe',
        'height' : 300,
        'width' : 160,
        'params' : {}
      };

      // 2. Load script
      script.src = 'https://sturgeonvelocity.com/dde86cd45f7bfcfcc96137effdc5cb39/invoke.js';
      currentRef.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (currentRef) {
        currentRef.innerHTML = '';
      }
      if (type === 'iframe') {
        delete (window as any).atOptions;
      }
    };
  }, [type]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center items-center min-h-[100px] w-full overflow-hidden rounded-xl bg-slate-50/50 border border-dashed border-slate-200"
    />
  );
};
