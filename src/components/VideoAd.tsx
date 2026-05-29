import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'videojs-contrib-ads';
import 'videojs-ima';

// Ensure videojs is global for some plugins that might expect it
if (typeof window !== 'undefined') {
    (window as any).videojs = videojs;
}

interface VideoAdProps {
  adTagUrl: string;
  onAdEnded: () => void;
}

export default function VideoAd({ adTagUrl, onAdEnded }: VideoAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canClaim, setCanClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else {
      setCanClaim(true);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!videoRef.current) return;

    let player: any;

    const initPlayer = () => {
        try {
            // Manually register plugins if they are not already registered
            // In some environments, global VideoJS might not have them automatically
            if (typeof (videojs as any).registerPlugin === 'function') {
                try {
                    // These plugins often register themselves on import, but we can be explicit
                    // if we have access to their registration functions, or just check prototypes
                } catch (e) {
                    console.warn('Plugin registration check skipped', e);
                }
            }

            player = videojs(videoRef.current!, {
                autoplay: true,
                controls: true,
                responsive: true,
                fluid: true,
                techOrder: ['html5'],
            });
            playerRef.current = player;
            
            // Re-importing inside init might help with some bundling issues
            // but we'll rely on the global type checks
            
            // Safety check for Google IMA SDK and plugins
            const googleImaAvailable = typeof window !== 'undefined' && (window as any).google && (window as any).google.ima;
            
            if (googleImaAvailable) {
                // Ensure ads plugin is available - using any to bypass TS checks on dynamic funcs
                const p = player as any;
                if (typeof p.ads === 'function') {
                    p.ads(); // Initialize ads plugin
                    
                    if (typeof p.ima === 'function') {
                        p.ima({
                            adTagUrl: adTagUrl,
                        });
                        
                        try {
                            p.ima.initializeAdDisplayContainer();
                        } catch (e) {
                            console.error('IMA Display Container Init Failed:', e);
                        }
                    } else {
                        console.warn('VideoJS IMA plugin not registered on player instance');
                        setError('Ad player plugin (IMA) misconfigured');
                    }
                } else {
                    console.warn('VideoJS Ads plugin not registered on player instance');
                    setError('Ad system (Ads) failed to initialize');
                }
            } else {
                console.error('Google IMA SDK not detected on window');
                setError('Google IMA SDK missing or blocked');
            }

            player.on('error', (e: any) => {
                console.error('VideoJS Player Error:', e);
            });

        } catch (err: any) {
            console.error('VideoJS Initialization Error:', err);
            setError(err.message);
        }
    };

    // Small delay to ensure IMA script is ready and DOM is stable
    const timeoutId = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        try {
            // Some plugins keep references that might cause the getElementsByClassName error during disposal
            // Ensure we stop any active IMA components before disposal
            if (playerRef.current.ima && typeof playerRef.current.ima.getAdsManager === 'function') {
                const adsManager = playerRef.current.ima.getAdsManager();
                if (adsManager) adsManager.destroy();
            }
            playerRef.current.dispose();
            playerRef.current = null;
        } catch (e) {
            console.warn('Error during player disposal:', e);
        }
      }
    };
  }, [adTagUrl]);

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden min-h-[200px] flex items-center justify-center">
      {error ? (
        <div className="text-white text-center p-8">
            <p className="text-red-400 font-bold mb-2">Ad Player Error</p>
            <p className="text-xs text-gray-400">{error}</p>
            <button 
                onClick={() => window.location.reload()}
                className="mt-4 text-xs underline"
            >
                Retry
            </button>
        </div>
      ) : (
        <div data-vjs-player>
            <video
                ref={videoRef}
                className="video-js vjs-big-play-centered"
                playsInline
            />
        </div>
      )}
      
      {/* Timer Overlay */}
      {!error && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full font-bold z-50 text-[10px] uppercase tracking-widest border border-white/10 backdrop-blur-sm">
            {timeLeft > 0 ? `Ad Ends in: ${timeLeft}s` : 'Verification Complete'}
        </div>
      )}

      {canClaim && (
        <button 
            onClick={onAdEnded}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] z-50 hover:bg-blue-700 active:scale-95 transition-all shadow-2xl shadow-blue-900/40"
        >
            Claim Reward
        </button>
      )}
    </div>
  );
}
