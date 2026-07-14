import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function CpxSurveyNotification() {
  const { user, profile } = useAuth();
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!user || scriptLoaded.current) return;

    const initCpx = async () => {
      try {
        const configRes = await fetch('/api/config/public');
        const configData = await configRes.json();
        // Fallback to 33341 if not set
        const appId = parseInt(configData.cpxAppId) || 33341;

        const email = user.email || '';
        const username = profile?.username || 'User';
        const ext_user_id = user.uid;

        (window as any).config = {
          general_config: {
            app_id: appId,
            ext_user_id: ext_user_id,
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
          script_config: [{
            div_id: "notification",
            theme_style: 4,
            position: 5,
            text: "",
            link: `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${ext_user_id}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`,
            newtab: true
          }],
          debug: false,
        };

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://cdn.cpx-research.com/assets/js/script_tag_v1.1.js';
        script.async = true;
        document.body.appendChild(script);
        scriptLoaded.current = true;
      } catch (err) {
        console.error('[CPX] Initialization failed:', err);
      }
    };

    initCpx();
  }, [user, profile]);

  return <div id="notification"></div>;
}
