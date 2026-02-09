import { GAME_CONFIG } from './config';

/**
 * Generates all space-themed game textures procedurally via Canvas API.
 */
export default class TextureGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  generateAll() {
    this.generateSkyTextures();
    this.generateShipTextures();
    this.generateGhostShipTexture();
    this.generateEngineGlow();
    this.generateShieldTextures();
    this.generateStarTexture();
    this.generateSpeedLineTexture();
    this.generateNebulaTextures();
    this.generateAsteroidTextures();
    this.generatePlanetTextures();
    this.generateParticleTextures();
    this.generateShockwaveTexture();
    this.generateWarpTunnelTexture();
  }

  // ─── Sky gradients per zone ───
  generateSkyTextures() {
    GAME_CONFIG.ZONES.forEach((zone, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      const [tr, tg, tb] = zone.bgTop;
      const [br, bg, bb] = zone.bgBot;
      grad.addColorStop(0, `rgb(${tr},${tg},${tb})`);
      grad.addColorStop(1, `rgb(${br},${bg},${bb})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, 512);
      this.scene.textures.addCanvas(`sky_${i}`, canvas);
    });
  }

  // ─── Main ship (multiple frames for engine pulse) ───
  generateShipTextures() {
    const jerseys = [
      { name: 'blue', body: '#2a6aee', accent: '#1a4ab8', cockpit: '#60c0ff', engine: '#40a0ff' },
      { name: 'red', body: '#e83838', accent: '#b82020', cockpit: '#ff8060', engine: '#ff6040' },
      { name: 'yellow', body: '#e8a020', accent: '#c08010', cockpit: '#ffe080', engine: '#ffb040' },
      { name: 'green', body: '#28b868', accent: '#18884a', cockpit: '#60ffa0', engine: '#40e880' },
    ];

    jerseys.forEach(j => {
      for (let frame = 0; frame < 4; frame++) {
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        this._drawShip(ctx, 40, 24, j, frame);
        this.scene.textures.addCanvas(`ship_${j.name}_${frame}`, canvas);
      }
    });
  }

  _drawShip(ctx, cx, cy, colors, frame) {
    ctx.save();
    // ── Engine exhaust (behind ship) ──
    const enginePulse = 0.7 + Math.sin(frame * Math.PI / 2) * 0.3;
    const exLen = 12 + frame * 3;
    const exGrad = ctx.createLinearGradient(cx - 30 - exLen, cy, cx - 28, cy);
    exGrad.addColorStop(0, 'rgba(255,255,255,0)');
    exGrad.addColorStop(0.4, this._withAlpha(colors.engine, 0.2 * enginePulse));
    exGrad.addColorStop(0.8, this._withAlpha(colors.engine, 0.6 * enginePulse));
    exGrad.addColorStop(1, `rgba(255,255,255,${0.8 * enginePulse})`);
    ctx.fillStyle = exGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy - 4);
    ctx.lineTo(cx - 30 - exLen, cy);
    ctx.lineTo(cx - 28, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Outer engine glow
    const glowGrad = ctx.createRadialGradient(cx - 30, cy, 0, cx - 30, cy, 10 + frame * 2);
    glowGrad.addColorStop(0, this._withAlpha(colors.engine, 0.5 * enginePulse));
    glowGrad.addColorStop(1, this._withAlpha(colors.engine, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx - 30, cy, 10 + frame * 2, 0, Math.PI * 2);
    ctx.fill();

    // ── Main hull ──
    const hullGrad = ctx.createLinearGradient(cx, cy - 12, cx, cy + 12);
    hullGrad.addColorStop(0, this._lighten(colors.body, 40));
    hullGrad.addColorStop(0.35, colors.body);
    hullGrad.addColorStop(0.65, colors.accent);
    hullGrad.addColorStop(1, this._darken(colors.accent, 30));
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(cx + 32, cy);                     // nose tip
    ctx.bezierCurveTo(cx + 20, cy - 8, cx + 8, cy - 12, cx - 8, cy - 10);
    ctx.lineTo(cx - 26, cy - 6);                 // rear top
    ctx.lineTo(cx - 26, cy + 6);                 // rear bottom
    ctx.lineTo(cx - 8, cy + 10);
    ctx.bezierCurveTo(cx + 8, cy + 12, cx + 20, cy + 8, cx + 32, cy);
    ctx.closePath();
    ctx.fill();

    // Hull highlight stripe
    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 28, cy - 1);
    ctx.bezierCurveTo(cx + 15, cy - 6, cx, cy - 8, cx - 20, cy - 5);
    ctx.stroke();

    // ── Wings ──
    ctx.fillStyle = colors.accent;
    // Top wing
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 9);
    ctx.lineTo(cx - 16, cy - 22);
    ctx.lineTo(cx - 24, cy - 18);
    ctx.lineTo(cx - 18, cy - 8);
    ctx.closePath();
    ctx.fill();
    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 9);
    ctx.lineTo(cx - 16, cy + 22);
    ctx.lineTo(cx - 24, cy + 18);
    ctx.lineTo(cx - 18, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Wing tips glow
    ctx.fillStyle = this._withAlpha(colors.engine, 0.6);
    ctx.beginPath(); ctx.arc(cx - 16, cy - 22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 16, cy + 22, 2, 0, Math.PI * 2); ctx.fill();

    // ── Cockpit ──
    const cockpitGrad = ctx.createRadialGradient(cx + 18, cy - 2, 0, cx + 16, cy, 8);
    cockpitGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    cockpitGrad.addColorStop(0.4, colors.cockpit);
    cockpitGrad.addColorStop(1, this._darken(colors.cockpit, 40));
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(cx + 16, cy - 1, 7, 4.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit rim
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx + 16, cy - 1, 7.5, 5, -0.1, 0, Math.PI * 2);
    ctx.stroke();

    // ── Engine nozzle ──
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(cx - 28, cy - 5, 4, 10);
    ctx.fillStyle = this._withAlpha(colors.engine, 0.8 * enginePulse);
    ctx.fillRect(cx - 27, cy - 3.5, 2, 7);

    ctx.restore();
  }

  // ─── Ghost ship (other riders) ───
  generateGhostShipTexture() {
    for (let frame = 0; frame < 4; frame++) {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.globalAlpha = 0.35;
      this._drawShip(ctx, 40, 24, {
        body: '#6688bb', accent: '#445577', cockpit: '#88bbee',
        engine: '#6688cc',
      }, frame);
      this.scene.textures.addCanvas(`ship_ghost_${frame}`, canvas);
    }
  }

  // ─── Engine glow (additive sprite behind ship) ───
  generateEngineGlow() {
    const sizes = [
      { key: 'engine_glow_low', w: 40, h: 20, color: '80,140,255', alpha: 0.3 },
      { key: 'engine_glow_mid', w: 60, h: 28, color: '120,180,255', alpha: 0.5 },
      { key: 'engine_glow_high', w: 90, h: 36, color: '200,220,255', alpha: 0.7 },
      { key: 'engine_glow_max', w: 120, h: 44, color: '255,240,200', alpha: 0.85 },
    ];
    sizes.forEach(s => {
      const canvas = document.createElement('canvas');
      canvas.width = s.w;
      canvas.height = s.h;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(s.w, s.h / 2, 0, s.w * 0.3, s.h / 2, s.w * 0.9);
      grad.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
      grad.addColorStop(0.3, `rgba(${s.color},${s.alpha * 0.7})`);
      grad.addColorStop(0.7, `rgba(${s.color},${s.alpha * 0.2})`);
      grad.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s.w, s.h);
      this.scene.textures.addCanvas(s.key, canvas);
    });
  }

  // ─── Shield (HR visualization) ───
  generateShieldTextures() {
    const shields = [
      { key: 'shield_green', color: '80,230,140' },
      { key: 'shield_yellow', color: '240,220,80' },
      { key: 'shield_orange', color: '240,160,60' },
      { key: 'shield_red', color: '240,80,80' },
    ];
    shields.forEach(s => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Shield arc
      ctx.strokeStyle = `rgba(${s.color},0.4)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(50, 32, 45, 28, 0, -0.8, 0.8);
      ctx.stroke();

      // Inner glow
      const grad = ctx.createRadialGradient(50, 32, 20, 50, 32, 48);
      grad.addColorStop(0, `rgba(${s.color},0)`);
      grad.addColorStop(0.7, `rgba(${s.color},0.05)`);
      grad.addColorStop(1, `rgba(${s.color},0.15)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 100, 64);

      // Shimmer points
      ctx.fillStyle = `rgba(${s.color},0.5)`;
      for (let i = 0; i < 6; i++) {
        const angle = -0.7 + (i / 5) * 1.4;
        const px = 50 + Math.cos(angle) * 44;
        const py = 32 + Math.sin(angle) * 27;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      this.scene.textures.addCanvas(s.key, canvas);
    });
  }

  // ─── Star dot ───
  generateStarTexture() {
    [1, 2, 3].forEach(size => {
      const canvas = document.createElement('canvas');
      const s = size * 4;
      canvas.width = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(200,220,255,0.6)');
      grad.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
      this.scene.textures.addCanvas(`star_${size}`, canvas);
    });
  }

  // ─── Speed line (stretched star during high speed) ───
  generateSpeedLineTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 1, 60, 1);
    grad.addColorStop(0, 'rgba(180,200,255,0)');
    grad.addColorStop(0.3, 'rgba(200,220,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 60, 2);
    this.scene.textures.addCanvas('speed_line', canvas);
  }

  // ─── Nebula cloud patches ───
  generateNebulaTextures() {
    const nebulae = [
      { key: 'nebula_0', w: 400, h: 250, c1: '50,80,200', c2: '100,40,180' },
      { key: 'nebula_1', w: 350, h: 280, c1: '200,80,50', c2: '180,40,100' },
      { key: 'nebula_2', w: 450, h: 200, c1: '40,180,140', c2: '60,100,200' },
      { key: 'nebula_3', w: 380, h: 260, c1: '160,50,200', c2: '200,40,120' },
    ];

    nebulae.forEach(n => {
      const canvas = document.createElement('canvas');
      canvas.width = n.w;
      canvas.height = n.h;
      const ctx = canvas.getContext('2d');

      // Multiple overlapping radial gradients for organic look
      const puffs = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const px = n.w * (0.15 + Math.random() * 0.7);
        const py = n.h * (0.15 + Math.random() * 0.7);
        const pr = Math.min(n.w, n.h) * (0.2 + Math.random() * 0.35);
        const color = p % 2 === 0 ? n.c1 : n.c2;
        const alpha = 0.04 + Math.random() * 0.06;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
        grad.addColorStop(0, `rgba(${color},${alpha * 2})`);
        grad.addColorStop(0.5, `rgba(${color},${alpha})`);
        grad.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      this.scene.textures.addCanvas(n.key, canvas);
    });
  }

  // ─── Asteroids ───
  generateAsteroidTextures() {
    for (let variant = 0; variant < 5; variant++) {
      const size = 20 + variant * 12;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const cx = size / 2, cy = size / 2;
      const grey = 60 + variant * 15;

      // Irregular shape
      ctx.fillStyle = `rgb(${grey + 20},${grey + 10},${grey})`;
      ctx.beginPath();
      const points = 8 + variant * 2;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const r = (size / 2 - 2) * (0.7 + Math.sin(angle * 3.7 + variant) * 0.2 + Math.cos(angle * 2.3) * 0.1);
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Shading gradient
      const shadeGrad = ctx.createRadialGradient(cx - size * 0.15, cy - size * 0.15, 0, cx, cy, size * 0.5);
      shadeGrad.addColorStop(0, `rgba(255,255,255,0.12)`);
      shadeGrad.addColorStop(0.6, `rgba(0,0,0,0)`);
      shadeGrad.addColorStop(1, `rgba(0,0,0,0.3)`);
      ctx.fillStyle = shadeGrad;
      ctx.fill();

      // Craters
      for (let c = 0; c < 2 + variant; c++) {
        const crx = cx + (Math.random() - 0.5) * size * 0.5;
        const cry = cy + (Math.random() - 0.5) * size * 0.5;
        const crr = 1.5 + Math.random() * (size * 0.08);
        ctx.fillStyle = `rgba(0,0,0,0.2)`;
        ctx.beginPath();
        ctx.arc(crx, cry, crr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,0.08)`;
        ctx.beginPath();
        ctx.arc(crx - crr * 0.3, cry - crr * 0.3, crr * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      this.scene.textures.addCanvas(`asteroid_${variant}`, canvas);
    }
  }

  // ─── Background planets ───
  generatePlanetTextures() {
    const planets = [
      { key: 'planet_0', size: 120, baseColor: [60, 100, 180], ringColor: null },
      { key: 'planet_1', size: 90, baseColor: [180, 100, 60], ringColor: 'rgba(200,180,140,0.3)' },
      { key: 'planet_2', size: 60, baseColor: [80, 160, 120], ringColor: null },
      { key: 'planet_3', size: 150, baseColor: [140, 80, 60], ringColor: 'rgba(180,160,120,0.25)' },
    ];

    planets.forEach(p => {
      const canvas = document.createElement('canvas');
      canvas.width = p.size + 40;
      canvas.height = p.size + 40;
      const ctx = canvas.getContext('2d');
      const cx = (p.size + 40) / 2;
      const cy = (p.size + 40) / 2;
      const r = p.size / 2;

      // Planet body
      const [pr, pg, pb] = p.baseColor;
      const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      bodyGrad.addColorStop(0, `rgb(${pr + 60},${pg + 50},${pb + 40})`);
      bodyGrad.addColorStop(0.5, `rgb(${pr},${pg},${pb})`);
      bodyGrad.addColorStop(1, `rgb(${Math.max(0, pr - 40)},${Math.max(0, pg - 30)},${Math.max(0, pb - 20)})`);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere glow
      const atmosGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 15);
      atmosGrad.addColorStop(0, `rgba(${pr + 40},${pg + 40},${pb + 60},0)`);
      atmosGrad.addColorStop(0.5, `rgba(${pr + 40},${pg + 40},${pb + 60},0.06)`);
      atmosGrad.addColorStop(1, `rgba(${pr + 40},${pg + 40},${pb + 60},0)`);
      ctx.fillStyle = atmosGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
      ctx.fill();

      // Surface bands
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(${pr + 30},${pg + 20},${pb},0.15)`;
      for (let b = 0; b < 3; b++) {
        const by = cy - r + r * 0.3 + b * r * 0.3;
        ctx.fillRect(cx - r, by, r * 2, r * 0.12);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Ring
      if (p.ringColor) {
        ctx.strokeStyle = p.ringColor;
        ctx.lineWidth = r * 0.06;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.5, r * 0.2, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      this.scene.textures.addCanvas(p.key, canvas);
    });
  }

  // ─── Particles ───
  generateParticleTextures() {
    const particles = [
      { key: 'particle_blue', color: '80,140,255' },
      { key: 'particle_purple', color: '160,80,240' },
      { key: 'particle_orange', color: '255,160,60' },
      { key: 'particle_cyan', color: '60,220,200' },
      { key: 'particle_pink', color: '240,80,180' },
      { key: 'particle_white', color: '220,230,255' },
    ];
    particles.forEach(p => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
      grad.addColorStop(0, `rgba(${p.color},0.8)`);
      grad.addColorStop(0.5, `rgba(${p.color},0.3)`);
      grad.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 8, 8);
      this.scene.textures.addCanvas(p.key, canvas);
    });

    // Engine spark
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 6;
    sparkCanvas.height = 6;
    const sctx = sparkCanvas.getContext('2d');
    const sg = sctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    sg.addColorStop(0, 'rgba(255,255,255,0.9)');
    sg.addColorStop(0.5, 'rgba(180,200,255,0.4)');
    sg.addColorStop(1, 'rgba(100,150,255,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 6, 6);
    this.scene.textures.addCanvas('spark', sparkCanvas);
  }

  // ─── Shockwave (interval cleared) ───
  generateShockwaveTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const cx = 100, cy = 100;

    // Ring
    ctx.strokeStyle = 'rgba(150,200,255,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 95);
    grad.addColorStop(0, 'rgba(200,230,255,0.15)');
    grad.addColorStop(0.5, 'rgba(150,200,255,0.06)');
    grad.addColorStop(1, 'rgba(100,150,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();

    this.scene.textures.addCanvas('shockwave', canvas);
  }

  // ─── Warp tunnel (maximum effort) ───
  generateWarpTunnelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Radial streaks converging to a point
    const cx = 300, cy = 100;
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const innerR = 20;
      const outerR = 300;
      ctx.strokeStyle = `rgba(180,200,255,${0.03 + Math.random() * 0.04})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR * 0.5);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR * 0.5);
      ctx.stroke();
    }

    this.scene.textures.addCanvas('warp_tunnel', canvas);
  }

  // ─── Utility ───
  _withAlpha(hex, alpha) {
    if (hex.startsWith('rgba')) return hex;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  _lighten(hex, amount) {
    const r = Math.min(255, (parseInt(hex.slice(1, 3), 16) || 0) + amount);
    const g = Math.min(255, (parseInt(hex.slice(3, 5), 16) || 0) + amount);
    const b = Math.min(255, (parseInt(hex.slice(5, 7), 16) || 0) + amount);
    return `rgb(${r},${g},${b})`;
  }

  _darken(hex, amount) {
    const r = Math.max(0, (parseInt(hex.slice(1, 3), 16) || 0) - amount);
    const g = Math.max(0, (parseInt(hex.slice(3, 5), 16) || 0) - amount);
    const b = Math.max(0, (parseInt(hex.slice(5, 7), 16) || 0) - amount);
    return `rgb(${r},${g},${b})`;
  }
}
