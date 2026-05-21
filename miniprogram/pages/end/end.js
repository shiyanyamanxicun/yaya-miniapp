const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    totalButterflies: 0,
    butterflies: [],
  },

  async onShow() {
    try {
      // Release a new butterfly
      if (app.globalData.sessionId) {
        const result = await api.releaseButterfly(app.globalData.sessionId);
        this.setData({ totalButterflies: result.total_butterflies });
      } else {
        const data = await api.getButterflies();
        this.setData({ totalButterflies: data.total_butterflies });
      }
    } catch (e) {
      this.setData({ totalButterflies: 1 });
    }
    this.spawnButterflies();
  },

  spawnButterflies() {
    const butterflies = [];
    const count = Math.min(this.data.totalButterflies, 20);
    for (let i = 0; i < count; i++) {
      butterflies.push({
        id: i,
        x: 5 + Math.random() * 85,
        y: 5 + Math.random() * 55,
        delay: Math.random() * 4,
        size: 40 + Math.random() * 60,
      });
    }
    this.setData({ butterflies });
  },

  onRestart() {
    app.globalData.sessionId = null;
    app.globalData.userConcern = '';
    wx.reLaunch({ url: '/pages/welcome/welcome' });
  },
});
