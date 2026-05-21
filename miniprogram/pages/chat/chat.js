const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    messages: [
      { id: 1, role: 'ai', text: '嘿~你来啦！想聊什么都可以，吐槽也行，说心事也行，我都在 👋' }
    ],
    inputText: '',
    sending: false,
    typing: false,
    scrollTo: '',
    showChoices: false,
    msgId: 2,
    toothBounce: false,
    toothMood: 'mood-listening',
    sparkles: [],
  },

  onShow() {
    app.playMusic();
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onToothTap() {
    this.setData({ toothBounce: true, toothMood: 'mood-warm' });
    const emojis = ['✨','💕','🌸','💫','🌟','🫧','💖','🌷'];
    const sparkles = [];
    for (let i = 0; i < 10; i++) {
      sparkles.push({
        id: Date.now() + i,
        x: -30 + Math.random() * 60,
        y: -20 + Math.random() * 50,
        emoji: emojis[i],
        size: 24 + Math.random() * 40,
      });
    }
    this.setData({ sparkles });
    setTimeout(() => this.setData({ toothBounce: false, sparkles: [] }), 700);
    setTimeout(() => this.setData({ toothMood: 'mood-listening' }), 1500);
  },

  async onSend() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({ title: '跟我说点什么吧~', icon: 'none', duration: 1500 });
      return;
    }
    if (this.data.sending) return;

    const userMsg = { id: this.data.msgId, role: 'user', text };
    const messages = [...this.data.messages, userMsg];
    this.setData({
      messages,
      inputText: '',
      sending: true,
      typing: true,
      showChoices: false,
      toothMood: 'mood-thinking',
      scrollTo: 'msg-' + userMsg.id,
      msgId: this.data.msgId + 1,
    });

    // 保存输入，用于重试
    this._lastText = text;

    try {
      const result = await api.sendMessage(text);
      app.globalData.sessionId = result.session_id;
      app.globalData.userConcern = result.root_cause || text;
      this._lastText = '';
      this.typewriterEffect(result.response);
    } catch (e) {
      // 恢复输入框，让用户可以直接重发
      this.setData({
        inputText: text,
        sending: false,
        typing: false,
        toothMood: 'mood-listening',
      });
      wx.showToast({ title: '网络抖了一下，点发送再试一次~', icon: 'none', duration: 2000 });
    }
  },

  // Typewriter animation — text appears character by character
  typewriterEffect(fullText) {
    const aiMsgId = this.data.msgId;
    const nextId = aiMsgId + 1;
    const aiMsg = { id: aiMsgId, role: 'ai', text: '' };

    this.setData({
      messages: [...this.data.messages, aiMsg],
      typing: false,
      scrollTo: 'msg-' + aiMsgId,
      msgId: nextId,
      toothMood: 'mood-listening',
    });

    let pos = 0;
    const chars = Array.from(fullText);
    const total = chars.length;
    const timer = setInterval(() => {
      pos += 2;
      if (pos >= total) {
        clearInterval(timer);
        const msgs = [...this.data.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: fullText };
        this.setData({
          messages: msgs,
          sending: false,
          showChoices: true,
          toothMood: 'mood-warm',
          scrollTo: 'msg-' + aiMsgId,
        });
        setTimeout(() => this.setData({ toothMood: 'mood-listening' }), 3000);
        return;
      }
      const partial = chars.slice(0, pos).join('');
      const msgs = [...this.data.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: partial };
      this.setData({ messages: msgs });
    }, 35);
  },

  onKeepChatting() {
    this.setData({ showChoices: false });
  },

  onFeelBetter() {
    wx.navigateTo({ url: '/pages/heal/heal' });
  },
});
