import React, { useEffect } from 'react';

interface CpxWidgetProps {
  userId: string;
}

declare global {
  interface Window {
    config: any;
  }
}

export const CpxWidget: React.FC<CpxWidgetProps> = ({ userId }) => {
  useEffect(() => {
    // 1. Initialize global configuration
    const script4 = {
      div_id: "notification",
      theme_style: 4,
      position: 5,
      text: "",
      link: `https://offers.cpx-research.com/index.php?app_id=33341&ext_user_id=${userId}`,
      newtab: true
    };

      window.config = {
      general_config: {
        app_id: 33341,
        ext_user_id: userId,
        username: "",
        email: "",
        subid_1: "",
        subid_2: ""
      },
      style_config: {
        text_color: "#2b2b2b",
        survey_box: {
          topbar_background_color: "#45c4c6",
          box_background_color: "white",
          rounded_borders: true,
          stars_filled: "#2b2b2b"
        }
      },
      script_config: [
        {
          div_id: "notification",
          theme_style: 4,
          position: 1, // Top
          text: "Surveys Available",
          link: `https://offers.cpx-research.com/index.php?app_id=33341&ext_user_id=${userId}`,
          newtab: true
        }
      ],
      debug: false
    };

    // 2. Create and append the script tag if it doesn't exist
    const SCRIPT_ID = 'cpx-research-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.src = "https://cdn.cpx-research.com/assets/js/script_tag_v1.1.js";
      script.async = true;
      script.id = SCRIPT_ID;
      document.body.appendChild(script);
    } else if ((window as any).fetchSurveys) {
      // If script exists and is already loaded, try to re-init
      try {
        (window as any).fetchSurveys();
      } catch (e) {
        console.warn('CPX fetchSurveys failed:', e);
      }
    }

    // Attempt re-init after a short delay just in case script just finished loading
    const timer = setTimeout(() => {
      if ((window as any).fetchSurveys) {
        try {
          (window as any).fetchSurveys();
        } catch (e) {}
      }
    }, 1000);

    // 3. Cleanup on unmount
    return () => {
      clearTimeout(timer);
    };
  }, [userId]);

  return (
    <div id="notification" className="min-h-[10px] w-full"></div>
  );
};
