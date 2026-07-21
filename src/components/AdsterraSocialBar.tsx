import { useEffect } from 'react';

export const AdsterraSocialBar = () => {
  useEffect(() => {
    // Prevent multiple injections
    if (document.getElementById('adsterra-social-bar-script')) return;

    const script = document.createElement('script');
    script.id = 'adsterra-social-bar-script';
    script.src = 'https://sturgeonvelocity.com/6c/69/bf/6c69bfc6dac990e7f98735f23ad91fbf.js';
    script.async = true;
    script.type = 'text/javascript';
    
    // Some social bars work better when appended to the body
    document.body.appendChild(script);

    return () => {
      // In a SPA, we typically keep the social bar active across navigation
      // but if we need to remove it, we can. However, many ad scripts don't cleanup well.
    };
  }, []);

  return null;
};
