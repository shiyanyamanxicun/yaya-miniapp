const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    // Phase 0: Symptom
    symptoms: ['吃不下饭', '睡不着', '没力气', '胸闷', '只想哭', '还好没有'],
    symptomDone: false,
    selectedSymptom: '',
    toothBounce: false,

    // Phase 1: Deep Talk
    deepTalkDone: false,
    answerSubmitted: false,
    deepResponseText: '',
    deepResponseFull: '',
    deepTyping: true,
    deepQuestion: '',
    answerOptions: [
      '已经很久了...',
      '就最近才开始的',
      '我也说不太清楚',
      '其实不只是难过，还有委屈',
      '我想自己写...',
    ],
    selectedAnswer: '',
    customAnswer: '',

    // Phase 2: Deep Reply
    deepReplyDone: false,
    deepReplyText: '',
    deepReplyFull: '',
    replyTyping: true,

    // Phase 3: Story
    storyLoaded: false,
    storyPreamble: '',
    storyTitle: '',
    storyText: '',
    storyAfterword: '',

    scrollTo: '',
  },

  /* ===== Phase 0: Pick Symptom ===== */
  async onSymptom(e) {
    const symptom = e.currentTarget.dataset.s;
    app.globalData.selectedSymptom = symptom;
    this.setData({ selectedSymptom: symptom, toothBounce: true });
    setTimeout(() => this.setData({ toothBounce: false }), 500);

    // Get symptom advice
    let resultIcon = '💝';
    let resultType = 'text';
    let options = [];
    try {
      const result = await api.getSymptomAdvice(symptom);
      resultIcon = { dessert: '🍬', soundscape: '🎵', text: '💝' }[result.type] || '💝';
      resultType = result.type;
      options = result.options || [];
    } catch (e) {
      // fallback silently
    }

    this.setData({
      symptomDone: true,
      resultIcon,
      resultType,
      options,
      scrollTo: 'phase-deep',
    });

    // Start Phase 1: Deep Talk
    this.startDeepTalk(symptom);
  },

  /* ===== Phase 1: Deep Talk ===== */
  async startDeepTalk(symptom) {
    const concern = app.globalData.userConcern || '最近有点难过';
    let deepResponse = '';
    let deepQuestion = '';

    try {
      const result = await api.getDeepTalk(concern, symptom);
      deepResponse = result.response;
      deepQuestion = result.question;
    } catch (e) {
      deepResponse = '我懂了…身体的不舒服，其实是心在替我们说话 🫂 你说的话我都记在心里了。我想多了解你一点~';
      deepQuestion = '这种难过里面，你觉得最重的那部分是什么呀？';
    }

    this.setData({ deepResponseFull: deepResponse, deepQuestion });
    this.typewriterDeep(deepResponse);
  },

  typewriterDeep(fullText) {
    let pos = 0;
    const chars = Array.from(fullText);
    const total = chars.length;
    this.setData({ deepTyping: true, deepResponseText: '' });

    const timer = setInterval(() => {
      pos += 2;
      if (pos >= total) {
        clearInterval(timer);
        this.setData({
          deepResponseText: fullText,
          deepTyping: false,
          deepTalkDone: true,
          scrollTo: 'phase-deep',
        });
        return;
      }
      this.setData({ deepResponseText: chars.slice(0, pos).join('') });
    }, 40);
  },

  /* ===== User answers the deep question ===== */
  onPickAnswer(e) {
    const answer = e.currentTarget.dataset.a;
    if (answer === '我想自己写...') {
      this.setData({ selectedAnswer: answer, customAnswer: '' });
      return;
    }
    this.setData({ selectedAnswer: answer });
    this.submitAnswer(answer);
  },

  onAnswerInput(e) {
    this.setData({ customAnswer: e.detail.value });
  },

  onSendAnswer() {
    const text = this.data.customAnswer.trim();
    if (!text) {
      wx.showToast({ title: '写点什么吧~', icon: 'none', duration: 1500 });
      return;
    }
    this.setData({ selectedAnswer: text });
    this.submitAnswer(text);
  },

  async submitAnswer(answer) {
    const concern = app.globalData.userConcern || '最近有点难过';
    const question = this.data.deepQuestion;

    this.setData({
      answerSubmitted: true,
      deepTalkDone: true,
      replyTyping: true,
      deepReplyText: '',
      scrollTo: 'phase-reply',
    });

    let replyText = '';
    try {
      const result = await api.getDeepReply(concern, question, answer);
      replyText = result.response;
    } catch (e) {
      replyText = '谢谢你告诉我这些…我好像更懂你一点了 💕 能把这些说出来，本身就很不容易呢。你真的很勇敢~';
    }

    this.setData({ deepReplyFull: replyText });
    // Load story in parallel while reply types out
    this.loadStory();
    this.typewriterReply(replyText);
  },

  typewriterReply(fullText) {
    let pos = 0;
    const chars = Array.from(fullText);
    const total = chars.length;

    const timer = setInterval(() => {
      pos += 2;
      if (pos >= total) {
        clearInterval(timer);
        this.setData({
          deepReplyText: fullText,
          replyTyping: false,
          deepReplyDone: true,
          scrollTo: 'phase-reply',
        });
        return;
      }
      this.setData({ deepReplyText: chars.slice(0, pos).join('') });
    }, 40);
  },

  /* ===== Phase 3: Story ===== */
  async loadStory() {
    try {
      const data = await api.getStory(app.globalData.userConcern || '最近有点难过');
      this.setData({
        storyLoaded: true,
        storyPreamble: data.preamble,
        storyTitle: data.title,
        storyText: data.story,
        storyAfterword: data.afterword,
        scrollTo: 'phase-story',
      });
    } catch (e) {
      this.setData({
        storyLoaded: true,
        storyTitle: '小石头和溪水',
        storyText: '溪边有一颗小石头，它一直很羡慕水里的鱼儿能自由游动。溪水温柔地说："可是你知道吗，正是因为有你这颗石头，我才有了歌声。"小石头这才发现，原来自己一直都很重要。',
        scrollTo: 'phase-story',
      });
    }
  },

  onContinue() {
    wx.navigateTo({ url: '/pages/jump/jump' });
  },
});
