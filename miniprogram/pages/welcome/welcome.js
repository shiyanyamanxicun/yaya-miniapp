const app = getApp();

Page({
  data: {
    greeting: '你怎么啦~是想我了吗？',
    toothBounce: false,
    sparkles: [],
    tapRipple: { show: false, x: 0, y: 0 },
  },

  onLoad() {
    const phrases = [
      '你怎么啦~是想我了吗？', '嘿！我感觉到你需要我啦',
      '欢迎你来找我呀，我一直在呢', '牙牙今天也在等你呢~',
      '来啦？我就知道你会来找我', '不管发生什么，我都在这里',
    ];
    this.setData({
      greeting: phrases[Math.floor(Math.random() * phrases.length)],
    });
  },

  onShow() {
    app.playMusic();
  },

  // 戳牙牙 — 弹跳 + 星星特效
  onToothTap() {
    this.setData({ toothBounce: true });
    const emojis = ['✨','💕','🌸','💫','🌟','🫧','💖','🌷'];
    const sparkles = [];
    for (let i = 0; i < 10; i++) {
      sparkles.push({
        id: Date.now() + i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 50,
        emoji: emojis[i],
        size: 24 + Math.random() * 36,
      });
    }
    this.setData({ sparkles });
    setTimeout(() => this.setData({ toothBounce: false, sparkles: [] }), 600);
  },

  // 点击屏幕涟漪
  onScreenTap(e) {
    if (e.target.dataset.ripple === 'off') return;
    this.setData({ tapRipple: { show: true, x: e.detail.x, y: e.detail.y } });
    setTimeout(() => this.setData({ 'tapRipple.show': false }), 500);
  },

  onStart() {
    wx.navigateTo({ url: '/pages/chat/chat' });
  },
});
