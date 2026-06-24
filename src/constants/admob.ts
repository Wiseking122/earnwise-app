export const WEB_AD_CONFIG = {
  videoAdTagUrl: "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/1240113/payment&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]",
  bannerPlacementId: "web-banner-placement-98218",
  nativePlacementId: "web-native-placement-38102",
  appOpenPlacementId: "web-appopen-placement-12903"
};

// For backward compatibility and smooth migration of components
export const ADMOB_CONFIG = {
  appId: "web-app-placeholder",
  bannerId: WEB_AD_CONFIG.bannerPlacementId,
  rewardedInterstitialId: "web-rewarded-interstitial-placeholder",
  appOpenId: WEB_AD_CONFIG.appOpenPlacementId,
  nativeAdvancedId: WEB_AD_CONFIG.nativePlacementId,
  rewardedId: WEB_AD_CONFIG.videoAdTagUrl
};

