import { GAME_CONFIG } from './config';
import TextureGenerator from './TextureGenerator';

/**
 * Seeded random for deterministic terrain generation.
 */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.currentMetrics = {
      power: 0, power_target: 0, cadence: 0, heart_rate: 0, speed: 0, distance: 0,
    };
    this.currentSegment = { name: 'Idle', type: 'recovery' };
    this.otherRiders = [];
    this.otherRiderSprites = {};
    this.worldPosition = 200;
    this.pedalAngle = 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  create() {
    const rand = seededRandom(GAME_CONFIG.SEED);
    this.rand = rand;

    // Generate all textures
    const texGen = new TextureGenerator(this);
    texGen.generateAll();

    // ── LAYER 0: Sky background (fixed, per-zone) ──
    this.skyImages = [];
    GAME_CONFIG.ZONES.forEach((_, i) => {
      const img = this.add.tileSprite(0, 0, this.cameras.main.width, GAME_CONFIG.HORIZON_Y + 80, `sky_${i}`)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setVisible(false);
      this.skyImages.push(img);
    });
    this.currentSkyIndex = 0;
    this.skyImages[0].setVisible(true);

    // Sun
    this.sun = this.add.image(this.cameras.main.width * 0.8, 60, 'sun')
      .setScrollFactor(0)
      .setScale(1.5)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    // ── LAYER 1: Far mountains (very slow parallax) ──
    this.farMountains = [];
    this._placeFarMountains(rand);

    // ── LAYER 2: Clouds ──
    this.cloudSprites = [];
    this._placeClouds(rand);

    // ── LAYER 3: Mid hills (medium parallax) ──
    this.midHills = [];
    this._placeMidHills(rand);

    // ── LAYER 4: Birds (animated) ──
    this.birds = [];
    this._placeBirds(rand);

    // ── LAYER 5: Lake water (specific zone) ──
    this.waterTiles = [];
    this._placeWater();

    // ── LAYER 6: Background trees (behind road) ──
    this.bgTrees = [];
    this._placeBackgroundTrees(rand);

    // ── LAYER 7: Houses (Village zone) ──
    this.houses = [];
    this._placeHouses(rand);

    // ── LAYER 8: Road ──
    this.roadTile = this.add.tileSprite(0, GAME_CONFIG.ROAD_Y, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.ROAD_HEIGHT + 6, 'road_tile')
      .setOrigin(0, 0);

    // Road shoulder/edges
    this.roadEdgeGraphics = this.add.graphics();
    this._drawRoadEdges();

    // ── LAYER 9: Ground below road ──
    this.groundGraphics = this.add.graphics();
    this._drawGroundStrip();

    // ── LAYER 10: Foreground elements (bushes, rocks, flowers) ──
    this.fgElements = [];
    this._placeForegroundElements(rand);

    // ── LAYER 11: Km markers ──
    this.kmMarkers = [];
    this._placeKmMarkers();

    // ── LAYER 12: Cyclist avatar ──
    this.cyclistJersey = 'blue';
    this.cyclistSprite = this.add.image(this.worldPosition, GAME_CONFIG.ROAD_Y - 8, 'cyclist_blue_0')
      .setOrigin(0.5, 1)
      .setScale(GAME_CONFIG.CYCLIST_SCALE);

    // HR glow underneath cyclist
    this.hrGlow = this.add.image(this.worldPosition, GAME_CONFIG.ROAD_Y - 30, 'glow_green')
      .setOrigin(0.5, 0.5)
      .setScale(1.5)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // ── LAYER 13: Foreground trees (in front of road) ──
    this.fgTrees = [];
    this._placeForegroundTrees(rand);

    // ── LAYER 14: Atmospheric particles ──
    this.atmosParticles = [];
    this._createAtmosphericParticles();

    // ── LAYER 15: UI overlays ──
    this.zoneLabel = this.add.text(this.cameras.main.width / 2, 20, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: { x: 16, y: 6 },
      shadow: { offsetX: 0, offsetY: 1, color: 'rgba(0,0,0,0.3)', blur: 4, fill: true },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0.9);

    this.achievementText = this.add.text(this.cameras.main.width / 2, 52, '', {
      fontSize: '13px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 12, y: 5 },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0);

    this.powerBarGfx = this.add.graphics().setScrollFactor(0);

    // Camera
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);

    // Achievement tracking
    this.achievements = { first1km: false, first5km: false, first10km: false };

    // Dust trail behind cyclist
    this.dustParticles = [];
  }

  // ─────────────────────────────────────────────────
  // TERRAIN PLACEMENT
  // ─────────────────────────────────────────────────

  _placeFarMountains(rand) {
    for (let x = -200; x < GAME_CONFIG.WORLD_WIDTH + 400; x += 250 + rand() * 300) {
      const variant = Math.floor(rand() * 3);
      const sprite = this.add.image(x, GAME_CONFIG.HORIZON_Y + 20, `mountain_${variant}`)
        .setOrigin(0.5, 1)
        .setScrollFactor(GAME_CONFIG.PARALLAX_FAR)
        .setAlpha(0.5 + rand() * 0.3)
        .setScale(0.8 + rand() * 0.6);
      this.farMountains.push(sprite);
    }
  }

  _placeClouds(rand) {
    for (let x = -100; x < GAME_CONFIG.WORLD_WIDTH; x += 200 + rand() * 600) {
      const variant = Math.floor(rand() * 4);
      const sprite = this.add.image(x, 30 + rand() * 120, `cloud_${variant}`)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0.05 + rand() * 0.1)
        .setAlpha(0.4 + rand() * 0.4)
        .setScale(0.6 + rand() * 1.0);
      sprite.driftSpeed = 3 + rand() * 8;
      this.cloudSprites.push(sprite);
    }
  }

  _placeMidHills(rand) {
    for (let x = -200; x < GAME_CONFIG.WORLD_WIDTH + 200; x += 150 + rand() * 250) {
      const variant = Math.floor(rand() * 4);
      const sprite = this.add.image(x, GAME_CONFIG.ROAD_Y + 5, `hill_${variant}`)
        .setOrigin(0.5, 1)
        .setScrollFactor(GAME_CONFIG.PARALLAX_MID)
        .setAlpha(0.6 + rand() * 0.3)
        .setScale(0.7 + rand() * 0.5);
      this.midHills.push(sprite);
    }
  }

  _placeBirds(rand) {
    for (let i = 0; i < 12; i++) {
      const bird = this.add.image(rand() * GAME_CONFIG.WORLD_WIDTH, 40 + rand() * 200, 'bird')
        .setScrollFactor(0.2 + rand() * 0.3)
        .setAlpha(0.5 + rand() * 0.3)
        .setScale(0.8 + rand() * 0.4);
      bird.baseY = bird.y;
      bird.speed = 15 + rand() * 25;
      bird.phase = rand() * Math.PI * 2;
      bird.flapSpeed = 2 + rand() * 3;
      this.birds.push(bird);
    }
  }

  _placeWater() {
    const lakeStart = 8500;
    const lakeEnd = 11500;
    for (let x = lakeStart; x < lakeEnd; x += 256) {
      const tile = this.add.tileSprite(x, GAME_CONFIG.ROAD_Y - 25, Math.min(256, lakeEnd - x), 80, 'water_tile')
        .setOrigin(0, 0)
        .setAlpha(0.7);
      tile.startX = x;
      this.waterTiles.push(tile);
    }
  }

  _placeBackgroundTrees(rand) {
    const treeTypes = {
      'Coastal Village': ['tree_oak_1', 'tree_birch_1', 'tree_birch_2'],
      'Birch Forest': ['tree_birch_1', 'tree_birch_2', 'tree_pine_1', 'tree_pine_2'],
      'Lake District': ['tree_pine_1', 'tree_birch_1', 'tree_oak_1'],
      'Mountain Pass': ['tree_pine_2', 'tree_pine_3', 'tree_dead_1'],
      'Snow Summit': ['tree_snow_1', 'tree_dead_1', 'tree_pine_3'],
    };

    GAME_CONFIG.ZONES.forEach(zone => {
      const types = treeTypes[zone.name] || ['tree_pine_1'];
      const density = zone.name === 'Birch Forest' ? 60 : zone.name === 'Snow Summit' ? 200 : 100;

      for (let x = zone.start + rand() * 50; x < zone.end; x += density + rand() * density) {
        const type = types[Math.floor(rand() * types.length)];
        // Place behind road (further back = smaller + higher up + slower scroll)
        const depth = rand(); // 0 = far, 1 = near road
        const y = GAME_CONFIG.ROAD_Y - 5 - (1 - depth) * 60;
        const scale = 0.6 + depth * 0.8;
        const scrollFactor = GAME_CONFIG.PARALLAX_NEAR + (1 - depth) * (GAME_CONFIG.PARALLAX_MID - GAME_CONFIG.PARALLAX_NEAR);

        const sprite = this.add.image(x, y, type)
          .setOrigin(0.5, 1)
          .setScale(scale)
          .setScrollFactor(Math.min(scrollFactor + 0.15, 1))
          .setAlpha(0.7 + depth * 0.3);

        // Slight tint variation
        if (rand() > 0.7) {
          sprite.setTint(
            Phaser.Display.Color.GetColor(
              200 + Math.floor(rand() * 55),
              200 + Math.floor(rand() * 55),
              200 + Math.floor(rand() * 55)
            )
          );
        }

        this.bgTrees.push(sprite);
      }
    });
  }

  _placeHouses(rand) {
    const villageStart = 200;
    const villageEnd = 3800;
    for (let x = villageStart + rand() * 200; x < villageEnd; x += 250 + rand() * 400) {
      const variant = Math.floor(rand() * 4);
      const sprite = this.add.image(x, GAME_CONFIG.ROAD_Y - 8, `house_${variant}`)
        .setOrigin(0.5, 1)
        .setScale(1.2 + rand() * 0.4);
      this.houses.push(sprite);
    }
  }

  _drawRoadEdges() {
    const g = this.roadEdgeGraphics;
    const y = GAME_CONFIG.ROAD_Y;
    const h = GAME_CONFIG.ROAD_HEIGHT + 6;

    // Dirt shoulders
    g.fillStyle(0x8a7a6a, 0.6);
    g.fillRect(0, y - 3, GAME_CONFIG.WORLD_WIDTH, 3);
    g.fillRect(0, y + h, GAME_CONFIG.WORLD_WIDTH, 4);

    // Grass edge on top
    g.fillStyle(0x5a8a4a, 0.5);
    g.fillRect(0, y - 5, GAME_CONFIG.WORLD_WIDTH, 3);
  }

  _drawGroundStrip() {
    const g = this.groundGraphics;
    const y = GAME_CONFIG.GROUND_TOP;
    const height = GAME_CONFIG.WORLD_HEIGHT - y;

    GAME_CONFIG.ZONES.forEach(zone => {
      const [tr, tg, tb] = zone.groundTop;
      const [br, bg, bb] = zone.groundBot;

      // Draw gradient manually in strips
      const strips = 20;
      for (let i = 0; i < strips; i++) {
        const frac = i / strips;
        const r = Math.floor(tr + (br - tr) * frac);
        const gv = Math.floor(tg + (bg - tg) * frac);
        const b = Math.floor(tb + (bb - tb) * frac);
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(zone.start, y + (height / strips) * i, zone.end - zone.start, height / strips + 1);
      }
    });
  }

  _placeForegroundElements(rand) {
    GAME_CONFIG.ZONES.forEach(zone => {
      for (let x = zone.start + rand() * 30; x < zone.end; x += 40 + rand() * 80) {
        const type = rand();
        let key, y, scale;

        if (type < 0.4) {
          // Bush
          key = `bush_${Math.floor(rand() * 3)}`;
          y = GAME_CONFIG.GROUND_TOP + 2 + rand() * 15;
          scale = 0.7 + rand() * 0.6;
        } else if (type < 0.65) {
          // Rock
          key = `rock_${Math.floor(rand() * 3)}`;
          y = GAME_CONFIG.GROUND_TOP + 5 + rand() * 10;
          scale = 0.6 + rand() * 0.8;
        } else {
          continue; // Empty space
        }

        const sprite = this.add.image(x, y, key)
          .setOrigin(0.5, 0)
          .setScale(scale)
          .setAlpha(0.8 + rand() * 0.2);
        this.fgElements.push(sprite);
      }
    });
  }

  _placeKmMarkers() {
    const pixelsPerKm = 500;
    for (let km = 1; km <= GAME_CONFIG.WORLD_WIDTH / pixelsPerKm; km++) {
      const x = km * pixelsPerKm;
      const marker = this.add.image(x, GAME_CONFIG.ROAD_Y - 2, 'km_marker')
        .setOrigin(0.5, 1)
        .setScale(1.0);

      // Km number text
      this.add.text(x, GAME_CONFIG.ROAD_Y - 28, `${km}`, {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      this.kmMarkers.push(marker);
    }
  }

  _placeForegroundTrees(rand) {
    // Sparse trees in front of the road for depth
    GAME_CONFIG.ZONES.forEach(zone => {
      if (zone.name === 'Lake District') return; // Keep lake area open

      for (let x = zone.start + rand() * 300; x < zone.end; x += 400 + rand() * 600) {
        if (rand() > 0.3) continue;
        const types = zone.name.includes('Snow') ? ['tree_snow_1'] :
          zone.name.includes('Forest') ? ['tree_pine_1', 'tree_birch_1'] :
            ['tree_oak_1', 'tree_pine_2'];
        const type = types[Math.floor(rand() * types.length)];

        const sprite = this.add.image(x, GAME_CONFIG.GROUND_TOP + 20, type)
          .setOrigin(0.5, 1)
          .setScale(1.4 + rand() * 0.6)
          .setAlpha(0.6)
          .setDepth(100);
        this.fgTrees.push(sprite);
      }
    });
  }

  _createAtmosphericParticles() {
    // We'll manage these manually in update() since they're zone-dependent
    this.maxParticles = 40;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.add.image(0, 0, 'leaf')
        .setAlpha(0)
        .setScrollFactor(1)
        .setScale(0.5);
      p.active = false;
      p.velX = 0;
      p.velY = 0;
      p.life = 0;
      this.atmosParticles.push(p);
    }
  }

  // ─────────────────────────────────────────────────
  // UPDATE LOOP
  // ─────────────────────────────────────────────────

  update(time, delta) {
    const { power, cadence, speed } = this.currentMetrics;
    const dt = delta / 1000;

    // ── Movement ──
    const speedFactor = power > 0
      ? GAME_CONFIG.AVATAR_BASE_SPEED + power * GAME_CONFIG.POWER_SPEED_FACTOR
      : 0;
    const clampedSpeed = Math.min(speedFactor, GAME_CONFIG.AVATAR_MAX_SPEED);

    if (clampedSpeed > 0) {
      this.worldPosition += clampedSpeed;
      if (this.worldPosition > GAME_CONFIG.WORLD_WIDTH - 200) {
        this.worldPosition = GAME_CONFIG.WORLD_WIDTH - 200;
      }
    }

    // ── Pedal animation ──
    if (cadence > 0) {
      this.pedalAngle += (cadence / 60) * dt * Math.PI * 2;
      this.frameTimer += dt;
      const frameDuration = 60 / Math.max(cadence, 30) / 8;
      if (this.frameTimer >= frameDuration) {
        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % 8;
      }
    }

    // ── Jersey color based on segment ──
    const jerseyMap = {
      interval_on: 'red',
      warmup: 'yellow',
      recovery: 'green',
    };
    const targetJersey = jerseyMap[this.currentSegment.type] || 'blue';
    if (targetJersey !== this.cyclistJersey) {
      this.cyclistJersey = targetJersey;
    }

    // Update cyclist sprite
    this.cyclistSprite.setTexture(`cyclist_${this.cyclistJersey}_${this.frameIndex}`);
    this.cyclistSprite.x = this.worldPosition;

    // ── HR Glow ──
    const hr = this.currentMetrics.heart_rate;
    if (hr > 0) {
      let glowTexture = 'glow_green';
      let glowAlpha = 0.3;
      if (hr >= 170) { glowTexture = 'glow_red'; glowAlpha = 0.6; }
      else if (hr >= 150) { glowTexture = 'glow_orange'; glowAlpha = 0.5; }
      else if (hr >= 120) { glowTexture = 'glow_yellow'; glowAlpha = 0.4; }
      this.hrGlow.setTexture(glowTexture);
      this.hrGlow.setAlpha(glowAlpha + Math.sin(time / 400) * 0.1);
      this.hrGlow.x = this.worldPosition;
      this.hrGlow.y = GAME_CONFIG.ROAD_Y - 35;
      this.hrGlow.setScale(1.2 + Math.sin(time / 600) * 0.15);
    } else {
      this.hrGlow.setAlpha(0);
    }

    // ── Camera ──
    const targetCamX = this.worldPosition - this.cameras.main.width * 0.35;
    this.cameras.main.scrollX += (targetCamX - this.cameras.main.scrollX) * 0.08;

    // ── Sky zone transitions ──
    const zone = this.getZone(this.worldPosition);
    if (zone) {
      const zoneIndex = GAME_CONFIG.ZONES.indexOf(zone);
      if (zoneIndex !== this.currentSkyIndex) {
        this.skyImages[this.currentSkyIndex].setVisible(false);
        this.skyImages[zoneIndex].setVisible(true);
        this.currentSkyIndex = zoneIndex;
      }
      this.zoneLabel.setText(zone.name);
    }

    // ── Animated clouds ──
    this.cloudSprites.forEach(c => {
      c.x += c.driftSpeed * dt;
    });

    // ── Animated birds ──
    this.birds.forEach(b => {
      b.x += b.speed * dt;
      b.y = b.baseY + Math.sin(time / 1000 * b.flapSpeed + b.phase) * 8;
      b.setScale(0.8 + Math.sin(time / 300 * b.flapSpeed + b.phase) * 0.2, 0.8);
      if (b.x > GAME_CONFIG.WORLD_WIDTH + 100) b.x = -100;
    });

    // ── Animated water ──
    this.waterTiles.forEach(tile => {
      tile.tilePositionX = time / 50;
      tile.tilePositionY = Math.sin(time / 1000) * 2;
    });

    // ── Atmospheric particles ──
    this._updateParticles(time, dt);

    // ── Dust trail ──
    if (clampedSpeed > 2) {
      this._spawnDust();
    }

    // ── Power bar ──
    this._drawPowerBar();

    // ── Other riders ──
    this._updateOtherRiders();

    // ── Achievements ──
    this._checkAchievements();
  }

  _updateParticles(time, dt) {
    const zone = this.getZone(this.worldPosition);
    if (!zone) return;

    const cam = this.cameras.main;
    const isSnow = zone.name === 'Snow Summit';
    const isForest = zone.name === 'Birch Forest';

    // Spawn new particles
    this.atmosParticles.forEach(p => {
      if (!p.active && Math.random() < 0.03) {
        p.active = true;
        p.x = cam.scrollX + Math.random() * cam.width;
        p.y = -10 + Math.random() * 50;
        p.velX = -20 + Math.random() * 10;
        p.velY = 20 + Math.random() * 30;
        p.life = 3 + Math.random() * 4;
        p.setAlpha(0.3 + Math.random() * 0.4);
        p.setScale(0.4 + Math.random() * 0.5);

        if (isSnow) {
          p.setTexture('snow_particle');
          p.velY = 10 + Math.random() * 15;
          p.velX = -5 + Math.random() * 10;
        } else if (isForest) {
          p.setTexture('leaf');
          p.velY = 15 + Math.random() * 20;
          p.setScale(0.6 + Math.random() * 0.4);
        } else {
          p.setTexture('dust');
          p.velY = 5 + Math.random() * 10;
        }
      }

      if (p.active) {
        p.x += p.velX * dt;
        p.y += p.velY * dt;
        p.life -= dt;

        // Gentle sway
        p.x += Math.sin(time / 500 + p.x * 0.01) * 0.5;

        if (p.life <= 0 || p.y > GAME_CONFIG.WORLD_HEIGHT) {
          p.active = false;
          p.setAlpha(0);
        }
      }
    });
  }

  _spawnDust() {
    const inactive = this.atmosParticles.find(p => !p.active);
    if (inactive && Math.random() < 0.3) {
      inactive.active = true;
      inactive.setTexture('dust');
      inactive.x = this.worldPosition - 25 + Math.random() * 10;
      inactive.y = GAME_CONFIG.ROAD_Y + Math.random() * 5;
      inactive.velX = -30 - Math.random() * 20;
      inactive.velY = -5 - Math.random() * 10;
      inactive.life = 0.5 + Math.random() * 0.5;
      inactive.setAlpha(0.2 + Math.random() * 0.15);
      inactive.setScale(0.5 + Math.random() * 0.5);
    }
  }

  _drawPowerBar() {
    const g = this.powerBarGfx;
    g.clear();

    const power = this.currentMetrics.power;
    const target = this.currentMetrics.power_target || 200;
    if (power <= 0 && target <= 0) return;

    const maxPower = Math.max(target * 1.5, 400);
    const barWidth = 220;
    const barHeight = 6;
    const x = this.cameras.main.width / 2 - barWidth / 2;
    const y = this.cameras.main.height - 25;

    // Background
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x - 1, y - 1, barWidth + 2, barHeight + 2, 3);

    // Power fill
    const fillWidth = Math.min(power / maxPower, 1) * barWidth;
    let color = 0x48bb78;
    if (power > target * 1.1) color = 0xef4444;
    else if (power > target * 0.9) color = 0xecc94b;
    g.fillStyle(color, 0.7);
    g.fillRoundedRect(x, y, Math.max(fillWidth, 2), barHeight, 2);

    // Target line
    if (target > 0) {
      const targetX = x + (target / maxPower) * barWidth;
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(targetX - 0.5, y - 2, 1, barHeight + 4);
    }
  }

  _updateOtherRiders() {
    // Clean up disconnected riders
    Object.keys(this.otherRiderSprites).forEach(id => {
      if (!this.otherRiders.find(r => r.user_id === id)) {
        this.otherRiderSprites[id].sprite.destroy();
        this.otherRiderSprites[id].label.destroy();
        delete this.otherRiderSprites[id];
      }
    });

    // Update/create other rider sprites
    this.otherRiders.forEach(rider => {
      if (!this.otherRiderSprites[rider.user_id]) {
        const sprite = this.add.image(rider.position || 100, GAME_CONFIG.ROAD_Y - 8, 'cyclist_ghost_0')
          .setOrigin(0.5, 1)
          .setScale(GAME_CONFIG.CYCLIST_SCALE);

        const label = this.add.text(rider.position || 100, GAME_CONFIG.ROAD_Y - 80, rider.username || 'Rider', {
          fontSize: '9px',
          fontFamily: 'monospace',
          color: '#aabbff',
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5);

        this.otherRiderSprites[rider.user_id] = { sprite, label };
      }

      const rs = this.otherRiderSprites[rider.user_id];
      if (rider.position !== undefined) {
        const targetX = rider.position;
        rs.sprite.x = Phaser.Math.Linear(rs.sprite.x, targetX, 0.08);
        rs.label.x = rs.sprite.x;
      }
    });
  }

  _checkAchievements() {
    const dist = this.currentMetrics.distance;
    if (!this.achievements.first1km && dist >= 1) {
      this.achievements.first1km = true;
      this._showAchievement('First 1 km!');
    } else if (!this.achievements.first5km && dist >= 5) {
      this.achievements.first5km = true;
      this._showAchievement('5 km milestone!');
    } else if (!this.achievements.first10km && dist >= 10) {
      this.achievements.first10km = true;
      this._showAchievement('10 km champion!');
    }
  }

  _showAchievement(text) {
    this.achievementText.setText(`\u2605 ${text}`);
    this.achievementText.setAlpha(1);
    this.tweens.add({
      targets: this.achievementText,
      alpha: 0,
      duration: 3000,
      delay: 2500,
      ease: 'Power2',
    });
  }

  // ─────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────

  getZone(x) {
    return GAME_CONFIG.ZONES.find(z => x >= z.start && x < z.end);
  }

  updateMetrics(metrics, segment) {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    if (segment) this.currentSegment = segment;
  }

  updateOtherRiders(riders) {
    this.otherRiders = riders;
  }
}
