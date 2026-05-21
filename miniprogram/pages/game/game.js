const app = getApp();

Page({
  data: {
    gameDone: false,
    shaking: false,
    smashSparkles: [],
    scorePop: { show: false, x: 0, y: 0 },
  },

  bottles: [],
  shards: [],
  particles: [],
  rings: [],       // expanding shockwave rings
  broken: 0,
  total: 0,
  running: false,
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  animId: null,

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.width = res[0].width;
      this.height = res[0].height;
      this.createBottles();
      this.startLoop();
    });
  },

  createBottles() {
    const w = this.width;
    const h = this.height;
    const cols = 3;
    const rows = 2;
    const cellW = w / cols;
    const cellH = h * 0.6 / rows;
    this.bottles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const colors = ['#F0A0B0', '#E8647A', '#FFB5C0', '#E88090', '#FFC0CB', '#D4526A'];
        this.bottles.push({
          x: cellW * col + cellW / 2 + (Math.random() - 0.5) * 20,
          y: h * 0.25 + cellH * row + (Math.random() - 0.5) * 10,
          w: 30, h: 60,
          color: colors[row * cols + col],
          broken: false,
        });
      }
    }
    this.total = this.bottles.length;
    this.broken = 0;
    this.running = true;
  },

  onTouch(e) {
    if (!this.running) return;
    const touch = e.touches[0];
    const mx = touch.x;
    const my = touch.y;
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i];
      if (b.broken) continue;
      const dx = mx - b.x;
      const dy = my - b.y;
      if (dx * dx / (b.w * b.w / 4) + dy * dy / (b.h * b.h / 4) < 2) {
        this.shatter(b, mx, my);
        break;
      }
    }
  },

  shatter(bottle, mx, my) {
    bottle.broken = true;
    this.broken++;

    // === VIBRATION ===
    wx.vibrateShort({ type: 'heavy' });

    // === SCREEN SHAKE ===
    this.setData({ shaking: true });
    setTimeout(() => this.setData({ shaking: false }), 500);

    // === SCORE POP ===
    this.setData({
      scorePop: { show: true, x: mx - 30, y: my - 80 },
    });
    setTimeout(() => this.setData({ 'scorePop.show': false }), 800);

    // === SMASH SPARKLES (outside canvas, CSS) ===
    const emojis = ['💥','✨','💫','⭐','🌟','💖','🔥','💕'];
    const sparkles = [];
    for (let i = 0; i < 12; i++) {
      sparkles.push({
        id: Date.now() + i,
        x: mx + (Math.random() - 0.5) * 120,
        y: my + (Math.random() - 0.5) * 120,
        emoji: emojis[i % emojis.length],
        size: 24 + Math.random() * 48,
        delay: Math.random() * 0.3,
      });
    }
    this.setData({ smashSparkles: sparkles });
    setTimeout(() => this.setData({ smashSparkles: [] }), 800);

    // === CANVAS EFFECTS ===

    // Expanding ring
    this.rings.push({
      x: bottle.x, y: bottle.y,
      radius: 4, maxRadius: 70 + Math.random() * 30,
      life: 1, decay: 0.03,
      color: bottle.color,
    });

    // More glass shards (20-30 pieces)
    const shardCount = 20 + Math.floor(Math.random() * 12);
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.shards.push({
        x: bottle.x, y: bottle.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 2 + Math.random() * 7,
        color: bottle.color,
        life: 1,
        decay: 0.012 + Math.random() * 0.025,
      });
    }

    // Gold sparkle particles
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: bottle.x + (Math.random() - 0.5) * 40,
        y: bottle.y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 2,
        life: 1,
        decay: 0.008 + Math.random() * 0.018,
        size: 2 + Math.random() * 5,
      });
    }

    if (this.broken >= this.total) {
      // Final burst — extra special
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: bottle.x + (Math.random() - 0.5) * 60,
          y: bottle.y + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 4,
          life: 1, decay: 0.006 + Math.random() * 0.012,
          size: 3 + Math.random() * 7,
        });
      }
      wx.vibrateShort({ type: 'heavy' });
      setTimeout(() => wx.vibrateShort({ type: 'heavy' }), 150);

      setTimeout(() => {
        this.running = false;
        if (this.animId) this.canvas.cancelAnimationFrame(this.animId);
        this.setData({ gameDone: true });
      }, 700);
    }
  },

  startLoop() {
    const loop = () => {
      if (!this.running && this.shards.length === 0 && this.rings.length === 0 && this.particles.length === 0) return;
      this.animId = this.canvas.requestAnimationFrame(loop);
      this.draw();
    };
    loop();
  },

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    // 喜羊羊蓝天白云草地背景
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#5B9BD5');
    bg.addColorStop(0.3, '#7BB8E5');
    bg.addColorStop(0.55, '#A8D5F2');
    bg.addColorStop(0.7, '#B8D9A8');
    bg.addColorStop(0.85, '#7EC850');
    bg.addColorStop(1, '#5DA83A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 画几朵白云
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.drawCloud(ctx, w * 0.15, h * 0.12, 35);
    this.drawCloud(ctx, w * 0.55, h * 0.08, 45);
    this.drawCloud(ctx, w * 0.78, h * 0.18, 28);

    // 绿色草地架子
    ctx.fillStyle = '#6B8E5A';
    ctx.fillRect(0, h * 0.6 - 2, w, 4);
    ctx.fillStyle = '#8DA870';
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Expanding rings
    this.rings = this.rings.filter(r => {
      r.radius += 3;
      r.life -= r.decay;
      if (r.life <= 0) return false;
      ctx.globalAlpha = r.life * 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });

    // Bottles
    this.bottles.forEach(b => {
      if (b.broken) return;
      const grad = ctx.createLinearGradient(b.x - b.w / 2, 0, b.x + b.w / 2, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.3, b.color);
      grad.addColorStop(0.7, b.color);
      grad.addColorStop(1, 'rgba(255,255,255,0.3)');
      ctx.fillStyle = grad;
      this.roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 6);
      ctx.fill();
      // Neck
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 6, b.y - b.h / 2 - 14, 12, 16);
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(b.x - b.w / 2 + 4, b.y - b.h / 2 + 6, 5, b.h - 16);
      // Cork
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(b.x - 7, b.y - b.h / 2 - 18, 14, 8);
    });

    // Glass shards
    this.shards = this.shards.filter(s => {
      s.x += s.vx;
      s.vy += 0.18;
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) return false;
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.life * 3);
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.3);
      ctx.restore();
      return true;
    });

    // Gold sparkle particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.globalAlpha = p.life;
      // gold-to-white gradient sparkle
      const sparkGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      sparkGrad.addColorStop(0, '#FFF');
      sparkGrad.addColorStop(0.5, '#FFD54F');
      sparkGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sparkGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    ctx.globalAlpha = 1;
  },

  drawCloud(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.4, cy - size * 0.15, size * 0.45, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.8, cy, size * 0.4, 0, Math.PI * 2);
    ctx.arc(cx - size * 0.35, cy + size * 0.05, size * 0.38, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.2, cy + size * 0.1, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  onUnload() {
    if (this.animId) this.canvas.cancelAnimationFrame(this.animId);
  },

  onContinue() {
    wx.navigateTo({ url: '/pages/end/end' });
  },
});
