const app = getApp();

Component({
  data: {
    playing: false,
  },

  lifetimes: {
    attached() {
      this.setData({ playing: app.globalData.bgMusicPlaying });
    },
  },

  methods: {
    onToggle() {
      const playing = app.toggleMusic();
      this.setData({ playing });
    },
  },
});
