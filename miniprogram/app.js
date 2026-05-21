App({
  globalData: {
    sessionId: null,
    userConcern: '',
    selectedSymptom: '',
    bgMusicPlaying: false,
    bgmReady: false,
    apiBase: 'https://yaya-miniapp-production-a622.up.railway.app',
  },

  onLaunch() {
    this.initMusic();
  },

  initMusic() {
    try {
      const bgm = wx.getBackgroundAudioManager();
      bgm.title = '疗愈钢琴曲';
      bgm.epname = '难过急救包';
      bgm.singer = '牙牙';
      bgm.coverImgUrl = 'https://img.zcool.cn/community/01786b5e5c5c2fa80121985c2e0b9b.png';
      bgm.src = 'https://music.163.com/song/media/outer/url?id=1819838493.mp3';
      bgm.volume = 0.25;
      bgm.onCanplay(() => {
        this.globalData.bgmReady = true;
      });
      bgm.onError((err) => {
        console.log('音乐播放失败，尝试备用源:', err);
        bgm.src = 'https://music.163.com/song/media/outer/url?id=523251162.mp3';
      });
      this.bgm = bgm;
    } catch (e) {
      console.log('BackgroundAudioManager 初始化失败:', e);
    }
  },

  playMusic() {
    if (this.bgm && !this.globalData.bgMusicPlaying) {
      try {
        this.bgm.play();
        this.globalData.bgMusicPlaying = true;
      } catch (e) {
        console.log('播放音乐失败:', e);
      }
    }
  },

  pauseMusic() {
    if (this.bgm) {
      try {
        this.bgm.pause();
        this.globalData.bgMusicPlaying = false;
      } catch (e) {
        console.log('暂停音乐失败:', e);
      }
    }
  },

  toggleMusic() {
    if (this.globalData.bgMusicPlaying) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
    return this.globalData.bgMusicPlaying;
  },
});
