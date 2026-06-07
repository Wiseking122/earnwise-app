import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface VastVideoPlayerProps {
  vastUrl: string;
  onAdEnded: () => void;
}

export default function VastVideoPlayer({ vastUrl, onAdEnded }: VastVideoPlayerProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const [errorOccurred, setErrorOccurred] = useState(false);

  // Keep a ref to the callback to avoid re-triggering the main setup when callback changes
  const onAdEndedRef = useRef(onAdEnded);
  useEffect(() => {
    onAdEndedRef.current = onAdEnded;
  }, [onAdEnded]);

  useEffect(() => {
    let active = true;

    // Check if the Google IMA SDK is loaded
    if (!window.google || !window.google.ima) {
      console.warn("Earnwise Vast Player: Google IMA SDK is not available.");
      setErrorOccurred(true);
      // Fallback: trigger callback after a standard timeout so user flows never break
      const fallbackTimer = setTimeout(() => {
        if (active) onAdEndedRef.current?.();
      }, 5000);
      return () => {
        active = false;
        clearTimeout(fallbackTimer);
      };
    }

    const setupIma = () => {
      try {
        if (!adContainerRef.current || !videoRef.current) return;

        // Clean previous children if any to start completely fresh
        adContainerRef.current.innerHTML = '';

        // 1. Create AdDisplayContainer
        const adDisplayContainer = new window.google.ima.AdDisplayContainer(
          adContainerRef.current,
          videoRef.current
        );
        adDisplayContainer.initialize();

        // 2. Create AdsLoader
        const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);
        adsLoaderRef.current = adsLoader;

        // 3. Listen to AdsLoaded
        adsLoader.addEventListener(
          window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (adsManagerLoadedEvent: any) => {
            if (!active) return;

            const adsRenderingSettings = new window.google.ima.AdsRenderingSettings();
            adsRenderingSettings.restoreHeaderAds = true;

            // Get AdsManager
            const adsManager = adsManagerLoadedEvent.getAdsManager(
              videoRef.current,
              adsRenderingSettings
            );
            adsManagerRef.current = adsManager;

            // Event Listeners on AdsManager
            adsManager.addEventListener(
              window.google.ima.AdErrorEvent.Type.AD_ERROR,
              (adErrorEvent: any) => {
                console.warn("AdManager experienced an error:", adErrorEvent.getError());
                if (active) {
                  setErrorOccurred(true);
                  onAdEndedRef.current?.();
                }
              }
            );

            adsManager.addEventListener(
              window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
              () => {
                console.log("Earnwise Vast Player: Ad completed");
                if (active) onAdEndedRef.current?.();
              }
            );

            adsManager.addEventListener(
              window.google.ima.AdEvent.Type.SKIPPED,
              () => {
                console.log("Earnwise Vast Player: Ad skipped");
                if (active) onAdEndedRef.current?.();
              }
            );

            adsManager.addEventListener(
              window.google.ima.AdEvent.Type.USER_CLOSE,
              () => {
                console.log("Earnwise Vast Player: Ad closed");
                if (active) onAdEndedRef.current?.();
              }
            );

            try {
              const width = adContainerRef.current?.clientWidth || 320;
              const height = adContainerRef.current?.clientHeight || 180;
              adsManager.init(width, height, window.google.ima.ViewMode.NORMAL);
              adsManager.start();
            } catch (managerErr) {
              console.error("AdsManager init execution error:", managerErr);
              if (active) {
                setErrorOccurred(true);
                onAdEndedRef.current?.();
              }
            }
          },
          false
        );

        // 4. Listen to Loader level error
        adsLoader.addEventListener(
          window.google.ima.AdErrorEvent.Type.AD_ERROR,
          (adErrorEvent: any) => {
            console.warn("AdsLoader experienced an error:", adErrorEvent.getError());
            if (active) {
              setErrorOccurred(true);
              onAdEndedRef.current?.();
            }
          },
          false
        );

        // 5. Build and submit AdsRequest
        const adsRequest = new window.google.ima.AdsRequest();
        adsRequest.adTagUrl = vastUrl;
        adsRequest.linearAdSizeWidth = adContainerRef.current.clientWidth || 320;
        adsRequest.linearAdSizeHeight = adContainerRef.current.clientHeight || 180;

        adsLoader.requestAds(adsRequest);
      } catch (err) {
        console.error("Error setting up Google IMA player:", err);
        if (active) {
          setErrorOccurred(true);
          onAdEndedRef.current?.();
        }
      }
    };

    // Delay slightly to yield execution and let HTML element bind completely
    const setupTimer = setTimeout(() => {
      setupIma();
    }, 50);

    return () => {
      active = false;
      clearTimeout(setupTimer);
      if (adsManagerRef.current) {
        try {
          adsManagerRef.current.destroy();
        } catch (e) {}
      }
      if (adsLoaderRef.current) {
        try {
          adsLoaderRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [vastUrl]);

  return (
    <div className="relative w-full h-full aspect-video min-h-[180px] bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
      {/* IMA SDK injects its visuals, buttons, and clickable surface here */}
      <div ref={adContainerRef} className="absolute inset-0 z-20 w-full h-full cursor-pointer" />
      
      {/* Required HTML5 video target for IMA */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover hidden"
        playsInline
        muted
      />

      {errorOccurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center space-y-3 z-10">
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Initializing Advertising Deck...</p>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
