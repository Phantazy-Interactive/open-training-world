export const GAME_CONFIG = {
  WORLD_HEIGHT: 700,

  // ── Ship ──
  SHIP_X_RATIO: 0.3,        // ship sits at 30% from left edge
  SHIP_BASE_Y: 350,         // vertical center
  SHIP_SCALE: 2.0,
  SHIP_BOB_AMOUNT: 8,       // gentle vertical float
  SHIP_BOB_SPEED: 0.8,

  // ── Speed / movement ──
  AVATAR_BASE_SPEED: 0.5,
  AVATAR_MAX_SPEED: 8,
  POWER_SPEED_FACTOR: 0.02,

  // ── Star layers ──
  STAR_LAYERS: [
    { count: 120, speed: 0.15, sizeMin: 0.5, sizeMax: 1.2, alpha: 0.3 },  // far
    { count: 80,  speed: 0.4,  sizeMin: 0.8, sizeMax: 2.0, alpha: 0.5 },  // mid
    { count: 50,  speed: 0.8,  sizeMin: 1.0, sizeMax: 2.5, alpha: 0.7 },  // near
  ],

  // ── Space zones (cycle endlessly) ──
  ZONE_WIDTH: 5000,
  ZONES: [
    {
      name: 'Deep Space',
      bgTop: [0x04, 0x06, 0x18],     // near black
      bgBot: [0x0c, 0x14, 0x32],     // dark blue
      nebulaColor: 'rgba(60,80,180,0.06)',
      nebulaAccent: 'rgba(100,60,200,0.04)',
      ambientParticle: 'particle_blue',
    },
    {
      name: 'Sapphire Nebula',
      bgTop: [0x08, 0x0a, 0x24],
      bgBot: [0x14, 0x1e, 0x48],
      nebulaColor: 'rgba(40,100,220,0.1)',
      nebulaAccent: 'rgba(120,40,200,0.08)',
      ambientParticle: 'particle_purple',
    },
    {
      name: 'Ember Drift',
      bgTop: [0x12, 0x06, 0x04],
      bgBot: [0x30, 0x14, 0x0c],
      nebulaColor: 'rgba(220,100,40,0.08)',
      nebulaAccent: 'rgba(200,60,80,0.06)',
      ambientParticle: 'particle_orange',
    },
    {
      name: 'Aurora Passage',
      bgTop: [0x04, 0x12, 0x10],
      bgBot: [0x0c, 0x2a, 0x28],
      nebulaColor: 'rgba(40,200,160,0.08)',
      nebulaAccent: 'rgba(60,120,220,0.06)',
      ambientParticle: 'particle_cyan',
    },
    {
      name: 'Void Rift',
      bgTop: [0x0a, 0x04, 0x14],
      bgBot: [0x1e, 0x0c, 0x30],
      nebulaColor: 'rgba(160,40,220,0.1)',
      nebulaAccent: 'rgba(220,40,120,0.07)',
      ambientParticle: 'particle_pink',
    },
  ],

  // ── Effort → environment intensity ──
  // Higher FTP% = more asteroids, screen effects, visual intensity
  EFFORT_THRESHOLDS: {
    calm:      55,   // below this: serene open space
    moderate:  75,   // gentle obstacles
    hard:      95,   // asteroid field
    intense:   110,  // dense field + screen tint
    maximum:   130,  // warp-like tunnel effect
  },

  // ── Asteroid generation ──
  ASTEROID_SPAWN_BASE: 0.005,    // base chance per frame at moderate effort
  ASTEROID_SPAWN_SCALE: 0.003,   // additional chance per 10% FTP above moderate

  // ── Chunk system (for spawning objects) ──
  CHUNK_WIDTH: 600,
  GENERATE_AHEAD: 3,
  KEEP_BEHIND: 2,
};
