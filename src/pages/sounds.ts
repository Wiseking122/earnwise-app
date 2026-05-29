
export const playNotificationSound = () => {
  try {
    // Elegant digital ping sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play();
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};

export const playRewardSound = () => {
  try {
    // Cheerful coin/reward sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    audio.volume = 0.6;
    audio.play();
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};
