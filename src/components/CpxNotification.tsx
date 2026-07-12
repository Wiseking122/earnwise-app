import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCpxSurveys } from '../hooks/useCpxSurveys';
import { getApiUrl } from '../lib/config';

/**
 * CpxNotification Component
 * Integrates the official CPX Research notification script.
 * Dynamically handles user identification and prevents duplicate script injection.
 */
const CpxNotification: React.FC = () => {
  const { user, profile } = useAuth();
  const { stats } = useCpxSurveys();
  const scriptInjectedRef = useRef(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (stats.loading) return;

    // Smart Logic: Decide if we should show the notification widget
    // Condition 1: High paying survey (e.g. > 400 local currency units)
    const hasHighPaying = stats.max_payout >= 400;
    // Condition 2: Plenty of surveys available (new batch)
    const hasManySurveys = stats.available_surveys >= 5;

    if (hasHighPaying || hasManySurveys) {
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [stats.available_surveys, stats.max_payout, stats.loading]);

  useEffect(() => {
    // Only load if user is authenticated, we should show it, and script hasn't been injected yet
    if (!user || !profile || !shouldShow || scriptInjectedRef.current) return;

    const loadCpxNotification = async () => {
      // Configuration constants - App ID is derived from project settings
      const appId = 33341; 
      const extUserId = user.uid;
      const username = profile.username || 'User';
      const email = user.email || '';

      // Get the signed URL from our backend
      let linkUrl = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${extUserId}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`;
      
      try {
        const queryParams = new URLSearchParams({
          user_id: extUserId,
          username: username,
          email: email
        });
        const res = await fetch(getApiUrl(`/api/cpx/signed-url?${queryParams.toString()}`));
        const data = await res.json();
        if (data.url) linkUrl = data.url;
      } catch (err) {
        console.error('[CPX] Failed to get signed URL:', err);
      }

      // Define CPX Script 4 Configuration (Notification style)
      const script4 = {
        div_id: "notification",
        theme_style: 4,
        position: 4, // Position 4 (Top Right) to prevent overlap with bottom navigation footer
        text: "Earn 300 WC per survey!",
        link: linkUrl,
        newtab: true
      };

      // Global CPX Configuration object required by the external script
      const config = {
        general_config: {
          app_id: appId,
          ext_user_id: extUserId,
          email: email,
          username: username,
          subid_1: "",
          subid_2: "",
        },
        style_config: {
          text_color: "#2b2b2b",
          survey_box: {
            topbar_background_color: "#45c4c6",
            box_background_color: "white",
            rounded_borders: false,
            stars_filled: "#2b2b2b",
          },
        },
        script_config: [script4],
        debug: false
      };

      // Attach config to window object as required by CPX v1.1 script
      (window as any).config = config;

      // Create and append the external script tag
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://cdn.cpx-research.com/assets/js/script_tag_v1.1.js';
      script.async = true;

      script.onload = () => {
        console.log('[CPX] Notification script loaded successfully.');
      };

      script.onerror = (err) => {
        console.error('[CPX] Failed to load the notification script:', err);
      };

      document.body.appendChild(script);
      scriptInjectedRef.current = true;
    };

    loadCpxNotification();
  }, [user, profile, shouldShow]);

  if (!user) return null;

  return (
    <>
      <style>{`
        #notification * {
          pointer-events: auto !important;
        }
      `}</style>
      <div 
        id="notification" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 99999,
          pointerEvents: 'none' // Ensures clicks pass through empty spaces of this container
        }}
      >
        {/* The CPX script will inject content into this container */}
      </div>
    </>
  );
};

export default CpxNotification;
