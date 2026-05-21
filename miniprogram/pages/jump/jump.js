const app = getApp();

// 3D isometric offsets
const DX = 14;
const DY = 9;

// Platform colors — warm and grassland-themed
const PLATFORM_COLORS = [
  { top: '#FFCC80', front: '#FF9800', right: '#E68900' },
  { top: '#FFAB91', front: '#FF6E40', right: '#D95530' },
  { top: '#A5D6A7', front: '#66BB6A', right: '#4A9E4E' },
  { top: '#90CAF9', front: '#42A5F5', right: '#2E8AD8' },
  { top: '#CE93D8', front: '#AB47BC', right: '#8E34A0' },
  { top: '#FFF59D', front: '#FFCA28', right: '#E0AA00' },
  { top: '#EF9A9A', front: '#EF5350', right: '#D42A2A' },
  { top: '#80CBC4', front: '#26A69A', right: '#1E847A' },
];

Page({
  data: {
    score: 0,
    gameState: 'ready',
    powerRatio: 0,
    powerColor: '#FFCA28',
    scorePop: false,
  },

  /* ===== Game state ===== */
  platforms: [],
  player: null,
  power: 0,
  chargeStart: 0,
  animId: null,
  canvas: null,
  ctx: null,
  cw: 0,
  ch: 0,
  dpr: 1,
  groundY: 0,
  cameraX: 0,
  targetCameraX: 0,
  currentPlatformIndex: 0,
  nextPlatform: null,
  particles: [],
  scorePopups: [],

  onShow() {
    app.playMusic();
  },

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#jumpCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      this.cw = res[0].width;
      this.ch = res[0].height;
      canvas.width = this.cw * dpr;
      canvas.height = this.ch * dpr;
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.dpr = dpr;
      this.groundY = this.ch * 0.72;
      this.initGame();
      this.startLoop();
    });
  },

  initGame() {
    const cx = this.cw * 0.35;
    this.cameraX = 0;
    this.targetCameraX = 0;
    this.currentPlatformIndex = 0;
    this.particles = [];
    this.scorePopups = [];

    // First platform — centered, wider
    this.platforms = [{
      x: cx,
      w: 90,
      h: 30,
      color: PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)],
      scored: false,
    }];

    // Generate next platform
    this.nextPlatform = this.generatePlatform(this.platforms[0]);

    // Player stands on first platform
    const p = this.platforms[0];
    this.player = {
      x: p.x + p.w / 2,
      y: this.groundY - p.h - DY - 28,
      baseY: this.groundY - p.h - DY - 28,
      vx: 0,
      vy: 0,
      squish: 0,
      jumping: false,
      rotation: 0,
    };

    this._gameState = 'ready';
    this.setData({ score: 0, gameState: 'ready', powerRatio: 0 });
  },

  generatePlatform(from) {
    const minGap = 60;
    const maxGap = 180;
    const gap = minGap + Math.random() * (maxGap - minGap);
    const w = 60 + Math.random() * 70;
    return {
      x: from.x + from.w + gap,
      w: w,
      h: 28,
      color: PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)],
      scored: false,
    };
  },

  /* ===== Touch ===== */

  onTouchStart(e) {
    const state = this._gameState || this.data.gameState;
    if (state === 'gameover' || state === 'complete') return;
    if (state === 'ready') {
      this._gameState = 'charging';
      this.setData({ gameState: 'charging' });
      this.chargeStart = Date.now();
      this.power = 0;
      return;
    }
    if (state === 'charging') {
      this.chargeStart = Date.now();
      this.power = 0;
    }
  },

  onTouchEnd(e) {
    const state = this._gameState || this.data.gameState;
    if (state !== 'charging') return;
    if (!this.chargeStart) return;

    const chargeTime = Math.min((Date.now() - this.chargeStart) / 1000, 2.0);
    this.power = chargeTime / 2.0; // 0 ~ 1
    this.chargeStart = 0;

    // Calculate jump
    const angle = 0.87; // ~50 degrees, mostly up-forward
    const speed = 280 + this.power * 320;
    this.player.vx = Math.cos(angle) * speed * (0.6 + this.power * 0.4);
    this.player.vy = -Math.sin(angle) * speed * (0.6 + this.power * 0.4);
    this.player.jumping = true;
    this.player.squish = 0;

    this._gameState = 'jumping';
    this.setData({ gameState: 'jumping', powerRatio: 0 });
  },

  /* ===== Game Loop ===== */

  startLoop() {
    let lastTime = Date.now();
    const loop = () => {
      this.animId = this.canvas.requestAnimationFrame(loop);
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      this.update(dt);
      this.draw();
    };
    loop();
  },

  update(dt) {
    // Update charging — use _gameState for instant read
    const gs = this._gameState || this.data.gameState;
    if (gs === 'charging' && this.chargeStart) {
      const chargeTime = (Date.now() - this.chargeStart) / 1000;
      this.power = Math.min(chargeTime / 2.0, 1.0);
      const pct = Math.round(this.power * 100);
      let color = '#FFCA28';
      if (this.power > 0.7) color = '#EF5350';
      else if (this.power > 0.35) color = '#FF9800';
      this.setData({
        powerRatio: pct,
        powerColor: color,
      });
    }

    // Player squish when charging
    if (gs === 'charging') {
      this.player.squish = this.power * 0.25;
    }

    // Camera smoothing
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;

    // Update player physics
    if (this.player.jumping) {
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
      this.player.vy += 680 * dt; // gravity
      this.player.rotation += this.player.vx * 0.003 * dt;
    }

    // Check landing on next platform
    if (this.player.jumping && this.player.vy > 0 && this.nextPlatform && !this.nextPlatform.scored) {
      const np = this.nextPlatform;
      const platTopY = this.groundY - np.h - DY;
      const playerBottom = this.player.y + 8;

      if (playerBottom >= platTopY - 6 && playerBottom <= platTopY + 18) {
        const playerCenterX = this.player.x;
        const platLeft = np.x;
        const platRight = np.x + np.w;

        if (playerCenterX >= platLeft - 4 && playerCenterX <= platRight + 4) {
          // Landed!
          this.player.jumping = false;
          this.player.vy = 0;
          this.player.vx = 0;
          this.player.rotation = 0;
          this.player.y = platTopY;
          this.player.baseY = platTopY;
          this.player.x = Math.max(platLeft, Math.min(platRight, playerCenterX));

          const centerX = np.x + np.w / 2;
          const dist = Math.abs(this.player.x - centerX);
          const perfectThreshold = np.w * 0.18;

          if (dist < perfectThreshold) {
            // Perfect landing!
            np.scored = true;
            const newScore = this.data.score + 2;
            this.setData({ score: newScore, scorePop: true });
            setTimeout(() => this.setData({ scorePop: false }), 300);
            this.showScorePop('完美! +2', 'perfect', this.player.x - this.cameraX, this.player.y);
            this.spawnParticles(this.player.x, this.player.y, '#FFD54F', 18);
            wx.vibrateShort({ type: 'heavy' });
          } else {
            // Normal landing
            np.scored = true;
            const newScore = this.data.score + 1;
            this.setData({ score: newScore, scorePop: true });
            setTimeout(() => this.setData({ scorePop: false }), 300);
            this.showScorePop('+1', 'normal', this.player.x - this.cameraX, this.player.y);
            wx.vibrateShort({ type: 'light' });
          }

          // Move to this platform
          this.platforms.push(np);
          this.currentPlatformIndex++;
          this.targetCameraX = np.x + np.w / 2 - this.cw * 0.38;

          // Generate next platform
          this.nextPlatform = this.generatePlatform(np);
          this.player.baseY = platTopY;

          // Check win
          if (this.data.score >= 6) {
            setTimeout(() => {
              this.setData({ gameState: 'complete' });
              this._gameState = 'complete';
              wx.vibrateShort({ type: 'heavy' });
            }, 400);
          } else {
            this.setData({ gameState: 'charging' });
            this._gameState = 'charging';
          }
        }
      }

      // Check if player fell below ground (missed)
      if (this.player.y > this.groundY + 60) {
        this.player.jumping = false;
        this.setData({ gameState: 'gameover' });
        this._gameState = 'gameover';
        wx.vibrateShort({ type: 'heavy' });
      }
    }

    // Also check ground collision for landed player
    if (!this.player.jumping) {
      this.player.x = this.player.x;
      this.player.y = this.player.baseY + this.player.squish * 12;
    }

    // Update camera target while charging
    if (gs === 'charging' && this.nextPlatform) {
      // Slightly look toward the next platform
      const midX = (this.platforms[this.currentPlatformIndex].x + this.nextPlatform.x) / 2;
      this.targetCameraX = midX + this.nextPlatform.w / 2 - this.cw * 0.38;
    }

    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt * 1.8;
      return p.life > 0;
    });

    // Update score popups
    this.scorePopups = this.scorePopups.filter(p => {
      p.y -= 50 * dt;
      p.life -= dt * 1.2;
      return p.life > 0;
    });
  },

  showScorePop(text, cls, x, y) {
    this.scorePopups.push({ text, cls, x, y, life: 1.4 });
  },

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 0.6 + Math.random() * 0.5,
        size: 2 + Math.random() * 5,
        color,
      });
    }
  },

  /* ===== Render ===== */

  draw() {
    const ctx = this.ctx;
    const w = this.cw;
    const h = this.ch;
    const camX = this.cameraX;
    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#5B9BD5');
    sky.addColorStop(0.4, '#87C0EB');
    sky.addColorStop(0.65, '#B8D9A8');
    sky.addColorStop(0.78, '#7EC850');
    sky.addColorStop(1, '#5DA83A');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.drawCloud(ctx, w * 0.12 - camX * 0.05, h * 0.12, 30);
    this.drawCloud(ctx, w * 0.58 - camX * 0.03, h * 0.08, 40);
    this.drawCloud(ctx, w * 0.82 - camX * 0.04, h * 0.16, 25);

    // Ground line
    const gy = this.groundY;
    ctx.fillStyle = '#7EC850';
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = '#8DA870';
    ctx.fillRect(0, gy + 2, w, 4);

    // Draw next platform first (behind)
    if (this.nextPlatform && !this.nextPlatform.scored) {
      this.drawPlatform(ctx, this.nextPlatform, camX, gy);
    }

    // Draw all landed platforms
    for (let i = 0; i <= this.currentPlatformIndex; i++) {
      if (i < this.platforms.length) {
        this.drawPlatform(ctx, this.platforms[i], camX, gy);
      }
    }

    // Draw player shadow
    const sx = this.player.x - camX;
    const sy = this.player.baseY + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx, this.groundY - 2, 16 + this.player.squish * 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw player (tooth character)
    this.drawPlayer(ctx, sx, sy);

    // Draw particles
    this.particles.forEach(p => {
      const px = p.x - camX;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw score popups
    this.scorePopups.forEach(p => {
      const px = p.x - camX;
      ctx.globalAlpha = p.life;
      ctx.font = 'bold 22px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      if (p.cls === 'perfect') {
        ctx.fillStyle = '#FF6D00';
        ctx.shadowColor = 'rgba(255,180,0,0.6)';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 4;
      }
      ctx.fillText(p.text, px, p.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  },

  drawPlatform(ctx, p, camX, gy) {
    const x = p.x - camX;
    const y = gy;
    const { w, h: ph, color } = p;

    // Right face (darker)
    ctx.fillStyle = color.right;
    ctx.beginPath();
    ctx.moveTo(x + w, y - ph);
    ctx.lineTo(x + w + DX, y - ph - DY);
    ctx.lineTo(x + w + DX, y - DY);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    // Front face (main color)
    ctx.fillStyle = color.front;
    ctx.beginPath();
    ctx.moveTo(x, y - ph);
    ctx.lineTo(x + w, y - ph);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    // Top face (lighter)
    ctx.fillStyle = color.top;
    ctx.beginPath();
    ctx.moveTo(x, y - ph);
    ctx.lineTo(x + DX, y - ph - DY);
    ctx.lineTo(x + w + DX, y - ph - DY);
    ctx.lineTo(x + w, y - ph);
    ctx.closePath();
    ctx.fill();

    // Top highlight line
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - ph);
    ctx.lineTo(x + w, y - ph);
    ctx.stroke();
    ctx.lineWidth = 1;
  },

  drawPlayer(ctx, x, y) {
    const squish = this.player.squish || 0;
    const rot = this.player.rotation || 0;

    ctx.save();
    ctx.translate(x, y);
    if (rot !== 0) ctx.rotate(rot);

    const scaleX = 1 + squish * 0.4;
    const scaleY = 1 - squish * 0.3;
    ctx.scale(scaleX, scaleY);

    // Tooth body
    const bw = 28;
    const bh = 32;
    const bodyGrad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    bodyGrad.addColorStop(0, '#FFFAF8');
    bodyGrad.addColorStop(0.5, '#FFF5F0');
    bodyGrad.addColorStop(1, '#F5E8E0');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, bh * 0.15);
    ctx.quadraticCurveTo(-bw / 2, -bh / 2, 0, -bh / 2);
    ctx.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, bh * 0.15);
    ctx.quadraticCurveTo(bw / 2, bh / 2, bw * 0.35, bh / 2);
    ctx.quadraticCurveTo(bw * 0.25, bh / 2 + 3, 0, bh / 2 - 1);
    ctx.quadraticCurveTo(-bw * 0.25, bh / 2 + 3, -bw * 0.35, bh / 2);
    ctx.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh * 0.15);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-4, -9, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1A0A14';
    ctx.beginPath(); ctx.arc(-8, -4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -4, 5, 0, Math.PI * 2); ctx.fill();
    // Eye highlights
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-6, -6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -6, 2, 0, Math.PI * 2); ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255,150,160,0.4)';
    ctx.beginPath(); ctx.ellipse(-13, 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#C08080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Little arms
    ctx.fillStyle = '#F0E5DC';
    ctx.beginPath();
    ctx.ellipse(-bw / 2 - 3, 0, 5, 9, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bw / 2 + 3, 0, 5, 9, 0.4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  },

  drawCloud(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.4, cy - size * 0.15, size * 0.45, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.75, cy, size * 0.38, 0, Math.PI * 2);
    ctx.arc(cx - size * 0.3, cy + size * 0.05, size * 0.36, 0, Math.PI * 2);
    ctx.fill();
  },

  /* ===== Actions ===== */

  onRetry() {
    this.cameraX = 0;
    this.targetCameraX = 0;
    this.initGame();
    this._gameState = 'ready';
    this.setData({ gameState: 'ready', score: 0 });
  },

  onSkip() {
    wx.navigateTo({ url: '/pages/game/game' });
  },

  onContinue() {
    wx.navigateTo({ url: '/pages/game/game' });
  },

  onUnload() {
    if (this.animId) this.canvas.cancelAnimationFrame(this.animId);
  },
});
