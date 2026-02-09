import { GAME_CONFIG } from './config';
import TextureGenerator from './TextureGenerator';

/**
 * Seeded PRNG for deterministic per-chunk generation.
 */
function chunkRandom(chunkIndex) {
  let s = ((chunkIndex + 1) * 2654435761) & 0x7fffffff;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.currentMetrics = {
      power: 0, power_target: 0, cadence: 0, heart_rate: 0, speed: 0, distance: 0,
    };
    this.currentSegment = { name: 'Idle', type: 'recovery', ftp_percentage: 0 };
    this.previousSegmentType = 'recovery';
    this.otherRiders = [];
    this.otherRiderSprites = {};
    this.worldX = 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  create() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // Generate all textures
    const texGen = new TextureGenerator(this);
    texGen.generateAll();

    // ── LAYER 0: Sky background (tiled vertically per zone) ──
    this.skyImages = [];
    GAME_CONFIG.ZONES.forEach((_, i) => {
      const img = this.add.tileSprite(0, 0, W, H, `sky_${i}`)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(0);
      this.skyImages.push(img);
    });
    this.currentSkyIndex = 0;
    this.skyImages[0].setVisible(true);
    this.targetSkyAlpha = 1;

    // ── LAYER 1: Parallax starfield ──
    this.starLayers = [];
    GAME_CONFIG.STAR_LAYERS.forEach((layer, li) => {
      const stars = [];
      for (let i = 0; i < layer.count; i++) {
        const size = layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin);
        const texIdx = size < 1 ? 1 : size < 2 ? 2 : 3;
        const star = this.add.image(
          Math.random() * W,
          Math.random() * H,
          `star_${texIdx}`
        )
          .setScrollFactor(0)
          .setScale(size * 0.3)
          .setAlpha(layer.alpha * (0.5 + Math.random() * 0.5))
          .setDepth(1 + li);
        star._baseAlpha = star.alpha;
        star._twinkleSpeed = 0.5 + Math.random() * 2;
        star._twinklePhase = Math.random() * Math.PI * 2;
        star._layerSpeed = layer.speed;
        stars.push(star);
      }
      this.starLayers.push(stars);
    });

    // ── LAYER 2: Background nebulae / planets (slow parallax, spawned in chunks) ──
    this.bgObjects = [];
    this.lastBgSpawnX = -500;

    // ── LAYER 3: Asteroids (effort-driven) ──
    this.asteroids = [];

    // ── LAYER 4: Ambient particles per zone ──
    this.ambientParticles = [];
    this._createAmbientPool();

    // ── LAYER 5: Speed lines (high speed) ──
    this.speedLines = [];
    this._createSpeedLinePool();

    // ── LAYER 6: Warp tunnel (maximum effort) ──
    this.warpOverlay = this.add.image(W / 2, H / 2, 'warp_tunnel')
      .setScrollFactor(0)
      .setScale(3.5)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(80);

    // ── LAYER 7: Engine glow (behind ship) ──
    this.engineGlow = this.add.image(0, 0, 'engine_glow_low')
      .setScrollFactor(0)
      .setOrigin(1, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(89);

    // ── LAYER 8: Ship ──
    this.shipColor = 'blue';
    const shipX = W * GAME_CONFIG.SHIP_X_RATIO;
    const shipY = GAME_CONFIG.SHIP_BASE_Y;
    this.shipSprite = this.add.image(shipX, shipY, 'ship_blue_0')
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setScale(GAME_CONFIG.SHIP_SCALE)
      .setDepth(90);

    // ── LAYER 9: Shield (HR display) ──
    this.shield = this.add.image(shipX + 10, shipY, 'shield_green')
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setScale(GAME_CONFIG.SHIP_SCALE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(91);

    // ── LAYER 10: Shockwave effect ──
    this.shockwave = this.add.image(shipX, shipY, 'shockwave')
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setScale(0.3)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(95);
    this.shockwaveActive = false;

    // ── LAYER 11: Engine sparks ──
    this.sparks = [];
    this._createSparkPool();

    // ── UI Overlays ──
    this.zoneLabel = this.add.text(W / 2, 20, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#8899cc',
      backgroundColor: 'rgba(0,0,0,0.45)',
      padding: { x: 16, y: 6 },
      shadow: { offsetX: 0, offsetY: 1, color: 'rgba(80,120,200,0.3)', blur: 6, fill: true },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0.9).setDepth(200);

    this.achievementText = this.add.text(W / 2, 52, '', {
      fontSize: '13px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 12, y: 5 },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0).setDepth(200);

    this.effortLabel = this.add.text(W - 20, H - 30, '', {
      fontSize: '12px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#667799',
      shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 3, fill: true },
    }).setScrollFactor(0).setOrigin(1, 0.5).setAlpha(0).setDepth(200);

    this.powerBarGfx = this.add.graphics().setScrollFactor(0).setDepth(200);

    // Screen tint overlay (intense effort)
    this.screenTint = this.add.graphics().setScrollFactor(0).setDepth(85).setAlpha(0);

    // Achievement tracking
    this.achievements = { first1km: false, first5km: false, first10km: false };

    // Spawn initial background objects
    this._spawnInitialBgObjects();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ZONE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  getZoneIndex(x) {
    const { ZONES, ZONE_WIDTH } = GAME_CONFIG;
    const idx = Math.floor((x / ZONE_WIDTH) % ZONES.length);
    return ((idx % ZONES.length) + ZONES.length) % ZONES.length;
  }

  getEffortLevel() {
    const ftp = this.currentSegment.ftp_percentage || 0;
    const t = GAME_CONFIG.EFFORT_THRESHOLDS;
    if (ftp >= t.maximum) return 'maximum';
    if (ftp >= t.intense) return 'intense';
    if (ftp >= t.hard) return 'hard';
    if (ftp >= t.moderate) return 'moderate';
    return 'calm';
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OBJECT POOLS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _createAmbientPool() {
    for (let i = 0; i < 60; i++) {
      const p = this.add.image(0, 0, 'particle_blue')
        .setScrollFactor(0).setAlpha(0).setDepth(70);
      p._active = false;
      p._velX = 0;
      p._velY = 0;
      p._life = 0;
      this.ambientParticles.push(p);
    }
  }

  _createSpeedLinePool() {
    for (let i = 0; i < 30; i++) {
      const line = this.add.image(0, 0, 'speed_line')
        .setScrollFactor(0).setAlpha(0).setDepth(75).setOrigin(1, 0.5);
      line._active = false;
      line._velX = 0;
      this.speedLines.push(line);
    }
  }

  _createSparkPool() {
    for (let i = 0; i < 40; i++) {
      const spark = this.add.image(0, 0, 'spark')
        .setScrollFactor(0).setAlpha(0).setDepth(92)
        .setBlendMode(Phaser.BlendModes.ADD);
      spark._active = false;
      spark._velX = 0;
      spark._velY = 0;
      spark._life = 0;
      this.sparks.push(spark);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BACKGROUND OBJECTS (nebulae, planets)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _spawnInitialBgObjects() {
    const cam = this.cameras.main;
    // Scatter some initial nebulae and planets across the viewport
    for (let x = -200; x < cam.width + 400; x += 300 + Math.random() * 400) {
      this._spawnBgObject(x);
    }
  }

  _spawnBgObject(atX) {
    const cam = this.cameras.main;
    const rand = Math.random;
    const roll = rand();

    if (roll < 0.4) {
      // Nebula
      const variant = Math.floor(rand() * 4);
      const neb = this.add.image(atX, 60 + rand() * (cam.height - 120), `nebula_${variant}`)
        .setScrollFactor(0)
        .setAlpha(0.06 + rand() * 0.08)
        .setScale(0.8 + rand() * 1.2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5);
      neb._parallaxSpeed = 0.03 + rand() * 0.06;
      neb._type = 'nebula';
      this.bgObjects.push(neb);
    } else if (roll < 0.7) {
      // Planet
      const variant = Math.floor(rand() * 4);
      const planet = this.add.image(atX, 80 + rand() * (cam.height - 160), `planet_${variant}`)
        .setScrollFactor(0)
        .setAlpha(0.15 + rand() * 0.2)
        .setScale(0.15 + rand() * 0.35)
        .setDepth(4);
      planet._parallaxSpeed = 0.02 + rand() * 0.04;
      planet._type = 'planet';
      this.bgObjects.push(planet);
    } else {
      // Another nebula for more atmosphere
      const variant = Math.floor(rand() * 4);
      const neb = this.add.image(atX, rand() * cam.height, `nebula_${variant}`)
        .setScrollFactor(0)
        .setAlpha(0.03 + rand() * 0.05)
        .setScale(1.5 + rand() * 1.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3);
      neb._parallaxSpeed = 0.01 + rand() * 0.03;
      neb._type = 'nebula';
      this.bgObjects.push(neb);
    }

    this.lastBgSpawnX = atX;
  }

  _updateBgObjects(scrollDelta) {
    const cam = this.cameras.main;

    // Move background objects with parallax
    this.bgObjects.forEach(obj => {
      obj.x -= scrollDelta * obj._parallaxSpeed;
    });

    // Spawn new objects ahead
    const rightmostNeeded = cam.width + 400;
    let maxObjX = 0;
    this.bgObjects.forEach(obj => {
      if (obj.x > maxObjX) maxObjX = obj.x;
    });
    if (maxObjX < rightmostNeeded && scrollDelta > 0) {
      this._spawnBgObject(rightmostNeeded + Math.random() * 300);
    }

    // Cleanup objects that scrolled off left
    this.bgObjects = this.bgObjects.filter(obj => {
      if (obj.x < -600) {
        obj.destroy();
        return false;
      }
      return true;
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ASTEROIDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _updateAsteroids(scrollDelta, dt) {
    const cam = this.cameras.main;
    const ftp = this.currentSegment.ftp_percentage || 0;
    const effort = this.getEffortLevel();

    // Spawn asteroids based on effort
    if (effort !== 'calm' && scrollDelta > 0) {
      const ftpAboveModerate = Math.max(0, ftp - GAME_CONFIG.EFFORT_THRESHOLDS.moderate);
      let spawnChance = GAME_CONFIG.ASTEROID_SPAWN_BASE +
        (ftpAboveModerate / 10) * GAME_CONFIG.ASTEROID_SPAWN_SCALE;

      if (effort === 'intense') spawnChance *= 2;
      if (effort === 'maximum') spawnChance *= 3;

      if (Math.random() < spawnChance) {
        this._spawnAsteroid();
      }
    }

    // Update asteroids
    this.asteroids.forEach(ast => {
      ast.x -= scrollDelta * 1.2 + ast._drift;
      ast.y += ast._driftY * dt;
      ast.rotation += ast._spin * dt;
    });

    // Cleanup
    this.asteroids = this.asteroids.filter(ast => {
      if (ast.x < -100) {
        ast.destroy();
        return false;
      }
      return true;
    });
  }

  _spawnAsteroid() {
    const cam = this.cameras.main;
    const variant = Math.floor(Math.random() * 5);
    const y = 40 + Math.random() * (cam.height - 80);
    const ast = this.add.image(cam.width + 50 + Math.random() * 200, y, `asteroid_${variant}`)
      .setScrollFactor(0)
      .setScale(0.8 + Math.random() * 1.5)
      .setDepth(40 + Math.floor(Math.random() * 10));
    ast._drift = 0.5 + Math.random() * 2;
    ast._driftY = (Math.random() - 0.5) * 30;
    ast._spin = (Math.random() - 0.5) * 1.5;
    this.asteroids.push(ast);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PARTICLES, SPEED LINES, SPARKS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _updateAmbientParticles(time, dt) {
    const cam = this.cameras.main;
    const zoneIdx = this.getZoneIndex(this.worldX);
    const zone = GAME_CONFIG.ZONES[zoneIdx];
    const particleTex = zone.ambientParticle;

    this.ambientParticles.forEach(p => {
      if (!p._active) {
        if (Math.random() < 0.03) {
          p._active = true;
          p.setTexture(particleTex);
          p.x = cam.width + 10;
          p.y = Math.random() * cam.height;
          p._velX = -(30 + Math.random() * 60);
          p._velY = (Math.random() - 0.5) * 20;
          p._life = 3 + Math.random() * 5;
          p.setScale(0.5 + Math.random() * 1.0);
          p.setAlpha(0.15 + Math.random() * 0.25);
        }
        return;
      }

      p.x += p._velX * dt;
      p.y += p._velY * dt;
      p.y += Math.sin(time / 800 + p.x * 0.01) * 0.3;
      p._life -= dt;

      if (p._life <= 0 || p.x < -20) {
        p._active = false;
        p.setAlpha(0);
      }
    });
  }

  _updateSpeedLines(scrollDelta, dt) {
    const speed = this.currentMetrics.speed || 0;
    const cam = this.cameras.main;

    this.speedLines.forEach(line => {
      if (!line._active) {
        // Spawn based on speed
        const spawnChance = speed > 20 ? 0.05 + (speed - 20) * 0.003 : 0;
        if (Math.random() < spawnChance) {
          line._active = true;
          line.x = cam.width + 60;
          line.y = Math.random() * cam.height;
          line._velX = -(200 + speed * 8 + Math.random() * 100);
          line.setAlpha(0.15 + Math.random() * 0.25);
          line.setScale(0.5 + (speed / 40) * 1.5, 1);
        }
        return;
      }

      line.x += line._velX * dt;
      if (line.x < -80) {
        line._active = false;
        line.setAlpha(0);
      }
    });
  }

  _updateSparks(dt) {
    const power = this.currentMetrics.power || 0;
    const cam = this.cameras.main;
    const shipX = cam.width * GAME_CONFIG.SHIP_X_RATIO;
    const shipY = this.shipSprite.y;

    this.sparks.forEach(spark => {
      if (!spark._active) {
        const spawnChance = power > 50 ? 0.02 + power * 0.0003 : 0;
        if (Math.random() < spawnChance) {
          spark._active = true;
          spark.x = shipX - 30 * GAME_CONFIG.SHIP_SCALE + (Math.random() - 0.5) * 8;
          spark.y = shipY + (Math.random() - 0.5) * 10;
          spark._velX = -(80 + Math.random() * 120);
          spark._velY = (Math.random() - 0.5) * 60;
          spark._life = 0.2 + Math.random() * 0.4;
          spark.setScale(0.5 + Math.random() * 0.8);
          spark.setAlpha(0.6 + Math.random() * 0.4);
        }
        return;
      }

      spark.x += spark._velX * dt;
      spark.y += spark._velY * dt;
      spark._life -= dt;
      spark.setAlpha(spark.alpha * 0.92);

      if (spark._life <= 0) {
        spark._active = false;
        spark.setAlpha(0);
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHOCKWAVE (interval transition)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _triggerShockwave() {
    if (this.shockwaveActive) return;
    this.shockwaveActive = true;
    this.shockwave.setScale(0.3);
    this.shockwave.setAlpha(0.8);

    this.tweens.add({
      targets: this.shockwave,
      scaleX: 6,
      scaleY: 6,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.shockwaveActive = false;
      },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN UPDATE LOOP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  update(time, delta) {
    const { power, cadence, speed } = this.currentMetrics;
    const dt = delta / 1000;
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // ── Movement (virtual scrolling) ──
    const speedFactor = power > 0
      ? GAME_CONFIG.AVATAR_BASE_SPEED + power * GAME_CONFIG.POWER_SPEED_FACTOR
      : 0;
    const clampedSpeed = Math.min(speedFactor, GAME_CONFIG.AVATAR_MAX_SPEED);
    const scrollDelta = clampedSpeed;
    this.worldX += scrollDelta;

    // ── Ship animation ──
    // Frame cycling based on cadence
    if (cadence > 0) {
      this.frameTimer += dt;
      const frameDuration = 60 / Math.max(cadence, 20) / 4;
      if (this.frameTimer >= frameDuration) {
        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % 4;
      }
    } else {
      // Slow idle animation
      this.frameTimer += dt;
      if (this.frameTimer >= 0.25) {
        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % 4;
      }
    }

    // Ship color from segment type
    const colorMap = { interval_on: 'red', warmup: 'yellow', recovery: 'green' };
    this.shipColor = colorMap[this.currentSegment.type] || 'blue';

    // Ship position with bob
    const shipX = W * GAME_CONFIG.SHIP_X_RATIO;
    const bob = Math.sin(time / 1000 * GAME_CONFIG.SHIP_BOB_SPEED) * GAME_CONFIG.SHIP_BOB_AMOUNT;
    const shipY = GAME_CONFIG.SHIP_BASE_Y + bob;

    this.shipSprite.setTexture(`ship_${this.shipColor}_${this.frameIndex}`);
    this.shipSprite.x = shipX;
    this.shipSprite.y = shipY;

    // Slight pitch based on speed change
    const tilt = clampedSpeed > 3 ? -2 : clampedSpeed > 1 ? -1 : 0;
    this.shipSprite.setAngle(tilt + bob * 0.2);

    // ── Engine glow ──
    let engineTex = 'engine_glow_low';
    let engineAlpha = 0.2;
    let engineScale = 1.0;
    if (power > 250) {
      engineTex = 'engine_glow_max';
      engineAlpha = 0.7 + Math.sin(time / 100) * 0.15;
      engineScale = 1.4;
    } else if (power > 150) {
      engineTex = 'engine_glow_high';
      engineAlpha = 0.5 + Math.sin(time / 150) * 0.1;
      engineScale = 1.2;
    } else if (power > 80) {
      engineTex = 'engine_glow_mid';
      engineAlpha = 0.35 + Math.sin(time / 200) * 0.08;
      engineScale = 1.1;
    } else if (power > 0) {
      engineAlpha = 0.2 + Math.sin(time / 300) * 0.05;
    } else {
      engineAlpha = 0;
    }
    this.engineGlow.setTexture(engineTex);
    this.engineGlow.setAlpha(engineAlpha);
    this.engineGlow.x = shipX - 26 * GAME_CONFIG.SHIP_SCALE;
    this.engineGlow.y = shipY;
    this.engineGlow.setScale(engineScale * GAME_CONFIG.SHIP_SCALE * 0.8);

    // ── Shield (HR) ──
    const hr = this.currentMetrics.heart_rate;
    if (hr > 0) {
      let shieldTex = 'shield_green';
      let shieldAlpha = 0.2;
      if (hr >= 170) { shieldTex = 'shield_red'; shieldAlpha = 0.5; }
      else if (hr >= 150) { shieldTex = 'shield_orange'; shieldAlpha = 0.4; }
      else if (hr >= 130) { shieldTex = 'shield_yellow'; shieldAlpha = 0.3; }
      this.shield.setTexture(shieldTex);
      this.shield.setAlpha(shieldAlpha + Math.sin(time / 500) * 0.08);
      this.shield.x = shipX + 8;
      this.shield.y = shipY;
      this.shield.setScale(GAME_CONFIG.SHIP_SCALE * (1.0 + Math.sin(time / 700) * 0.05));
    } else {
      this.shield.setAlpha(0);
    }

    // ── Shockwave position (follows ship) ──
    this.shockwave.x = shipX;
    this.shockwave.y = shipY;

    // ── Segment transition detection (fire shockwave when clearing an interval) ──
    if (this.currentSegment.type !== this.previousSegmentType) {
      if (this.previousSegmentType === 'interval_on') {
        this._triggerShockwave();
      }
      this.previousSegmentType = this.currentSegment.type;
    }

    // ── Starfield scrolling ──
    this.starLayers.forEach(stars => {
      stars.forEach(star => {
        star.x -= scrollDelta * star._layerSpeed;
        // Twinkle
        star.setAlpha(star._baseAlpha * (0.7 + Math.sin(time / 1000 * star._twinkleSpeed + star._twinklePhase) * 0.3));
        // Wrap around
        if (star.x < -10) {
          star.x = W + 10 + Math.random() * 50;
          star.y = Math.random() * H;
        }
      });
    });

    // ── Background objects parallax ──
    this._updateBgObjects(scrollDelta);

    // ── Asteroids ──
    this._updateAsteroids(scrollDelta, dt);

    // ── Ambient particles ──
    this._updateAmbientParticles(time, dt);

    // ── Speed lines ──
    this._updateSpeedLines(scrollDelta, dt);

    // ── Engine sparks ──
    this._updateSparks(dt);

    // ── Warp tunnel (maximum effort) ──
    const effort = this.getEffortLevel();
    const targetWarpAlpha = effort === 'maximum' ? 0.3 + Math.sin(time / 300) * 0.1 : 0;
    this.warpOverlay.setAlpha(this.warpOverlay.alpha + (targetWarpAlpha - this.warpOverlay.alpha) * 0.05);
    if (effort === 'maximum') {
      this.warpOverlay.rotation += dt * 0.3;
    }

    // ── Screen tint (intense effort) ──
    this.screenTint.clear();
    if (effort === 'intense' || effort === 'maximum') {
      const tintAlpha = effort === 'maximum' ? 0.08 : 0.04;
      this.screenTint.fillStyle(0xff2040, tintAlpha + Math.sin(time / 400) * 0.02);
      this.screenTint.fillRect(0, 0, W, H);
      this.screenTint.setAlpha(1);
    }

    // ── Sky zone switching ──
    const zoneIdx = this.getZoneIndex(this.worldX);
    if (zoneIdx !== this.currentSkyIndex) {
      this.skyImages[this.currentSkyIndex].setVisible(false);
      this.skyImages[zoneIdx].setVisible(true);
      this.currentSkyIndex = zoneIdx;
    }
    const zone = GAME_CONFIG.ZONES[zoneIdx];
    this.zoneLabel.setText(zone.name);

    // ── Effort label ──
    const ftp = this.currentSegment.ftp_percentage || 0;
    if (ftp > 0) {
      const effortNames = { calm: 'Cruising', moderate: 'Steady', hard: 'Pushing', intense: 'Full Burn', maximum: 'WARP SPEED' };
      this.effortLabel.setText(`${effortNames[effort]} [${ftp}% FTP]`);
      const effortColors = { calm: '#6688aa', moderate: '#66aa88', hard: '#aaaa44', intense: '#dd8844', maximum: '#ff4466' };
      this.effortLabel.setColor(effortColors[effort]);
      this.effortLabel.setAlpha(0.8);
    } else {
      this.effortLabel.setAlpha(0);
    }

    // ── Power bar ──
    this._drawPowerBar();

    // ── Other riders ──
    this._updateOtherRiders();

    // ── Achievements ──
    this._checkAchievements();

    // ── Resize handling ──
    this._handleResize();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _drawPowerBar() {
    const g = this.powerBarGfx;
    g.clear();
    const power = this.currentMetrics.power;
    const target = this.currentMetrics.power_target || 200;
    if (power <= 0 && target <= 0) return;

    const cam = this.cameras.main;
    const maxPower = Math.max(target * 1.5, 400);
    const barW = 220, barH = 6;
    const x = cam.width / 2 - barW / 2;
    const y = cam.height - 25;

    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x - 1, y - 1, barW + 2, barH + 2, 3);

    const fillW = Math.min(power / maxPower, 1) * barW;
    let color = 0x48bb78;
    if (power > target * 1.1) color = 0xef4444;
    else if (power > target * 0.9) color = 0xecc94b;
    g.fillStyle(color, 0.7);
    g.fillRoundedRect(x, y, Math.max(fillW, 2), barH, 2);

    if (target > 0) {
      const tx = x + (target / maxPower) * barW;
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(tx - 0.5, y - 2, 1, barH + 4);
    }
  }

  _updateOtherRiders() {
    const cam = this.cameras.main;
    const shipX = cam.width * GAME_CONFIG.SHIP_X_RATIO;
    const shipY = this.shipSprite.y;

    // Cleanup disconnected
    Object.keys(this.otherRiderSprites).forEach(id => {
      if (!this.otherRiders.find(r => r.user_id === id)) {
        this.otherRiderSprites[id].sprite.destroy();
        this.otherRiderSprites[id].label.destroy();
        delete this.otherRiderSprites[id];
      }
    });

    this.otherRiders.forEach(rider => {
      if (!this.otherRiderSprites[rider.user_id]) {
        const sprite = this.add.image(shipX + 100, shipY, 'ship_ghost_0')
          .setScrollFactor(0)
          .setOrigin(0.5, 0.5)
          .setScale(GAME_CONFIG.SHIP_SCALE * 0.9)
          .setDepth(45);
        const label = this.add.text(shipX + 100, shipY - 40, rider.username || 'Rider', {
          fontSize: '9px', fontFamily: 'monospace', color: '#6688bb',
          backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 4, y: 2 },
        }).setScrollFactor(0).setOrigin(0.5).setDepth(46);
        this.otherRiderSprites[rider.user_id] = { sprite, label };
      }

      const rs = this.otherRiderSprites[rider.user_id];
      // Position relative to main ship based on their distance vs ours
      const myDist = this.currentMetrics.distance || 0;
      const theirDist = rider.distance || 0;
      const offsetX = (theirDist - myDist) * 50; // 50px per km difference
      const targetX = shipX + Phaser.Math.Clamp(offsetX, -300, 400);

      rs.sprite.x = Phaser.Math.Linear(rs.sprite.x, targetX, 0.05);
      rs.sprite.y = shipY + 30 + Math.sin(this.worldX * 0.01 + targetX) * 5;
      rs.label.x = rs.sprite.x;
      rs.label.y = rs.sprite.y - 40;

      // Animate ghost ship frames
      const ghostFrame = Math.floor(this.worldX / 30) % 4;
      rs.sprite.setTexture(`ship_ghost_${ghostFrame}`);
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

  _handleResize() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // Reposition fixed UI
    this.zoneLabel.x = W / 2;
    this.achievementText.x = W / 2;
    this.effortLabel.x = W - 20;
    this.effortLabel.y = H - 30;

    // Resize sky tiles
    this.skyImages.forEach(sky => {
      sky.setSize(W, H);
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLIC API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  updateMetrics(metrics, segment) {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    if (segment) this.currentSegment = segment;
  }

  updateOtherRiders(riders) {
    this.otherRiders = riders;
  }
}
