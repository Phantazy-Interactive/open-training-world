import { GAME_CONFIG } from './config';

/**
 * TextureGenerator - Creates all game textures procedurally using Canvas API.
 * This eliminates the need for external sprite assets while producing
 * rich, appealing visuals.
 */
export default class TextureGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  generateAll() {
    this.generateSkyTextures();
    this.generateMountainTextures();
    this.generateHillTextures();
    this.generateTreeTextures();
    this.generateCloudTextures();
    this.generateHouseTextures();
    this.generateCyclistTextures();
    this.generateRoadTexture();
    this.generateParticleTextures();
    this.generateWaterTexture();
    this.generateBushTextures();
    this.generateRockTextures();
    this.generateSunTexture();
    this.generateBirdTexture();
    this.generateKmMarkerTexture();
  }

  // ─── Sky gradient textures per zone ───
  generateSkyTextures() {
    const { ZONES } = GAME_CONFIG;
    ZONES.forEach((zone, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 400);
      const [tr, tg, tb] = zone.skyTop;
      const [br, bg, bb] = zone.skyBot;
      grad.addColorStop(0, `rgb(${tr},${tg},${tb})`);
      grad.addColorStop(1, `rgb(${br},${bg},${bb})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 400);
      this.scene.textures.addCanvas(`sky_${i}`, canvas);
    });
  }

  // ─── Mountains (far background) ───
  generateMountainTextures() {
    // Far mountains - misty blue
    for (let variant = 0; variant < 3; variant++) {
      const w = 300 + variant * 80;
      const h = 200 + variant * 40;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Mountain body gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const baseR = 90 + variant * 15;
      const baseG = 110 + variant * 10;
      const baseB = 140 + variant * 8;
      grad.addColorStop(0, `rgb(${baseR - 20},${baseG - 10},${baseB})`);
      grad.addColorStop(0.4, `rgb(${baseR},${baseG},${baseB})`);
      grad.addColorStop(1, `rgb(${baseR + 30},${baseG + 25},${baseB + 15})`);
      ctx.fillStyle = grad;

      // Jagged mountain shape
      ctx.beginPath();
      ctx.moveTo(0, h);
      const peaks = 3 + variant;
      const segW = w / peaks;
      for (let p = 0; p <= peaks; p++) {
        const px = p * segW;
        const py = p === Math.floor(peaks / 2) ? 0 :
          h * (0.2 + Math.abs(p - peaks / 2) / peaks * 0.5) + (Math.sin(p * 2.7) * h * 0.1);
        if (p === 0) ctx.lineTo(px, py + h * 0.3);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Snow caps
      ctx.fillStyle = 'rgba(220,230,240,0.6)';
      ctx.beginPath();
      for (let p = 0; p <= peaks; p++) {
        const px = p * segW;
        const py = p === Math.floor(peaks / 2) ? 0 :
          h * (0.2 + Math.abs(p - peaks / 2) / peaks * 0.5) + (Math.sin(p * 2.7) * h * 0.1);
        const snowPy = (p === 0 ? py + h * 0.3 : py) + h * 0.08;
        if (p === 0) { ctx.moveTo(px, snowPy); ctx.lineTo(px, p === 0 ? py + h * 0.3 : py); }
        else { ctx.lineTo(px, py); ctx.lineTo(px, snowPy); }
      }
      ctx.closePath();
      ctx.fill();

      // Atmospheric haze at base
      const hazeGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
      hazeGrad.addColorStop(0, 'rgba(180,200,220,0)');
      hazeGrad.addColorStop(1, 'rgba(180,200,220,0.7)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      this.scene.textures.addCanvas(`mountain_${variant}`, canvas);
    }
  }

  // ─── Rolling hills (mid-ground) ───
  generateHillTextures() {
    const colors = [
      { r: 70, g: 120, b: 65 },   // green hill
      { r: 85, g: 130, b: 75 },   // lighter green
      { r: 60, g: 100, b: 60 },   // dark green
      { r: 100, g: 120, b: 100 }, // rocky
    ];

    colors.forEach((c, i) => {
      const w = 400 + i * 60;
      const h = 120 + i * 20;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${c.r + 20},${c.g + 20},${c.b + 15})`);
      grad.addColorStop(1, `rgb(${c.r - 15},${c.g - 15},${c.b - 10})`);
      ctx.fillStyle = grad;

      // Smooth hill shape using bezier
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.6);
      ctx.bezierCurveTo(w * 0.2, -h * 0.1, w * 0.4, h * 0.1, w * 0.5, h * 0.15);
      ctx.bezierCurveTo(w * 0.6, h * 0.2, w * 0.8, -h * 0.05, w, h * 0.5);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Subtle texture overlay
      ctx.globalAlpha = 0.05;
      for (let x = 0; x < w; x += 3) {
        for (let y = 0; y < h; y += 3) {
          if (Math.random() > 0.7) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }

      this.scene.textures.addCanvas(`hill_${i}`, canvas);
    });
  }

  // ─── Tree textures ───
  generateTreeTextures() {
    this._generatePineTree('tree_pine_1', 45, 90, [30, 85, 30], [20, 60, 20]);
    this._generatePineTree('tree_pine_2', 35, 75, [35, 90, 35], [25, 65, 25]);
    this._generatePineTree('tree_pine_3', 55, 110, [25, 75, 25], [15, 50, 15]);
    this._generateBirchTree('tree_birch_1', 30, 85);
    this._generateBirchTree('tree_birch_2', 25, 70);
    this._generateOakTree('tree_oak_1', 60, 80);
    this._generateSnowPine('tree_snow_1', 45, 95);
    this._generateDeadTree('tree_dead_1', 25, 70);
  }

  _generatePineTree(key, width, height, colorLight, colorDark) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;

    // Trunk
    const trunkW = width * 0.1;
    const trunkH = height * 0.3;
    const grad = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
    grad.addColorStop(0, '#3a2510');
    grad.addColorStop(0.5, '#5c3d1e');
    grad.addColorStop(1, '#3a2510');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - trunkW / 2, height - trunkH, trunkW, trunkH);

    // Foliage - multiple layered triangles
    const layers = 4;
    for (let i = layers - 1; i >= 0; i--) {
      const layerBot = height - trunkH + height * 0.05 - i * (height * 0.55 / layers);
      const layerTop = layerBot - height * 0.35;
      const layerW = width * (0.9 - i * 0.12);

      const fGrad = ctx.createLinearGradient(0, layerTop, 0, layerBot);
      const [lr, lg, lb] = colorLight;
      const [dr, dg, db] = colorDark;
      const f = i / layers;
      fGrad.addColorStop(0, `rgb(${lr + f * 15},${lg + f * 15},${lb + f * 10})`);
      fGrad.addColorStop(1, `rgb(${dr - f * 10},${dg - f * 10},${db - f * 5})`);
      ctx.fillStyle = fGrad;

      ctx.beginPath();
      ctx.moveTo(cx - layerW / 2, layerBot);
      ctx.lineTo(cx, layerTop);
      ctx.lineTo(cx + layerW / 2, layerBot);
      ctx.closePath();
      ctx.fill();

      // Snow highlights on left side
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(cx - layerW / 2, layerBot);
      ctx.lineTo(cx, layerTop);
      ctx.lineTo(cx - layerW * 0.15, layerBot);
      ctx.closePath();
      ctx.fill();
    }

    this.scene.textures.addCanvas(key, canvas);
  }

  _generateBirchTree(key, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;

    // White trunk with black marks
    const trunkW = width * 0.12;
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(cx - trunkW / 2, height * 0.3, trunkW, height * 0.7);

    // Birch bark marks
    ctx.fillStyle = 'rgba(40,30,20,0.4)';
    for (let i = 0; i < 8; i++) {
      const my = height * 0.35 + i * height * 0.08;
      const mw = trunkW * (0.4 + Math.random() * 0.4);
      ctx.fillRect(cx - mw / 2, my, mw, 1.5);
    }

    // Leafy canopy - multiple soft circles
    const canopyColors = ['rgba(130,190,80,0.7)', 'rgba(110,170,60,0.6)', 'rgba(150,200,90,0.5)'];
    const canopyCX = cx;
    const canopyCY = height * 0.25;
    const canopyR = width * 0.4;

    canopyColors.forEach((color, i) => {
      ctx.fillStyle = color;
      const offX = (i - 1) * canopyR * 0.3;
      const offY = (i - 1) * canopyR * 0.15;
      ctx.beginPath();
      ctx.arc(canopyCX + offX, canopyCY + offY, canopyR * (1 - i * 0.1), 0, Math.PI * 2);
      ctx.fill();
    });

    // Leaf detail dots
    ctx.fillStyle = 'rgba(170,210,100,0.4)';
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * canopyR * 0.8;
      ctx.beginPath();
      ctx.arc(canopyCX + Math.cos(angle) * dist, canopyCY + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.scene.textures.addCanvas(key, canvas);
  }

  _generateOakTree(key, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;

    // Thick brown trunk
    const trunkW = width * 0.15;
    const grad = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
    grad.addColorStop(0, '#3a2815');
    grad.addColorStop(0.3, '#5a401e');
    grad.addColorStop(0.7, '#5a401e');
    grad.addColorStop(1, '#3a2815');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - trunkW / 2, height * 0.35, trunkW, height * 0.65);

    // Branches
    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, height * 0.45);
    ctx.lineTo(cx - width * 0.25, height * 0.3);
    ctx.moveTo(cx, height * 0.42);
    ctx.lineTo(cx + width * 0.3, height * 0.28);
    ctx.stroke();

    // Big round canopy
    const canopyGrad = ctx.createRadialGradient(cx, height * 0.25, 0, cx, height * 0.25, width * 0.42);
    canopyGrad.addColorStop(0, 'rgba(80,140,50,0.9)');
    canopyGrad.addColorStop(0.6, 'rgba(55,110,35,0.85)');
    canopyGrad.addColorStop(1, 'rgba(40,80,25,0.7)');
    ctx.fillStyle = canopyGrad;

    // Lumpy canopy outline
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const r = width * 0.35 + Math.sin(a * 3.7) * width * 0.06 + Math.cos(a * 5.1) * width * 0.04;
      const px = cx + Math.cos(a) * r;
      const py = height * 0.25 + Math.sin(a) * r * 0.75;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Light spots
    ctx.fillStyle = 'rgba(120,180,70,0.3)';
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * width * 0.25;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * dist, height * 0.25 + Math.sin(angle) * dist * 0.7, 5 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    this.scene.textures.addCanvas(key, canvas);
  }

  _generateSnowPine(key, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;

    // Trunk
    ctx.fillStyle = '#4a3525';
    ctx.fillRect(cx - 2.5, height * 0.65, 5, height * 0.35);

    // Snow-laden foliage
    const layers = 4;
    for (let i = layers - 1; i >= 0; i--) {
      const layerBot = height * 0.7 - i * (height * 0.5 / layers);
      const layerTop = layerBot - height * 0.28;
      const layerW = width * (0.85 - i * 0.1);

      // Dark green base
      ctx.fillStyle = `rgb(${25 + i * 8},${55 + i * 10},${30 + i * 5})`;
      ctx.beginPath();
      ctx.moveTo(cx - layerW / 2, layerBot);
      ctx.lineTo(cx, layerTop);
      ctx.lineTo(cx + layerW / 2, layerBot);
      ctx.closePath();
      ctx.fill();

      // Snow on top of each layer
      ctx.fillStyle = 'rgba(230,240,248,0.7)';
      ctx.beginPath();
      ctx.moveTo(cx - layerW * 0.35, layerBot - (layerBot - layerTop) * 0.5);
      ctx.lineTo(cx, layerTop);
      ctx.lineTo(cx + layerW * 0.35, layerBot - (layerBot - layerTop) * 0.5);
      ctx.quadraticCurveTo(cx, layerBot - (layerBot - layerTop) * 0.35, cx - layerW * 0.35, layerBot - (layerBot - layerTop) * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    this.scene.textures.addCanvas(key, canvas);
  }

  _generateDeadTree(key, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;

    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Main trunk
    ctx.beginPath();
    ctx.moveTo(cx, height);
    ctx.lineTo(cx - 1, height * 0.3);
    ctx.stroke();

    // Branches
    ctx.lineWidth = 2;
    const branches = [
      [0.5, -0.25, 0.2], [0.45, 0.2, 0.25], [0.35, -0.3, 0.15],
      [0.6, 0.15, 0.18], [0.3, -0.15, 0.22],
    ];
    branches.forEach(([startY, dx, len]) => {
      ctx.beginPath();
      ctx.moveTo(cx, height * startY);
      ctx.lineTo(cx + width * dx, height * (startY - len));
      ctx.stroke();
    });

    this.scene.textures.addCanvas(key, canvas);
  }

  // ─── Clouds ───
  generateCloudTextures() {
    for (let variant = 0; variant < 4; variant++) {
      const w = 120 + variant * 40;
      const h = 40 + variant * 10;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const puffs = 3 + variant;
      for (let p = 0; p < puffs; p++) {
        const px = w * (0.15 + p * 0.7 / puffs) + (Math.sin(p * 1.5) * w * 0.05);
        const py = h * 0.5 + Math.sin(p * 2) * h * 0.1;
        const pr = h * (0.3 + Math.random() * 0.2);

        const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      this.scene.textures.addCanvas(`cloud_${variant}`, canvas);
    }
  }

  // ─── Houses ───
  generateHouseTextures() {
    const houseStyles = [
      { w: 50, h: 50, wallColor: '#c8432b', roofColor: '#2a1a10', hasChimney: true },  // Red Scandinavian
      { w: 45, h: 42, wallColor: '#d4a850', roofColor: '#3a2815', hasChimney: false },  // Yellow
      { w: 55, h: 55, wallColor: '#8b2020', roofColor: '#1a1210', hasChimney: true },   // Dark red
      { w: 40, h: 38, wallColor: '#e8ddd0', roofColor: '#4a3a2a', hasChimney: false },  // White
    ];

    houseStyles.forEach((style, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = style.w;
      canvas.height = style.h;
      const ctx = canvas.getContext('2d');

      const wallH = style.h * 0.55;
      const roofH = style.h * 0.45;
      const wallY = style.h - wallH;

      // Wall
      ctx.fillStyle = style.wallColor;
      ctx.fillRect(style.w * 0.1, wallY, style.w * 0.8, wallH);

      // Wall shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(style.w * 0.5, wallY, style.w * 0.4, wallH);

      // Roof
      ctx.fillStyle = style.roofColor;
      ctx.beginPath();
      ctx.moveTo(0, wallY + 2);
      ctx.lineTo(style.w / 2, wallY - roofH);
      ctx.lineTo(style.w, wallY + 2);
      ctx.closePath();
      ctx.fill();

      // Window(s)
      ctx.fillStyle = 'rgba(200,220,240,0.8)';
      const winSize = style.w * 0.12;
      ctx.fillRect(style.w * 0.25, wallY + wallH * 0.2, winSize, winSize);
      ctx.fillRect(style.w * 0.6, wallY + wallH * 0.2, winSize, winSize);

      // Window cross
      ctx.strokeStyle = style.wallColor;
      ctx.lineWidth = 1;
      [style.w * 0.25, style.w * 0.6].forEach(wx => {
        ctx.beginPath();
        ctx.moveTo(wx + winSize / 2, wallY + wallH * 0.2);
        ctx.lineTo(wx + winSize / 2, wallY + wallH * 0.2 + winSize);
        ctx.moveTo(wx, wallY + wallH * 0.2 + winSize / 2);
        ctx.lineTo(wx + winSize, wallY + wallH * 0.2 + winSize / 2);
        ctx.stroke();
      });

      // Door
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(style.w * 0.4, wallY + wallH * 0.45, style.w * 0.16, wallH * 0.55);

      // Chimney
      if (style.hasChimney) {
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(style.w * 0.65, wallY - roofH * 0.5, style.w * 0.1, roofH * 0.6);
      }

      this.scene.textures.addCanvas(`house_${i}`, canvas);
    });
  }

  // ─── Cyclist (multiple frames for pedaling animation) ───
  generateCyclistTextures() {
    const frameCount = 8;
    const size = 80;
    const jerseyColors = [
      { name: 'blue', color: '#3b82f6', dark: '#2563eb' },
      { name: 'red', color: '#ef4444', dark: '#dc2626' },
      { name: 'yellow', color: '#f59e0b', dark: '#d97706' },
      { name: 'green', color: '#10b981', dark: '#059669' },
    ];

    jerseyColors.forEach(jersey => {
      for (let frame = 0; frame < frameCount; frame++) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.translate(size / 2, size / 2 + 5);

        const angle = (frame / frameCount) * Math.PI * 2;
        this._drawCyclistFrame(ctx, angle, jersey.color, jersey.dark);

        this.scene.textures.addCanvas(`cyclist_${jersey.name}_${frame}`, canvas);
      }
    });

    // Ghost rider (transparent)
    for (let frame = 0; frame < frameCount; frame++) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.translate(size / 2, size / 2 + 5);
      ctx.globalAlpha = 0.4;
      this._drawCyclistFrame(ctx, (frame / frameCount) * Math.PI * 2, '#8888ff', '#6666dd');
      this.scene.textures.addCanvas(`cyclist_ghost_${frame}`, canvas);
    }
  }

  _drawCyclistFrame(ctx, pedalAngle, jerseyColor, jerseyDark) {
    const scale = 1.0;

    // Wheel params
    const wr = 15 * scale;
    const bwx = -18 * scale, bwy = 18 * scale;
    const fwx = 22 * scale, fwy = 18 * scale;

    // Tires
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(bwx, bwy, wr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(fwx, fwy, wr, 0, Math.PI * 2); ctx.stroke();

    // Tire rim highlight
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bwx, bwy, wr - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(fwx, fwy, wr - 2, 0, Math.PI * 2); ctx.stroke();

    // Spokes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = pedalAngle + (i * Math.PI / 4);
      [{ x: bwx, y: bwy }, { x: fwx, y: fwy }].forEach(hub => {
        ctx.beginPath();
        ctx.moveTo(hub.x, hub.y);
        ctx.lineTo(hub.x + Math.cos(a) * (wr - 3), hub.y + Math.sin(a) * (wr - 3));
        ctx.stroke();
      });
    }

    // Hubs
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(bwx, bwy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fwx, fwy, 3, 0, Math.PI * 2); ctx.fill();

    // Frame
    const bbx = -2 * scale, bby = 8 * scale;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Seat tube
    ctx.beginPath(); ctx.moveTo(-10 * scale, -8 * scale); ctx.lineTo(bbx, bby); ctx.stroke();
    // Down tube
    ctx.beginPath(); ctx.moveTo(12 * scale, -12 * scale); ctx.lineTo(bbx - 2, bby + 4); ctx.stroke();
    // Top tube
    ctx.beginPath(); ctx.moveTo(-10 * scale, -8 * scale); ctx.lineTo(12 * scale, -12 * scale); ctx.stroke();
    // Chain stay
    ctx.beginPath(); ctx.moveTo(bbx, bby); ctx.lineTo(bwx, bwy); ctx.stroke();
    // Seat stay
    ctx.beginPath(); ctx.moveTo(-10 * scale, -8 * scale); ctx.lineTo(bwx, bwy); ctx.stroke();
    // Fork
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(12 * scale, -12 * scale); ctx.lineTo(fwx, fwy); ctx.stroke();

    // Handlebars
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12 * scale, -12 * scale);
    ctx.lineTo(16 * scale, -18 * scale);
    ctx.lineTo(20 * scale, -16 * scale);
    ctx.stroke();

    // Seat
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath();
    ctx.ellipse(-10 * scale, -10 * scale, 7, 2.5, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Cranks and pedals
    const crankLen = 10 * scale;
    const crankCX = bbx, crankCY = bby;
    const p1x = crankCX + Math.cos(pedalAngle) * crankLen;
    const p1y = crankCY + Math.sin(pedalAngle) * crankLen;
    const p2x = crankCX + Math.cos(pedalAngle + Math.PI) * crankLen;
    const p2y = crankCY + Math.sin(pedalAngle + Math.PI) * crankLen;

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(crankCX, crankCY); ctx.lineTo(p1x, p1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crankCX, crankCY); ctx.lineTo(p2x, p2y); ctx.stroke();

    // Pedals
    ctx.fillStyle = '#666';
    ctx.fillRect(p1x - 4, p1y - 1.5, 8, 3);
    ctx.fillRect(p2x - 4, p2y - 1.5, 8, 3);

    // ── Rider body ──
    const hipX = -6 * scale, hipY = -4 * scale;
    const shoulderX = 6 * scale, shoulderY = -24 * scale;

    // Legs (thigh + shin)
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 4;
    // Right leg
    const knee1X = (hipX + p1x) / 2 + 4, knee1Y = (hipY + p1y) / 2 - 4;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.quadraticCurveTo(knee1X, knee1Y, p1x, p1y); ctx.stroke();
    // Left leg
    const knee2X = (hipX + p2x) / 2 + 4, knee2Y = (hipY + p2y) / 2 - 4;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.quadraticCurveTo(knee2X, knee2Y, p2x, p2y); ctx.stroke();

    // Torso
    ctx.strokeStyle = jerseyColor;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shoulderX, shoulderY); ctx.stroke();
    // Jersey stripe
    ctx.strokeStyle = jerseyDark;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hipX + 1, hipY + 2); ctx.lineTo(shoulderX + 1, shoulderY + 2); ctx.stroke();

    // Arms
    ctx.strokeStyle = '#e8b87a';
    ctx.lineWidth = 3;
    const handX = 18 * scale, handY = -16 * scale;
    const elbowX = (shoulderX + handX) / 2 + 2, elbowY = shoulderY + 5;
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.quadraticCurveTo(elbowX, elbowY, handX, handY); ctx.stroke();

    // Head
    ctx.fillStyle = '#e8b87a';
    ctx.beginPath();
    ctx.arc(shoulderX + 1, shoulderY - 9, 7, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = jerseyColor;
    ctx.beginPath();
    ctx.ellipse(shoulderX + 2, shoulderY - 13, 9, 5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Helmet visor
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(shoulderX + 7, shoulderY - 10, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(shoulderX + 3, shoulderY - 10, 6, 2.5);
  }

  // ─── Road texture ───
  generateRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');

    // Asphalt
    const grad = ctx.createLinearGradient(0, 0, 0, 20);
    grad.addColorStop(0, '#6a6058');
    grad.addColorStop(0.3, '#7a7068');
    grad.addColorStop(0.7, '#7a7068');
    grad.addColorStop(1, '#5a5048');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 20);

    // Texture noise
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < 256; x += 2) {
      for (let y = 0; y < 20; y += 2) {
        if (Math.random() > 0.6) ctx.fillRect(x, y, 2, 2);
      }
    }

    // Center dashes
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = 0; x < 256; x += 30) {
      ctx.fillRect(x, 9, 14, 2);
    }

    // Edge lines
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 0, 256, 1);
    ctx.fillRect(0, 19, 256, 1);

    this.scene.textures.addCanvas('road_tile', canvas);
  }

  // ─── Particle textures ───
  generateParticleTextures() {
    // Soft glow
    ['glow_green', 'glow_yellow', 'glow_orange', 'glow_red'].forEach((key, i) => {
      const colors = ['0,200,100', '240,200,50', '240,140,40', '240,60,60'];
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${colors[i]},0.6)`);
      grad.addColorStop(0.4, `rgba(${colors[i]},0.2)`);
      grad.addColorStop(1, `rgba(${colors[i]},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      this.scene.textures.addCanvas(key, canvas);
    });

    // Leaf particle
    const leafCanvas = document.createElement('canvas');
    leafCanvas.width = 8;
    leafCanvas.height = 8;
    const lctx = leafCanvas.getContext('2d');
    lctx.fillStyle = '#6a9a40';
    lctx.beginPath();
    lctx.ellipse(4, 4, 3, 1.5, 0.5, 0, Math.PI * 2);
    lctx.fill();
    this.scene.textures.addCanvas('leaf', leafCanvas);

    // Snow particle
    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = 6;
    snowCanvas.height = 6;
    const sctx = snowCanvas.getContext('2d');
    const sg = sctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    sg.addColorStop(0, 'rgba(255,255,255,0.9)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 6, 6);
    this.scene.textures.addCanvas('snow_particle', snowCanvas);

    // Dust particle
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 4;
    dustCanvas.height = 4;
    const dctx = dustCanvas.getContext('2d');
    const dg = dctx.createRadialGradient(2, 2, 0, 2, 2, 2);
    dg.addColorStop(0, 'rgba(180,160,140,0.5)');
    dg.addColorStop(1, 'rgba(180,160,140,0)');
    dctx.fillStyle = dg;
    dctx.fillRect(0, 0, 4, 4);
    this.scene.textures.addCanvas('dust', dustCanvas);
  }

  // ─── Water texture ───
  generateWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 80);
    grad.addColorStop(0, 'rgba(40,100,140,0.6)');
    grad.addColorStop(0.3, 'rgba(60,130,170,0.5)');
    grad.addColorStop(0.7, 'rgba(80,150,190,0.4)');
    grad.addColorStop(1, 'rgba(100,170,210,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 80);

    // Wave highlights
    ctx.strokeStyle = 'rgba(200,230,255,0.2)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 5; row++) {
      ctx.beginPath();
      for (let x = 0; x < 256; x += 4) {
        const y = 10 + row * 15 + Math.sin(x * 0.05 + row * 2) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Sparkle highlights
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 80, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    this.scene.textures.addCanvas('water_tile', canvas);
  }

  // ─── Bushes ───
  generateBushTextures() {
    for (let i = 0; i < 3; i++) {
      const w = 25 + i * 10;
      const h = 18 + i * 6;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const colors = [
        { r: 60, g: 110, b: 45 },
        { r: 80, g: 130, b: 55 },
        { r: 50, g: 95, b: 40 },
      ];
      const c = colors[i];

      // Multiple overlapping circles
      for (let j = 0; j < 4; j++) {
        const bx = w * (0.2 + j * 0.2) + (Math.sin(j * 1.5) * w * 0.05);
        const by = h * 0.6;
        const br = h * (0.35 + Math.random() * 0.15);
        const grad = ctx.createRadialGradient(bx, by - br * 0.3, 0, bx, by, br);
        grad.addColorStop(0, `rgb(${c.r + 25},${c.g + 25},${c.b + 15})`);
        grad.addColorStop(1, `rgb(${c.r - 10},${c.g - 10},${c.b - 5})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      this.scene.textures.addCanvas(`bush_${i}`, canvas);
    }
  }

  // ─── Rocks ───
  generateRockTextures() {
    for (let i = 0; i < 3; i++) {
      const w = 20 + i * 12;
      const h = 15 + i * 8;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const grey = 100 + i * 20;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `rgb(${grey + 20},${grey + 15},${grey + 10})`);
      grad.addColorStop(1, `rgb(${grey - 15},${grey - 10},${grey - 5})`);
      ctx.fillStyle = grad;

      // Irregular rock shape
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h);
      ctx.lineTo(0, h * 0.5);
      ctx.lineTo(w * 0.15, h * 0.2);
      ctx.lineTo(w * 0.5, 0);
      ctx.lineTo(w * 0.8, h * 0.15);
      ctx.lineTo(w, h * 0.4);
      ctx.lineTo(w * 0.9, h);
      ctx.closePath();
      ctx.fill();

      // Light highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.2);
      ctx.lineTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h * 0.4);
      ctx.closePath();
      ctx.fill();

      this.scene.textures.addCanvas(`rock_${i}`, canvas);
    }
  }

  // ─── Sun ───
  generateSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
    grad.addColorStop(0, 'rgba(255,250,220,0.9)');
    grad.addColorStop(0.3, 'rgba(255,230,150,0.4)');
    grad.addColorStop(0.6, 'rgba(255,200,100,0.1)');
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 100, 100);
    this.scene.textures.addCanvas('sun', canvas);
  }

  // ─── Bird ───
  generateBirdTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(4, 0, 8, 4);
    ctx.quadraticCurveTo(12, 0, 16, 5);
    ctx.stroke();
    this.scene.textures.addCanvas('bird', canvas);
  }

  // ─── Km Marker ───
  generateKmMarkerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');

    // Post
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(13, 10, 4, 30);

    // Sign board
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(2, 0, 26, 16);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 1, 24, 14);

    this.scene.textures.addCanvas('km_marker', canvas);
  }
}
