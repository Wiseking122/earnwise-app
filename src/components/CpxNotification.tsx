import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { getApiUrl } from '../lib/config';

/**
 * CpxNotification Component
 * Integrates the official CPX Research scripts (Notification + Wall).
 * Dynamically handles user identification and prevents duplicate script injection.
 */
const CpxNotification: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const scriptInjectedRef = useRef(false);

  useEffect(() => {
    // Only load if user is authenticated
    if (!user || !profile) return;

    const loadCpx = async () => {
      let appId = 33341;
      try {
        const configRes = await fetch('/api/config/public');
        const configData = await configRes.json();
        if (configData.cpxAppId) appId = parseInt(configData.cpxAppId);
      } catch (err) {}

      const extUserId = user.uid;
      const username = profile.username || 'User';
      const email = user.email || '';

      // Script 1: Survey Wall (Embedded in the Survey Tab)
      const script1 = {
        div_id: "cpx-wall-embedded",
        theme_style: 1, // Standard Survey Wall
        newtab: false
      };

      // Script 4: Notification Widget (Floating bottom right)
      const script4 = {
        div_id: "notification",
        theme_style: 4,
        position: 5, // 5 = bottom right
        text: "",
        link: "https://offers.cpx-research.com/index.php?app_id={app_id}&ext_user_id={ext_user_id}&username={username}&email={email}",
        newtab: true
      };

      // Global CPX Configuration object
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
        script_config: [script1, script4], // Support both embedded wall and floating notification
        debug: true
      };

      // Attach config to window object
      (window as any).config = config;

      if (!scriptInjectedRef.current) {
        // Create and append the external script tag
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://cdn.cpx-research.com/assets/js/script_tag_v1.1.js';
        script.async = true;

        document.body.appendChild(script);
        scriptInjectedRef.current = true;
      } else {
        // If script is already there, try to re-init if CPX provides a method
        // Most CPX scripts watch for DOM changes or can be manually re-triggered
        if ((window as any).CPXResearch && typeof (window as any).CPXResearch.init === 'function') {
          (window as any).CPXResearch.init();
        }
      }
    };

    loadCpx();
  }, [user, profile, location.pathname]);

  if (!user) return null;

  const isSurveysPage = location.pathname === '/surveys';

  return (
    <>
      <style>{`
        #notification * {
          pointer-events: auto !important;
        }
      `}</style>
      
      {/* Floating widget - only visible if NOT on the surveys page */}
      {!isSurveysPage && (
        <div 
          id="notification" 
          style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        />
      )}
    </>
  );
};

export default CpxNotification;
