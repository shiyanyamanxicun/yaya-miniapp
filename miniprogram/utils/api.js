const app = getApp();

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBase + path,
      method: method,
      data: data,
      timeout: 30000,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) ? res.data.error : '请求失败';
          reject(new Error(msg));
        }
      },
      fail(err) {
        reject(new Error('网络错误，请检查连接'));
      },
    });
  });
}

module.exports = {
  sendMessage(message) {
    return request('/api/conversation', 'POST', { message, scene: '' });
  },

  getSymptomAdvice(symptom) {
    return request('/api/symptom', 'POST', { symptom });
  },

  getStory(concern) {
    return request('/api/story', 'POST', { concern });
  },

  getDeepTalk(concern, symptom) {
    return request('/api/deep-talk', 'POST', { concern, symptom });
  },

  getDeepReply(concern, question, answer) {
    return request('/api/deep-reply', 'POST', { concern, question, answer });
  },

  releaseButterfly(sessionId) {
    return request('/api/release', 'POST', { session_id: sessionId });
  },

  getButterflies() {
    return request('/api/butterflies', 'GET');
  },
};
