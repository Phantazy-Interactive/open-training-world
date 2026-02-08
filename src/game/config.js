export const GAME_CONFIG = {
  // World is infinite - this only controls chunk generation buffer
  WORLD_HEIGHT: 700,

  // ── Chunk-based terrain generation ──
  CHUNK_WIDTH: 600,          // each generated terrain chunk is 600px wide
  GENERATE_AHEAD: 3,         // generate 3 chunks ahead of camera
  KEEP_BEHIND: 2,            // keep 2 chunks behind camera before recycling
  ELEVATION_SAMPLE_DIST: 150, // sample new elevation point every 150px of travel

  // ── Zones cycle endlessly ──
  ZONE_WIDTH: 4000,          // each zone lasts 4000px
  ZONES: [
    {
      name: 'Coastal Village',
      skyTop: [0x1a, 0x5f, 0x7a],
      skyBot: [0xb8, 0xdb, 0xe8],
      groundTop: [0x5b, 0x8c, 0x5a],
      groundBot: [0x3a, 0x5a, 0x3a],
      treeTypes: ['tree_oak_1', 'tree_birch_1', 'tree_birch_2'],
      treeDensity: 0.5,
      hasHouses: true,
      hasLake: false,
    },
    {
      name: 'Birch Forest',
      skyTop: [0x2a, 0x6b, 0x3a],
      skyBot: [0xa8, 0xd8, 0xb0],
      groundTop: [0x3d, 0x6b, 0x35],
      groundBot: [0x2a, 0x45, 0x25],
      treeTypes: ['tree_birch_1', 'tree_birch_2', 'tree_pine_1', 'tree_pine_2'],
      treeDensity: 0.8,
      hasHouses: false,
      hasLake: false,
    },
    {
      name: 'Lake District',
      skyTop: [0x20, 0x50, 0x80],
      skyBot: [0xc0, 0xdd, 0xf0],
      groundTop: [0x50, 0x80, 0x58],
      groundBot: [0x3a, 0x5a, 0x40],
      treeTypes: ['tree_pine_1', 'tree_birch_1', 'tree_oak_1'],
      treeDensity: 0.3,
      hasHouses: false,
      hasLake: true,
    },
    {
      name: 'Mountain Pass',
      skyTop: [0x35, 0x50, 0x70],
      skyBot: [0xb0, 0xc8, 0xd8],
      groundTop: [0x6a, 0x78, 0x60],
      groundBot: [0x4a, 0x55, 0x45],
      treeTypes: ['tree_pine_2', 'tree_pine_3', 'tree_dead_1'],
      treeDensity: 0.35,
      hasHouses: false,
      hasLake: false,
    },
    {
      name: 'Snow Summit',
      skyTop: [0x40, 0x55, 0x70],
      skyBot: [0xd5, 0xe0, 0xea],
      groundTop: [0x90, 0x98, 0xa0],
      groundBot: [0x60, 0x68, 0x70],
      treeTypes: ['tree_snow_1', 'tree_dead_1', 'tree_pine_3'],
      treeDensity: 0.2,
      hasHouses: false,
      hasLake: false,
    },
  ],

  // ── Avatar ──
  AVATAR_BASE_SPEED: 0.5,
  AVATAR_MAX_SPEED: 8,
  POWER_SPEED_FACTOR: 0.02,
  CYCLIST_SCALE: 1.8,

  // ── Layout baseline (modified by elevation) ──
  BASE_ROAD_Y: 510,
  ROAD_HEIGHT: 14,
  HORIZON_Y: 300,

  // ── Elevation mapping: FTP % → road Y offset ──
  // Negative = uphill (road moves up on screen)
  ELEVATION_MAP: [
    { ftp: 0,   offset: 50 },   // freewheeling downhill
    { ftp: 45,  offset: 35 },   // easy recovery downhill
    { ftp: 55,  offset: 15 },   // light downhill
    { ftp: 65,  offset: 0 },    // flat road (endurance)
    { ftp: 80,  offset: -35 },  // rolling hills (tempo)
    { ftp: 95,  offset: -75 },  // sustained climb (threshold)
    { ftp: 105, offset: -110 }, // steep climb (VO2max)
    { ftp: 120, offset: -150 }, // very steep (anaerobic)
    { ftp: 150, offset: -180 }, // wall (sprint)
  ],

  // ── Parallax speeds ──
  PARALLAX_FAR: 0.15,
  PARALLAX_MID: 0.4,
  PARALLAX_NEAR: 0.7,

  // Deterministic seed for consistent random patterns within chunks
  SEED: 42,
};
