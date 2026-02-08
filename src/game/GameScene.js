import { GAME_CONFIG } from './config';
import TextureGenerator from './TextureGenerator';

/**
 * Seeded PRNG for deterministic per-chunk generation.
 * Given the same chunk index, the same terrain is produced.
 */
function chunkRandom(chunkIndex) {
  let s = ((chunkIndex + 1) * 2654435761) & 0x7fffffff; // knuth hash
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Cosine interpolation between two values.
 */
function cosLerp(a, b, t) {
  const f = (1 - Math.cos(t * Math.PI)) / 2;
  return a * (1 - f) + b * f;
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.currentMetrics = {
      power: 0, power_target: 0, cadence: 0, heart_rate: 0, speed: 0, distance: 0,
    };
    this.currentSegment = { name: 'Idle', type: 'recovery', ftp_percentage: 0 };
    this.otherRiders = [];
    this.otherRiderSprites = {};
    this.worldPosition = 200;
    this.pedalAngle = 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  create() {
    // Generate all textures
    const texGen = new TextureGenerator(this);
    texGen.generateAll();

    // ── Elevation profile: effort → hills ──
    // Stores { x, elevation } keyframes. Elevation is Y offset from BASE_ROAD_Y.
    this.elevationKeyframes = [
      { x: 0, elevation: 0 },
      { x: 300, elevation: 0 },
    ];
    this.lastElevationSampleX = 0;
    this.currentElevation = 0;      // smoothed current road Y offset
    this.currentGrade = 0;          // current slope in degrees (for cyclist tilt)

    // ── Chunk management ──
    this.activeChunks = new Map();   // chunkIndex → { sprites: [], x: number }
    this.lastGeneratedChunkIndex = -1;

    // ── LAYER 0: Sky (fixed, switches per zone) ──
    this.skyImages = [];
    GAME_CONFIG.ZONES.forEach((_, i) => {
      const img = this.add.tileSprite(0, 0, this.cameras.main.width, GAME_CONFIG.HORIZON_Y + 120, `sky_${i}`)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setVisible(false)
        .setDepth(0);
      this.skyImages.push(img);
    });
    this.currentSkyIndex = 0;
    this.skyImages[0].setVisible(true);

    // Sun
    this.sun = this.add.image(this.cameras.main.width * 0.8, 55, 'sun')
      .setScrollFactor(0).setScale(1.5).setAlpha(0.85)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(1);

    // ── LAYER 1: Far mountains (persistent, slow parallax) ──
    this.farMountainPool = [];
    this.lastMountainX = -200;
    this._ensureMountains();

    // ── LAYER 2: Clouds (persistent, very slow scroll) ──
    this.cloudPool = [];
    this.lastCloudX = -100;
    this._ensureClouds();

    // ── LAYER 3: Mid hills (persistent, medium parallax) ──
    this.midHillPool = [];
    this.lastHillX = -200;
    this._ensureHills();

    // ── LAYER 4: Birds ──
    this.birds = [];
    this._initBirds();

    // ── LAYER 5-10: Dynamic road + terrain (drawn per-frame) ──
    this.roadGraphics = this.add.graphics().setDepth(20);
    this.groundGraphics = this.add.graphics().setDepth(21);
    this.roadMarkings = this.add.graphics().setDepth(22);

    // ── LAYER 11: Chunk-spawned objects (trees, houses, rocks, bushes, water, markers) ──
    // These are managed per-chunk and stored in this.activeChunks

    // ── LAYER 12: Cyclist ──
    this.cyclistJersey = 'blue';
    this.cyclistSprite = this.add.image(this.worldPosition, GAME_CONFIG.BASE_ROAD_Y - 8, 'cyclist_blue_0')
      .setOrigin(0.5, 1)
      .setScale(GAME_CONFIG.CYCLIST_SCALE)
      .setDepth(50);

    // HR glow
    this.hrGlow = this.add.image(this.worldPosition, GAME_CONFIG.BASE_ROAD_Y - 30, 'glow_green')
      .setOrigin(0.5, 0.5).setScale(1.5).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(49);

    // ── LAYER 13: Atmospheric particles ──
    this.atmosParticles = [];
    this._createParticlePool();

    // ── LAYER 14: Grade indicator ──
    this.gradeText = this.add.text(this.cameras.main.width - 20, this.cameras.main.height - 60, '', {
      fontSize: '18px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 3, fill: true },
    }).setScrollFactor(0).setOrigin(1, 0.5).setAlpha(0).setDepth(200);

    this.gradeArrow = this.add.text(this.cameras.main.width - 20, this.cameras.main.height - 78, '', {
      fontSize: '22px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 3, fill: true },
    }).setScrollFactor(0).setOrigin(1, 0.5).setAlpha(0).setDepth(200);

    // ── LAYER 15: UI overlays ──
    this.zoneLabel = this.add.text(this.cameras.main.width / 2, 20, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: { x: 16, y: 6 },
      shadow: { offsetX: 0, offsetY: 1, color: 'rgba(0,0,0,0.3)', blur: 4, fill: true },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0.9).setDepth(200);

    this.achievementText = this.add.text(this.cameras.main.width / 2, 52, '', {
      fontSize: '13px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 12, y: 5 },
    }).setScrollFactor(0).setOrigin(0.5, 0).setAlpha(0).setDepth(200);

    this.powerBarGfx = this.add.graphics().setScrollFactor(0).setDepth(200);

    // No camera bounds - infinite scroll
    this.cameras.main.removeBounds();

    // Achievement tracking
    this.achievements = { first1km: false, first5km: false, first10km: false };

    // Generate initial chunks
    this._updateChunks();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ZONE HELPERS (cycling zones endlessly)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  getZone(x) {
    const { ZONES, ZONE_WIDTH } = GAME_CONFIG;
    const idx = Math.floor((x / ZONE_WIDTH) % ZONES.length);
    return ZONES[((idx % ZONES.length) + ZONES.length) % ZONES.length];
  }

  getZoneIndex(x) {
    const { ZONES, ZONE_WIDTH } = GAME_CONFIG;
    const idx = Math.floor((x / ZONE_WIDTH) % ZONES.length);
    return ((idx % ZONES.length) + ZONES.length) % ZONES.length;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ELEVATION SYSTEM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Map FTP percentage to elevation offset using the config table. */
  ftpToElevation(ftpPct) {
    const map = GAME_CONFIG.ELEVATION_MAP;
    if (ftpPct <= map[0].ftp) return map[0].offset;
    if (ftpPct >= map[map.length - 1].ftp) return map[map.length - 1].offset;
    for (let i = 0; i < map.length - 1; i++) {
      if (ftpPct >= map[i].ftp && ftpPct <= map[i + 1].ftp) {
        const t = (ftpPct - map[i].ftp) / (map[i + 1].ftp - map[i].ftp);
        return cosLerp(map[i].offset, map[i + 1].offset, t);
      }
    }
    return 0;
  }

  /** Sample a new elevation keyframe at the current position. */
  sampleElevation() {
    const ftpPct = this.currentSegment.ftp_percentage || 0;
    const elevation = ftpPct > 0 ? this.ftpToElevation(ftpPct) : 0;
    this.elevationKeyframes.push({
      x: this.worldPosition,
      elevation,
    });
    this.lastElevationSampleX = this.worldPosition;

    // Prune old keyframes far behind camera
    const pruneX = this.cameras.main.scrollX - 2000;
    while (this.elevationKeyframes.length > 4 && this.elevationKeyframes[0].x < pruneX) {
      this.elevationKeyframes.shift();
    }
  }

  /** Get interpolated road elevation at any world X. */
  getElevationAt(x) {
    const kf = this.elevationKeyframes;
    if (kf.length === 0) return 0;
    if (x <= kf[0].x) return kf[0].elevation;
    if (x >= kf[kf.length - 1].x) return kf[kf.length - 1].elevation;

    for (let i = 0; i < kf.length - 1; i++) {
      if (x >= kf[i].x && x <= kf[i + 1].x) {
        const t = (x - kf[i].x) / (kf[i + 1].x - kf[i].x);
        return cosLerp(kf[i].elevation, kf[i + 1].elevation, t);
      }
    }
    return kf[kf.length - 1].elevation;
  }

  /** Get road Y position at world X. */
  getRoadY(x) {
    return GAME_CONFIG.BASE_ROAD_Y + this.getElevationAt(x);
  }

  /** Compute grade (slope angle in degrees) at X. */
  getGradeAt(x) {
    const dx = 30;
    const y1 = this.getElevationAt(x - dx);
    const y2 = this.getElevationAt(x + dx);
    return Math.atan2(y1 - y2, dx * 2) * (180 / Math.PI);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHUNK MANAGEMENT (infinite terrain)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _getChunkIndex(x) {
    return Math.floor(x / GAME_CONFIG.CHUNK_WIDTH);
  }

  _updateChunks() {
    const cam = this.cameras.main;
    const leftEdge = cam.scrollX - GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.KEEP_BEHIND;
    const rightEdge = cam.scrollX + cam.width + GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.GENERATE_AHEAD;
    const leftChunk = this._getChunkIndex(leftEdge);
    const rightChunk = this._getChunkIndex(rightEdge);

    // Generate new chunks that are needed
    for (let ci = leftChunk; ci <= rightChunk; ci++) {
      if (!this.activeChunks.has(ci)) {
        this._generateChunk(ci);
      }
    }

    // Remove chunks that are too far away
    for (const [ci, chunk] of this.activeChunks) {
      if (ci < leftChunk - 1 || ci > rightChunk + 1) {
        chunk.sprites.forEach(s => s.destroy());
        this.activeChunks.delete(ci);
      }
    }
  }

  _generateChunk(chunkIndex) {
    const { CHUNK_WIDTH } = GAME_CONFIG;
    const chunkX = chunkIndex * CHUNK_WIDTH;
    const rand = chunkRandom(chunkIndex);
    const zone = this.getZone(chunkX + CHUNK_WIDTH / 2);
    const sprites = [];

    // ── Trees ──
    const density = zone.treeDensity || 0.4;
    for (let lx = chunkX + rand() * 50; lx < chunkX + CHUNK_WIDTH; lx += 60 + rand() * 80) {
      if (rand() > density) continue;
      const type = zone.treeTypes[Math.floor(rand() * zone.treeTypes.length)];
      const roadY = this.getRoadY(lx);
      const behindDist = 10 + rand() * 70; // how far behind the road
      const scale = 0.7 + rand() * 0.7;

      const tree = this.add.image(lx, roadY - behindDist, type)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setAlpha(0.7 + rand() * 0.3)
        .setDepth(15 + (behindDist < 30 ? 5 : 0));

      if (rand() > 0.7) {
        tree.setTint(Phaser.Display.Color.GetColor(
          200 + Math.floor(rand() * 55),
          200 + Math.floor(rand() * 55),
          200 + Math.floor(rand() * 55),
        ));
      }
      sprites.push(tree);
    }

    // ── Houses (village zone only) ──
    if (zone.hasHouses) {
      for (let lx = chunkX + rand() * 100; lx < chunkX + CHUNK_WIDTH; lx += 200 + rand() * 300) {
        if (rand() > 0.5) continue;
        const variant = Math.floor(rand() * 4);
        const roadY = this.getRoadY(lx);
        const house = this.add.image(lx, roadY - 15, `house_${variant}`)
          .setOrigin(0.5, 1)
          .setScale(1.1 + rand() * 0.4)
          .setDepth(16);
        sprites.push(house);
      }
    }

    // ── Lake water tiles (lake zone only) ──
    if (zone.hasLake) {
      const roadY = this.getRoadY(chunkX + CHUNK_WIDTH / 2);
      const tile = this.add.tileSprite(chunkX, roadY - 35, CHUNK_WIDTH, 80, 'water_tile')
        .setOrigin(0, 0)
        .setAlpha(0.65)
        .setDepth(10);
      tile._isWater = true;
      sprites.push(tile);
    }

    // ── Bushes and rocks below road ──
    for (let lx = chunkX + rand() * 20; lx < chunkX + CHUNK_WIDTH; lx += 35 + rand() * 60) {
      const roadY = this.getRoadY(lx);
      if (rand() < 0.35) {
        const key = `bush_${Math.floor(rand() * 3)}`;
        sprites.push(
          this.add.image(lx, roadY + GAME_CONFIG.ROAD_HEIGHT + 4 + rand() * 12, key)
            .setOrigin(0.5, 0)
            .setScale(0.6 + rand() * 0.6)
            .setAlpha(0.8)
            .setDepth(23)
        );
      } else if (rand() < 0.25) {
        const key = `rock_${Math.floor(rand() * 3)}`;
        sprites.push(
          this.add.image(lx, roadY + GAME_CONFIG.ROAD_HEIGHT + 2 + rand() * 8, key)
            .setOrigin(0.5, 0)
            .setScale(0.5 + rand() * 0.7)
            .setAlpha(0.8)
            .setDepth(23)
        );
      }
    }

    // ── Km markers ──
    const pixelsPerKm = 500;
    const startKm = Math.ceil(chunkX / pixelsPerKm);
    const endKm = Math.floor((chunkX + CHUNK_WIDTH) / pixelsPerKm);
    for (let km = startKm; km <= endKm; km++) {
      if (km <= 0) continue;
      const mx = km * pixelsPerKm;
      const roadY = this.getRoadY(mx);
      sprites.push(
        this.add.image(mx, roadY - 2, 'km_marker').setOrigin(0.5, 1).setDepth(24)
      );
      sprites.push(
        this.add.text(mx, roadY - 28, `${km}`, {
          fontSize: '8px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5, 0.5).setDepth(24)
      );
    }

    this.activeChunks.set(chunkIndex, { sprites, x: chunkX });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERSISTENT BACKGROUND LAYERS (mountains, hills, clouds)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _ensureMountains() {
    const cam = this.cameras.main;
    const rightEdge = (cam.scrollX + cam.width + 600) / GAME_CONFIG.PARALLAX_FAR;
    while (this.lastMountainX < rightEdge) {
      this.lastMountainX += 200 + Math.random() * 350;
      const variant = Math.floor(Math.random() * 3);
      const sprite = this.add.image(this.lastMountainX, GAME_CONFIG.HORIZON_Y + 30, `mountain_${variant}`)
        .setOrigin(0.5, 1)
        .setScrollFactor(GAME_CONFIG.PARALLAX_FAR)
        .setAlpha(0.45 + Math.random() * 0.35)
        .setScale(0.7 + Math.random() * 0.7)
        .setDepth(2);
      this.farMountainPool.push(sprite);
    }
    // Prune
    const pruneX = (cam.scrollX - 800) / GAME_CONFIG.PARALLAX_FAR;
    this.farMountainPool = this.farMountainPool.filter(s => {
      if (s.x < pruneX) { s.destroy(); return false; }
      return true;
    });
  }

  _ensureClouds() {
    const cam = this.cameras.main;
    const rightEdge = cam.scrollX + cam.width + 800;
    while (this.lastCloudX < rightEdge) {
      this.lastCloudX += 180 + Math.random() * 500;
      const variant = Math.floor(Math.random() * 4);
      const sf = 0.04 + Math.random() * 0.1;
      const sprite = this.add.image(this.lastCloudX, 25 + Math.random() * 130, `cloud_${variant}`)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(sf)
        .setAlpha(0.35 + Math.random() * 0.4)
        .setScale(0.6 + Math.random() * 1.0)
        .setDepth(3);
      sprite._driftSpeed = 2 + Math.random() * 6;
      this.cloudPool.push(sprite);
    }
    const pruneX = cam.scrollX - 600;
    this.cloudPool = this.cloudPool.filter(s => {
      if (s.x * s.scrollFactorX < pruneX) { s.destroy(); return false; }
      return true;
    });
  }

  _ensureHills() {
    const cam = this.cameras.main;
    const rightEdge = (cam.scrollX + cam.width + 500) / GAME_CONFIG.PARALLAX_MID;
    while (this.lastHillX < rightEdge) {
      this.lastHillX += 120 + Math.random() * 280;
      const variant = Math.floor(Math.random() * 4);
      // Hills respond slightly to elevation - higher hills on climbs
      const roadElev = this.getElevationAt(this.lastHillX * GAME_CONFIG.PARALLAX_MID);
      const sprite = this.add.image(this.lastHillX, GAME_CONFIG.BASE_ROAD_Y + 10 + roadElev * 0.4, `hill_${variant}`)
        .setOrigin(0.5, 1)
        .setScrollFactor(GAME_CONFIG.PARALLAX_MID)
        .setAlpha(0.5 + Math.random() * 0.35)
        .setScale(0.6 + Math.random() * 0.6)
        .setDepth(4);
      this.midHillPool.push(sprite);
    }
    const pruneX = (cam.scrollX - 600) / GAME_CONFIG.PARALLAX_MID;
    this.midHillPool = this.midHillPool.filter(s => {
      if (s.x < pruneX) { s.destroy(); return false; }
      return true;
    });
  }

  _initBirds() {
    for (let i = 0; i < 10; i++) {
      const bird = this.add.image(
        this.worldPosition - 400 + Math.random() * 1200,
        30 + Math.random() * 180,
        'bird'
      ).setScrollFactor(0.15 + Math.random() * 0.25)
        .setAlpha(0.4 + Math.random() * 0.3)
        .setScale(0.7 + Math.random() * 0.5)
        .setDepth(5);
      bird._baseY = bird.y;
      bird._speed = 12 + Math.random() * 25;
      bird._phase = Math.random() * Math.PI * 2;
      bird._flapSpeed = 2 + Math.random() * 3;
      this.birds.push(bird);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DYNAMIC ROAD + GROUND RENDERING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _drawRoad() {
    const cam = this.cameras.main;
    const g = this.roadGraphics;
    const gm = this.roadMarkings;
    const gg = this.groundGraphics;
    g.clear();
    gm.clear();
    gg.clear();

    const left = cam.scrollX - 60;
    const right = cam.scrollX + cam.width + 60;
    const step = 8; // px between road elevation samples

    // ── Road surface ──
    g.fillStyle(0x6a6058);
    g.beginPath();
    // Top edge of road
    let firstX = left;
    for (let x = left; x <= right; x += step) {
      const y = this.getRoadY(x);
      if (x === left) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    // Bottom edge of road (reverse)
    for (let x = right; x >= left; x -= step) {
      const y = this.getRoadY(x) + GAME_CONFIG.ROAD_HEIGHT;
      g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();

    // ── Road top highlight ──
    g.lineStyle(1, 0x8a8078, 0.5);
    g.beginPath();
    for (let x = left; x <= right; x += step) {
      const y = this.getRoadY(x);
      if (x === left) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();

    // ── Road bottom shadow ──
    g.lineStyle(2, 0x3a3530, 0.4);
    g.beginPath();
    for (let x = left; x <= right; x += step) {
      const y = this.getRoadY(x) + GAME_CONFIG.ROAD_HEIGHT;
      if (x === left) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();

    // ── Center line dashes ──
    gm.fillStyle(0xffffff, 0.2);
    for (let x = Math.floor(left / 28) * 28; x <= right; x += 28) {
      const y = this.getRoadY(x) + GAME_CONFIG.ROAD_HEIGHT / 2 - 1;
      gm.fillRect(x, y, 12, 2);
    }

    // ── Grass edges ──
    g.fillStyle(0x5a8a4a, 0.45);
    g.beginPath();
    for (let x = left; x <= right; x += step) {
      const y = this.getRoadY(x) - 3;
      if (x === left) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    for (let x = right; x >= left; x -= step) {
      const y = this.getRoadY(x);
      g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();

    // ── Ground below road ──
    const zone = this.getZone(this.worldPosition);
    if (zone) {
      const [tr, tgv, tb] = zone.groundTop;
      const [br, bgv, bb] = zone.groundBot;
      const strips = 12;
      const groundH = 200;
      for (let i = 0; i < strips; i++) {
        const frac = i / strips;
        const r = Math.floor(tr + (br - tr) * frac);
        const gv = Math.floor(tgv + (bgv - tgv) * frac);
        const b = Math.floor(tb + (bb - tb) * frac);
        gg.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));

        const stripH = groundH / strips;
        gg.beginPath();
        for (let x = left; x <= right; x += step * 2) {
          const baseY = this.getRoadY(x) + GAME_CONFIG.ROAD_HEIGHT + 4 + stripH * i;
          if (x === left) gg.moveTo(x, baseY);
          else gg.lineTo(x, baseY);
        }
        for (let x = right; x >= left; x -= step * 2) {
          const baseY = this.getRoadY(x) + GAME_CONFIG.ROAD_HEIGHT + 4 + stripH * (i + 1);
          gg.lineTo(x, baseY);
        }
        gg.closePath();
        gg.fillPath();
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PARTICLES (atmospheric + effort-driven)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  _createParticlePool() {
    for (let i = 0; i < 50; i++) {
      const p = this.add.image(0, 0, 'dust')
        .setAlpha(0).setDepth(60);
      p._active = false;
      p._velX = 0;
      p._velY = 0;
      p._life = 0;
      this.atmosParticles.push(p);
    }
  }

  _updateParticles(time, dt) {
    const zone = this.getZone(this.worldPosition);
    if (!zone) return;
    const cam = this.cameras.main;
    const isSnow = zone.name === 'Snow Summit';
    const isForest = zone.name === 'Birch Forest';
    const ftpPct = this.currentSegment.ftp_percentage || 0;
    const isHardEffort = ftpPct > 95;

    this.atmosParticles.forEach(p => {
      // Spawn
      if (!p._active) {
        let spawnChance = 0.02;
        if (isSnow) spawnChance = 0.06;
        else if (isForest) spawnChance = 0.04;
        if (isHardEffort) spawnChance += 0.04; // more particles during hard effort

        if (Math.random() < spawnChance) {
          p._active = true;
          p.x = cam.scrollX + Math.random() * cam.width * 1.3;
          p.y = -5 + Math.random() * 60;
          p._life = 2 + Math.random() * 4;
          p.setScale(0.4 + Math.random() * 0.5);

          if (isSnow) {
            p.setTexture('snow_particle');
            p._velX = -3 + Math.random() * 6;
            p._velY = 12 + Math.random() * 18;
            p.setAlpha(0.5 + Math.random() * 0.3);
          } else if (isHardEffort) {
            // Headwind streaks during hard effort
            p.setTexture('wind_streak');
            p._velX = -100 - Math.random() * 80;
            p._velY = -2 + Math.random() * 4;
            p.y = 100 + Math.random() * 350;
            p._life = 0.8 + Math.random() * 0.6;
            p.setAlpha(0.15 + Math.random() * 0.15);
            p.setScale(0.8 + Math.random() * 0.5);
          } else if (isForest) {
            p.setTexture('leaf');
            p._velX = -15 + Math.random() * 8;
            p._velY = 15 + Math.random() * 20;
            p.setAlpha(0.4 + Math.random() * 0.3);
          } else {
            p.setTexture('dust');
            p._velX = -10 + Math.random() * 5;
            p._velY = 5 + Math.random() * 10;
            p.setAlpha(0.2 + Math.random() * 0.2);
          }
        }
        return;
      }

      // Update
      p.x += p._velX * dt;
      p.y += p._velY * dt;
      p._life -= dt;
      p.x += Math.sin(time / 500 + p.x * 0.01) * 0.4;

      if (p._life <= 0 || p.y > GAME_CONFIG.WORLD_HEIGHT || p.x < cam.scrollX - 100) {
        p._active = false;
        p.setAlpha(0);
      }
    });
  }

  _spawnDustTrail() {
    const p = this.atmosParticles.find(q => !q._active);
    if (!p || Math.random() > 0.35) return;
    p._active = true;
    p.setTexture('dust');
    const roadY = this.getRoadY(this.worldPosition);
    p.x = this.worldPosition - 22 + Math.random() * 8;
    p.y = roadY + Math.random() * 4;
    p._velX = -25 - Math.random() * 25;
    p._velY = -4 - Math.random() * 8;
    p._life = 0.4 + Math.random() * 0.4;
    p.setAlpha(0.18 + Math.random() * 0.12);
    p.setScale(0.5 + Math.random() * 0.5);
    p.setDepth(48);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN UPDATE LOOP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  update(time, delta) {
    const { power, cadence } = this.currentMetrics;
    const dt = delta / 1000;

    // ── Movement ──
    const speedFactor = power > 0
      ? GAME_CONFIG.AVATAR_BASE_SPEED + power * GAME_CONFIG.POWER_SPEED_FACTOR
      : 0;
    const clampedSpeed = Math.min(speedFactor, GAME_CONFIG.AVATAR_MAX_SPEED);

    if (clampedSpeed > 0) {
      this.worldPosition += clampedSpeed;
    }

    // ── Elevation sampling ──
    if (this.worldPosition - this.lastElevationSampleX >= GAME_CONFIG.ELEVATION_SAMPLE_DIST) {
      this.sampleElevation();
    }

    // ── Smooth current elevation ──
    const targetElev = this.getElevationAt(this.worldPosition);
    this.currentElevation += (targetElev - this.currentElevation) * 0.06;
    this.currentGrade = this.getGradeAt(this.worldPosition);

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

    // ── Jersey color ──
    const jerseyMap = { interval_on: 'red', warmup: 'yellow', recovery: 'green' };
    this.cyclistJersey = jerseyMap[this.currentSegment.type] || 'blue';

    // ── Position cyclist on road at current elevation ──
    const roadY = this.getRoadY(this.worldPosition);
    this.cyclistSprite.setTexture(`cyclist_${this.cyclistJersey}_${this.frameIndex}`);
    this.cyclistSprite.x = this.worldPosition;
    this.cyclistSprite.y = roadY - 6;

    // Tilt cyclist on hills
    const tiltAngle = Phaser.Math.Clamp(this.currentGrade * 0.7, -15, 15);
    this.cyclistSprite.setAngle(-tiltAngle);

    // ── HR Glow ──
    const hr = this.currentMetrics.heart_rate;
    if (hr > 0) {
      let glowTex = 'glow_green', glowA = 0.25;
      if (hr >= 170) { glowTex = 'glow_red'; glowA = 0.55; }
      else if (hr >= 150) { glowTex = 'glow_orange'; glowA = 0.45; }
      else if (hr >= 120) { glowTex = 'glow_yellow'; glowA = 0.35; }
      this.hrGlow.setTexture(glowTex);
      this.hrGlow.setAlpha(glowA + Math.sin(time / 400) * 0.08);
      this.hrGlow.x = this.worldPosition;
      this.hrGlow.y = roadY - 35;
      this.hrGlow.setScale(1.1 + Math.sin(time / 600) * 0.12);
    } else {
      this.hrGlow.setAlpha(0);
    }

    // ── Camera: smooth follow ──
    const targetCamX = this.worldPosition - this.cameras.main.width * 0.35;
    this.cameras.main.scrollX += (targetCamX - this.cameras.main.scrollX) * 0.08;

    // ── Sky zone switching ──
    const zoneIdx = this.getZoneIndex(this.worldPosition);
    if (zoneIdx !== this.currentSkyIndex) {
      this.skyImages[this.currentSkyIndex].setVisible(false);
      this.skyImages[zoneIdx].setVisible(true);
      this.currentSkyIndex = zoneIdx;
    }
    const zone = GAME_CONFIG.ZONES[zoneIdx];
    this.zoneLabel.setText(zone.name);

    // ── Grade indicator ──
    const gradePct = Math.abs(this.currentGrade);
    if (gradePct > 0.5) {
      const isUphill = this.currentGrade > 0;
      this.gradeText.setText(`${gradePct.toFixed(1)}%`);
      this.gradeText.setColor(isUphill ? '#ff8866' : '#66ddaa');
      this.gradeArrow.setText(isUphill ? '\u25b2' : '\u25bc');
      this.gradeArrow.setColor(isUphill ? '#ff8866' : '#66ddaa');
      this.gradeText.setAlpha(Math.min(gradePct / 3, 0.9));
      this.gradeArrow.setAlpha(Math.min(gradePct / 3, 0.9));
    } else {
      this.gradeText.setAlpha(0);
      this.gradeArrow.setAlpha(0);
    }

    // ── Dynamic road + ground ──
    this._drawRoad();

    // ── Chunk generation / cleanup ──
    this._updateChunks();

    // ── Background layers ──
    this._ensureMountains();
    this._ensureClouds();
    this._ensureHills();

    // ── Animated clouds ──
    this.cloudPool.forEach(c => { c.x += c._driftSpeed * dt; });

    // ── Birds ──
    this.birds.forEach(b => {
      b.x += b._speed * dt;
      b.y = b._baseY + Math.sin(time / 1000 * b._flapSpeed + b._phase) * 7;
      b.setScale(0.7 + Math.sin(time / 300 * b._flapSpeed + b._phase) * 0.2, 0.7);
      // Recycle birds that fly off screen
      if (b.x * b.scrollFactorX > this.cameras.main.scrollX + this.cameras.main.width + 200) {
        b.x = (this.cameras.main.scrollX - 200) / b.scrollFactorX;
        b._baseY = 30 + Math.random() * 180;
      }
    });

    // ── Water tile animation ──
    this.activeChunks.forEach(chunk => {
      chunk.sprites.forEach(s => {
        if (s._isWater) {
          s.tilePositionX = time / 50;
          s.tilePositionY = Math.sin(time / 1000) * 2;
        }
      });
    });

    // ── Atmospheric particles ──
    this._updateParticles(time, dt);

    // ── Dust trail ──
    if (clampedSpeed > 2) this._spawnDustTrail();

    // ── Power bar ──
    this._drawPowerBar();

    // ── Other riders ──
    this._updateOtherRiders();

    // ── Achievements ──
    this._checkAchievements();
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

    const maxPower = Math.max(target * 1.5, 400);
    const barW = 220, barH = 6;
    const x = this.cameras.main.width / 2 - barW / 2;
    const y = this.cameras.main.height - 25;

    g.fillStyle(0x000000, 0.3);
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
        const riderX = rider.position || 100;
        const riderRoadY = this.getRoadY(riderX);
        const sprite = this.add.image(riderX, riderRoadY - 8, 'cyclist_ghost_0')
          .setOrigin(0.5, 1).setScale(GAME_CONFIG.CYCLIST_SCALE).setDepth(45);
        const label = this.add.text(riderX, riderRoadY - 80, rider.username || 'Rider', {
          fontSize: '9px', fontFamily: 'monospace', color: '#aabbff',
          backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(46);
        this.otherRiderSprites[rider.user_id] = { sprite, label };
      }

      const rs = this.otherRiderSprites[rider.user_id];
      if (rider.position !== undefined) {
        const tx = rider.position;
        rs.sprite.x = Phaser.Math.Linear(rs.sprite.x, tx, 0.08);
        rs.sprite.y = this.getRoadY(rs.sprite.x) - 8;
        rs.label.x = rs.sprite.x;
        rs.label.y = rs.sprite.y - 72;
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
