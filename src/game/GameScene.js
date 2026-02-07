import { GAME_CONFIG } from './config';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.currentMetrics = {
      power: 0, cadence: 0, heart_rate: 0, speed: 0, distance: 0,
    };
    this.currentSegment = { name: 'Idle', type: 'recovery' };
    this.otherRiders = [];
    this.otherRiderSprites = {};
    this.worldPosition = 100;
    this.pedalAngle = 0;
    this.zoneLabel = null;
    this.particles = [];
  }

  create() {
    const { WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y } = GAME_CONFIG;

    // Sky gradient background
    this.skyGraphics = this.add.graphics();
    this.drawSky();

    // Parallax background layers
    this.bgLayer = this.add.graphics();
    this.midLayer = this.add.graphics();
    this.fgLayer = this.add.graphics();

    // Pre-generate terrain features
    this.generateTerrain();

    // Ground
    this.groundGraphics = this.add.graphics();

    // Cyclist avatar
    this.avatarContainer = this.add.container(400, GAME_CONFIG.AVATAR_Y);
    this.drawCyclist();

    // Glow effect for intervals
    this.glowGraphics = this.add.graphics();

    // Zone label
    this.zoneLabel = this.add.text(400, 30, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 12, y: 6 },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0.8);

    // Achievement popup container
    this.achievementText = this.add.text(400, 80, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 10, y: 5 },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0);

    // Power indicator bar
    this.powerBar = this.add.graphics().setScrollFactor(0);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Achievement tracking
    this.achievements = { first1km: false, first5km: false, first10km: false };

    // Distance markers
    this.distanceMarkers = this.add.graphics();

    this.drawScene();
  }

  generateTerrain() {
    // Generate tree positions
    this.trees = [];
    for (let x = 0; x < GAME_CONFIG.WORLD_WIDTH; x += 80 + Math.random() * 120) {
      const zone = this.getZone(x);
      if (zone && (zone.trees || zone.dense)) {
        const density = zone.dense ? 0.8 : 0.4;
        if (Math.random() < density) {
          this.trees.push({
            x,
            height: 40 + Math.random() * 60,
            width: 20 + Math.random() * 15,
            type: Math.random() > 0.3 ? 'pine' : 'birch',
            shade: Math.random() * 0.3,
          });
        }
      }
    }

    // Generate mountain peaks
    this.mountains = [];
    for (let x = 12000; x < 20000; x += 200 + Math.random() * 300) {
      this.mountains.push({
        x,
        height: 100 + Math.random() * 200,
        width: 150 + Math.random() * 200,
        snow: x > 16000,
      });
    }

    // Generate clouds
    this.clouds = [];
    for (let x = 0; x < GAME_CONFIG.WORLD_WIDTH; x += 300 + Math.random() * 500) {
      this.clouds.push({
        x,
        y: 30 + Math.random() * 80,
        width: 60 + Math.random() * 80,
        height: 20 + Math.random() * 15,
      });
    }

    // Lake reflections
    this.lakeWaves = [];
    for (let x = 8000; x < 12000; x += 30) {
      this.lakeWaves.push({
        x,
        offset: Math.random() * Math.PI * 2,
        amplitude: 1 + Math.random() * 2,
      });
    }

    // Generate distance kilometer markers
    this.kmMarkers = [];
    const pixelsPerKm = 500;
    for (let km = 1; km <= GAME_CONFIG.WORLD_WIDTH / pixelsPerKm; km++) {
      this.kmMarkers.push({ x: km * pixelsPerKm, km });
    }
  }

  getZone(x) {
    return GAME_CONFIG.ZONES.find(z => x >= z.start && x < z.end);
  }

  drawSky() {
    this.skyGraphics.clear();
    const width = this.cameras.main.width;
    const height = GAME_CONFIG.GROUND_Y;
    for (let y = 0; y < height; y++) {
      const ratio = y / height;
      const r = Math.floor(135 + ratio * 40);
      const g = Math.floor(206 - ratio * 30);
      const b = Math.floor(235 - ratio * 20);
      this.skyGraphics.lineStyle(1, Phaser.Display.Color.GetColor(r, g, b));
      this.skyGraphics.lineBetween(0, y, width, y);
    }
    this.skyGraphics.setScrollFactor(0);
  }

  drawCyclist() {
    this.cyclistGraphics = this.scene.scene.add.graphics();
    this.avatarContainer.add(this.cyclistGraphics);
    this.renderCyclist(0);
  }

  renderCyclist(pedalAngle) {
    const g = this.cyclistGraphics;
    g.clear();

    const power = this.currentMetrics.power;
    const hr = this.currentMetrics.heart_rate;

    // Determine rider color based on segment type
    let jerseyColor = 0x3b82f6; // blue default
    if (this.currentSegment.type === 'interval_on') jerseyColor = 0xef4444;
    else if (this.currentSegment.type === 'warmup') jerseyColor = 0xf59e0b;
    else if (this.currentSegment.type === 'recovery') jerseyColor = 0x10b981;

    // Wheel radius
    const wr = 14;
    // Back wheel center
    const bwx = -16, bwy = 20;
    // Front wheel center
    const fwx = 20, fwy = 20;

    // Wheels
    g.lineStyle(2, 0x333333);
    g.strokeCircle(bwx, bwy, wr);
    g.strokeCircle(fwx, fwy, wr);

    // Wheel spokes (rotating)
    for (let i = 0; i < 4; i++) {
      const angle = pedalAngle + (i * Math.PI / 2);
      g.lineStyle(1, 0x666666);
      g.lineBetween(
        bwx + Math.cos(angle) * wr, bwy + Math.sin(angle) * wr,
        bwx - Math.cos(angle) * wr, bwy - Math.sin(angle) * wr
      );
      g.lineBetween(
        fwx + Math.cos(angle) * wr, fwy + Math.sin(angle) * wr,
        fwx - Math.cos(angle) * wr, fwy - Math.sin(angle) * wr
      );
    }

    // Hub
    g.fillStyle(0x444444);
    g.fillCircle(bwx, bwy, 3);
    g.fillCircle(fwx, fwy, 3);

    // Frame
    g.lineStyle(3, 0x1a1a2e);
    // Seat tube
    g.lineBetween(-8, -8, bwx, bwy);
    // Top tube
    g.lineBetween(-8, -8, 10, -10);
    // Down tube
    g.lineBetween(10, -10, bwx + 4, bwy - 4);
    // Chain stay
    g.lineBetween(bwx, bwy, 4, 14);
    // Seat stay
    g.lineBetween(-8, -8, 4, 14);
    // Fork
    g.lineBetween(10, -10, fwx, fwy);

    // Handlebars
    g.lineStyle(2, 0x333333);
    g.lineBetween(10, -10, 14, -16);
    g.lineBetween(14, -16, 18, -14);

    // Seat
    g.fillStyle(0x2d2d2d);
    g.fillRect(-12, -11, 10, 3);

    // Pedals and cranks
    const crankLen = 8;
    const pedalX1 = 4 + Math.cos(pedalAngle) * crankLen;
    const pedalY1 = 14 + Math.sin(pedalAngle) * crankLen;
    const pedalX2 = 4 + Math.cos(pedalAngle + Math.PI) * crankLen;
    const pedalY2 = 14 + Math.sin(pedalAngle + Math.PI) * crankLen;

    g.lineStyle(2, 0x555555);
    g.lineBetween(4, 14, pedalX1, pedalY1);
    g.lineBetween(4, 14, pedalX2, pedalY2);
    g.fillStyle(0x777777);
    g.fillRect(pedalX1 - 3, pedalY1 - 1, 6, 2);
    g.fillRect(pedalX2 - 3, pedalY2 - 1, 6, 2);

    // Rider body
    // Legs
    g.lineStyle(3, 0x2563eb);
    g.lineBetween(-6, -2, pedalX1, pedalY1);
    g.lineBetween(-6, -2, pedalX2, pedalY2);

    // Torso
    g.lineStyle(4, jerseyColor);
    g.lineBetween(-6, -4, 4, -20);

    // Arms
    g.lineStyle(2, 0xfbbf24);
    g.lineBetween(4, -20, 14, -16);

    // Head
    g.fillStyle(0xfbbf24);
    g.fillCircle(4, -26, 6);

    // Helmet
    g.fillStyle(jerseyColor);
    g.fillEllipse(4, -29, 14, 7);

    // HR glow effect
    if (hr > 0) {
      let glowColor, glowAlpha;
      if (hr < 120) { glowColor = 0x48bb78; glowAlpha = 0.15; }
      else if (hr < 150) { glowColor = 0xecc94b; glowAlpha = 0.2; }
      else if (hr < 170) { glowColor = 0xed8936; glowAlpha = 0.25; }
      else { glowColor = 0xf56565; glowAlpha = 0.3; }

      g.fillStyle(glowColor, glowAlpha);
      g.fillCircle(0, -5, 35 + Math.sin(this.time.now / 500) * 3);
    }

    // Power burst particles during high power
    if (power > 200) {
      const particleCount = Math.min(Math.floor(power / 100), 5);
      for (let i = 0; i < particleCount; i++) {
        const px = -20 - Math.random() * 20;
        const py = 10 + Math.random() * 20 - 10;
        const size = 1 + Math.random() * 2;
        g.fillStyle(0xfbbf24, 0.3 + Math.random() * 0.3);
        g.fillCircle(px, py, size);
      }
    }
  }

  drawScene() {
    const cam = this.cameras.main;
    const scrollX = cam.scrollX;
    const viewWidth = cam.width;
    const viewLeft = scrollX - 200;
    const viewRight = scrollX + viewWidth + 200;

    // Draw background layer (mountains, far elements)
    this.bgLayer.clear();
    this.drawBackgroundMountains(viewLeft, viewRight, scrollX);
    this.drawClouds(viewLeft, viewRight, scrollX);

    // Draw mid layer (lake, mid-ground elements)
    this.midLayer.clear();
    this.drawLake(viewLeft, viewRight, scrollX);

    // Draw foreground (trees, ground)
    this.fgLayer.clear();
    this.drawTrees(viewLeft, viewRight);
    this.drawGround(viewLeft, viewRight);
    this.drawKmMarkers(viewLeft, viewRight);

    // Update zone label
    const zone = this.getZone(this.worldPosition);
    if (zone) {
      this.zoneLabel.setText(zone.name);
      this.zoneLabel.setX(cam.width / 2);
    }

    // Draw power bar
    this.drawPowerBar();

    // Draw other riders
    this.drawOtherRiders();
  }

  drawBackgroundMountains(viewLeft, viewRight, scrollX) {
    const g = this.bgLayer;
    g.setScrollFactor(GAME_CONFIG.PARALLAX_BG);

    this.mountains.forEach(m => {
      const mx = m.x * GAME_CONFIG.PARALLAX_BG;
      if (mx + m.width < viewLeft * GAME_CONFIG.PARALLAX_BG || mx - m.width > viewRight * GAME_CONFIG.PARALLAX_BG) return;

      // Mountain body
      g.fillStyle(m.snow ? 0x8899a6 : 0x5a6b7c, 0.7);
      g.fillTriangle(
        mx - m.width / 2, GAME_CONFIG.GROUND_Y,
        mx, GAME_CONFIG.GROUND_Y - m.height,
        mx + m.width / 2, GAME_CONFIG.GROUND_Y
      );

      // Snow cap
      if (m.snow || m.height > 150) {
        g.fillStyle(0xe2e8f0, 0.8);
        const snowH = m.height * 0.3;
        const snowW = m.width * 0.3;
        g.fillTriangle(
          mx - snowW / 2, GAME_CONFIG.GROUND_Y - m.height + snowH,
          mx, GAME_CONFIG.GROUND_Y - m.height,
          mx + snowW / 2, GAME_CONFIG.GROUND_Y - m.height + snowH
        );
      }
    });
  }

  drawClouds(viewLeft, viewRight, scrollX) {
    const g = this.bgLayer;
    const time = this.time.now / 10000;

    this.clouds.forEach(c => {
      const cx = c.x * 0.2 + time * 20;
      if (cx + c.width < viewLeft * 0.2 || cx - c.width > viewRight * 0.2) return;

      g.fillStyle(0xffffff, 0.6);
      g.fillEllipse(cx, c.y, c.width, c.height);
      g.fillEllipse(cx - c.width * 0.3, c.y + 5, c.width * 0.6, c.height * 0.8);
      g.fillEllipse(cx + c.width * 0.3, c.y + 3, c.width * 0.5, c.height * 0.7);
    });
  }

  drawLake(viewLeft, viewRight) {
    const g = this.midLayer;
    const time = this.time.now / 1000;

    // Lake water
    const lakeStart = 8000;
    const lakeEnd = 12000;
    if (viewRight > lakeStart && viewLeft < lakeEnd) {
      const drawStart = Math.max(viewLeft, lakeStart);
      const drawEnd = Math.min(viewRight, lakeEnd);

      // Main water body
      g.fillStyle(0x1a6b8a, 0.5);
      g.fillRect(drawStart, GAME_CONFIG.GROUND_Y - 30, drawEnd - drawStart, 40);

      // Wave effects
      this.lakeWaves.forEach(w => {
        if (w.x < drawStart || w.x > drawEnd) return;
        const wy = GAME_CONFIG.GROUND_Y - 30 + Math.sin(time + w.offset) * w.amplitude;
        g.fillStyle(0x87ceeb, 0.3);
        g.fillEllipse(w.x, wy, 20, 3);
      });
    }
  }

  drawTrees(viewLeft, viewRight) {
    const g = this.fgLayer;

    this.trees.forEach(t => {
      if (t.x < viewLeft || t.x > viewRight) return;

      const baseY = GAME_CONFIG.GROUND_Y;

      if (t.type === 'pine') {
        // Trunk
        g.fillStyle(0x5c3d2e);
        g.fillRect(t.x - 2, baseY - t.height * 0.4, 4, t.height * 0.4);

        // Foliage layers
        const green = Phaser.Display.Color.ValueToColor(0x2d5016);
        const shade = t.shade;
        const r = Math.max(0, green.red - shade * 50);
        const gr = Math.max(0, green.green - shade * 50);
        const b = Math.max(0, green.blue - shade * 20);
        const color = Phaser.Display.Color.GetColor(r, gr, b);

        for (let i = 0; i < 3; i++) {
          const layerW = t.width * (1 - i * 0.25);
          const layerH = t.height * 0.3;
          const layerY = baseY - t.height * 0.4 - i * layerH * 0.7;
          g.fillStyle(color, 0.9 - i * 0.1);
          g.fillTriangle(
            t.x - layerW / 2, layerY,
            t.x, layerY - layerH,
            t.x + layerW / 2, layerY
          );
        }
      } else {
        // Birch tree
        g.fillStyle(0xe8e0d0);
        g.fillRect(t.x - 2, baseY - t.height * 0.5, 4, t.height * 0.5);
        // Birch marks
        g.fillStyle(0x333333, 0.3);
        for (let i = 0; i < 4; i++) {
          g.fillRect(t.x - 1, baseY - t.height * 0.1 * (i + 1), 3, 2);
        }
        // Canopy
        g.fillStyle(0x6ba34a, 0.8);
        g.fillCircle(t.x, baseY - t.height * 0.5 - 15, t.width * 0.6);
        g.fillStyle(0x82b85a, 0.6);
        g.fillCircle(t.x - 8, baseY - t.height * 0.5 - 10, t.width * 0.4);
        g.fillCircle(t.x + 8, baseY - t.height * 0.5 - 8, t.width * 0.35);
      }
    });
  }

  drawGround(viewLeft, viewRight) {
    const g = this.fgLayer;
    const y = GAME_CONFIG.GROUND_Y;

    // Draw ground in segments by zone
    GAME_CONFIG.ZONES.forEach(zone => {
      if (zone.end < viewLeft || zone.start > viewRight) return;
      const start = Math.max(viewLeft, zone.start);
      const end = Math.min(viewRight, zone.end);

      const groundColor = Phaser.Display.Color.ValueToColor(zone.ground);
      g.fillStyle(groundColor.color);
      g.fillRect(start, y, end - start, 130);

      // Path/road
      g.fillStyle(0x8b7355, 0.8);
      g.fillRect(start, y, end - start, 6);
      // Road marking
      for (let rx = start; rx < end; rx += 40) {
        g.fillStyle(0xffffff, 0.3);
        g.fillRect(rx, y + 2, 15, 2);
      }

      // Grass tufts
      g.fillStyle(0x4a7c59, 0.4);
      for (let gx = start; gx < end; gx += 15 + Math.random() * 10) {
        const gh = 3 + Math.random() * 5;
        g.fillTriangle(gx, y + 8, gx + 2, y + 8 - gh, gx + 4, y + 8);
      }

      // Snow on ground for summit zone
      if (zone.snow) {
        g.fillStyle(0xe2e8f0, 0.4);
        for (let sx = start; sx < end; sx += 20 + Math.random() * 30) {
          g.fillEllipse(sx, y + 4, 15 + Math.random() * 10, 4);
        }
      }
    });
  }

  drawKmMarkers(viewLeft, viewRight) {
    const g = this.fgLayer;
    this.kmMarkers.forEach(m => {
      if (m.x < viewLeft || m.x > viewRight) return;
      // Post
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(m.x - 1, GAME_CONFIG.GROUND_Y - 20, 2, 20);
      // Sign
      g.fillStyle(0x2563eb, 0.8);
      g.fillRect(m.x - 12, GAME_CONFIG.GROUND_Y - 28, 24, 12);
    });
  }

  drawPowerBar() {
    const g = this.powerBar;
    g.clear();
    const power = this.currentMetrics.power;
    const target = this.currentMetrics.power_target || 200;
    const maxPower = Math.max(target * 1.5, 400);
    const barWidth = 200;
    const barHeight = 8;
    const x = this.cameras.main.width / 2 - barWidth / 2;
    const y = this.cameras.main.height - 30;

    // Background
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 4);

    // Power fill
    const fillWidth = Math.min(power / maxPower, 1) * barWidth;
    let color = 0x48bb78;
    if (power > target * 1.1) color = 0xf56565;
    else if (power > target * 0.9) color = 0xecc94b;
    g.fillStyle(color, 0.8);
    g.fillRoundedRect(x, y, fillWidth, barHeight, 3);

    // Target marker
    if (target > 0) {
      const targetX = x + (target / maxPower) * barWidth;
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(targetX - 1, y - 3, 2, barHeight + 6);
    }
  }

  drawOtherRiders() {
    // Clean up sprites for riders that disconnected
    Object.keys(this.otherRiderSprites).forEach(id => {
      if (!this.otherRiders.find(r => r.user_id === id)) {
        this.otherRiderSprites[id].destroy();
        delete this.otherRiderSprites[id];
      }
    });

    // Draw/update other riders
    this.otherRiders.forEach(rider => {
      if (!this.otherRiderSprites[rider.user_id]) {
        const container = this.add.container(rider.position || 100, GAME_CONFIG.AVATAR_Y);
        const g = this.add.graphics();

        // Simplified ghost rider
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(0, -26, 6); // head
        g.lineStyle(3, 0xffffff, 0.3);
        g.lineBetween(-6, -4, 4, -20); // body
        g.strokeCircle(-16, 20, 12); // back wheel
        g.strokeCircle(20, 20, 12); // front wheel

        // Name label
        const nameText = this.add.text(0, -45, rider.username || 'Rider', {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5);

        container.add([g, nameText]);
        this.otherRiderSprites[rider.user_id] = container;
      }

      // Update position
      const sprite = this.otherRiderSprites[rider.user_id];
      if (rider.position !== undefined) {
        sprite.x = Phaser.Math.Linear(sprite.x, rider.position, 0.1);
      }
    });
  }

  update(time, delta) {
    const { power, cadence, speed } = this.currentMetrics;

    // Calculate movement speed based on power
    const speedFactor = power > 0
      ? GAME_CONFIG.AVATAR_BASE_SPEED + power * GAME_CONFIG.POWER_SPEED_FACTOR
      : 0;

    const clampedSpeed = Math.min(speedFactor, GAME_CONFIG.AVATAR_MAX_SPEED);

    // Move world position
    if (clampedSpeed > 0) {
      this.worldPosition += clampedSpeed;
      if (this.worldPosition > GAME_CONFIG.WORLD_WIDTH - 200) {
        this.worldPosition = GAME_CONFIG.WORLD_WIDTH - 200;
      }
    }

    // Update pedal animation based on cadence
    if (cadence > 0) {
      this.pedalAngle += (cadence / 60) * (delta / 1000) * Math.PI * 2;
    }
    this.renderCyclist(this.pedalAngle);

    // Position avatar and camera
    this.avatarContainer.x = this.worldPosition;
    this.cameras.main.scrollX = this.worldPosition - 400;

    // Redraw scene elements
    this.drawScene();

    // Check achievements
    this.checkAchievements();
  }

  checkAchievements() {
    const dist = this.currentMetrics.distance;
    if (!this.achievements.first1km && dist >= 1) {
      this.achievements.first1km = true;
      this.showAchievement('First 1 km!');
    } else if (!this.achievements.first5km && dist >= 5) {
      this.achievements.first5km = true;
      this.showAchievement('5 km milestone!');
    } else if (!this.achievements.first10km && dist >= 10) {
      this.achievements.first10km = true;
      this.showAchievement('10 km champion!');
    }
  }

  showAchievement(text) {
    this.achievementText.setText(`★ ${text}`);
    this.achievementText.setAlpha(1);
    this.tweens.add({
      targets: this.achievementText,
      alpha: 0,
      duration: 3000,
      delay: 2000,
      ease: 'Power2',
    });
  }

  updateMetrics(metrics, segment) {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    if (segment) this.currentSegment = segment;
  }

  updateOtherRiders(riders) {
    this.otherRiders = riders;
  }
}
