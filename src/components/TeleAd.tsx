import { useEffect } from 'react';

interface TeleAdProps {
  onAdLoaded?: () => void;
}

export default function TeleAd({ onAdLoaded }: TeleAdProps) {
  useEffect(() => {
    const SCRIPT_ID = 'tele-ad-sdk';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = '//libtl.com/sdk.js';
      script.dataset.zone = '11070925';
      script.dataset.sdk = 'show_11070925';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => {
        if (onAdLoaded) onAdLoaded();
      };
    } else {
      if (onAdLoaded) onAdLoaded();
    }

    return () => {
      // Typically we don't remove SDK scripts to avoid re-loading overhead
    };
  }, [onAdLoaded]);

  return <div id="show_11070925"></div>;
}
