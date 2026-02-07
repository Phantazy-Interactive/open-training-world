export const GAME_CONFIG = {
  // World dimensions
  WORLD_WIDTH: 20000,
  WORLD_HEIGHT: 700,
  VIEWPORT_HEIGHT: 700,

  // Zones (each zone is a distinct visual area)
  ZONES: [
    {
      name: 'Coastal Village',
      start: 0, end: 4000,
      skyTop: [0x1a, 0x5f, 0x7a],    // deep teal
      skyBot: [0xb8, 0xdb, 0xe8],    // pale blue
      groundTop: [0x5b, 0x8c, 0x5a], // soft green
      groundBot: [0x3a, 0x5a, 0x3a], // dark green
      roadColor: 0x9e8e7e,
      fogColor: 0xc8dce8,
      fogAlpha: 0.15,
    },
    {
      name: 'Birch Forest',
      start: 4000, end: 8000,
      skyTop: [0x2a, 0x6b, 0x3a],    // forest green sky
      skyBot: [0xa8, 0xd8, 0xb0],    // light green
      groundTop: [0x3d, 0x6b, 0x35], // rich green
      groundBot: [0x2a, 0x45, 0x25], // deep forest
      roadColor: 0x7a6b5a,
      fogColor: 0x8ab88a,
      fogAlpha: 0.1,
    },
    {
      name: 'Lake District',
      start: 8000, end: 12000,
      skyTop: [0x20, 0x50, 0x80],    // steel blue
      skyBot: [0xc0, 0xdd, 0xf0],    // pale sky
      groundTop: [0x50, 0x80, 0x58], // lakeshore green
      groundBot: [0x3a, 0x5a, 0x40], // dark green
      roadColor: 0x8a7a6a,
      fogColor: 0xb0d0e8,
      fogAlpha: 0.2,
    },
    {
      name: 'Mountain Pass',
      start: 12000, end: 16000,
      skyTop: [0x35, 0x50, 0x70],    // mountain blue
      skyBot: [0xb0, 0xc8, 0xd8],    // misty blue
      groundTop: [0x6a, 0x78, 0x60], // rocky green
      groundBot: [0x4a, 0x55, 0x45], // dark rock
      roadColor: 0x8a8075,
      fogColor: 0xa0b8c8,
      fogAlpha: 0.25,
    },
    {
      name: 'Snow Summit',
      start: 16000, end: 20000,
      skyTop: [0x40, 0x55, 0x70],    // cold blue
      skyBot: [0xd5, 0xe0, 0xea],    // near-white
      groundTop: [0x90, 0x98, 0xa0], // grey rock
      groundBot: [0x60, 0x68, 0x70], // dark grey
      roadColor: 0x98908a,
      fogColor: 0xd8e0e8,
      fogAlpha: 0.3,
    },
  ],

  // Avatar
  AVATAR_BASE_SPEED: 0.5,
  AVATAR_MAX_SPEED: 8,
  POWER_SPEED_FACTOR: 0.02,

  // Layout
  ROAD_Y: 510,       // where the road surface sits
  ROAD_HEIGHT: 12,
  GROUND_TOP: 522,    // where terrain begins below road
  HORIZON_Y: 300,     // horizon line for sky/bg split

  // Parallax speeds
  PARALLAX_FAR: 0.15,
  PARALLAX_MID: 0.4,
  PARALLAX_NEAR: 0.7,

  // Cyclist
  CYCLIST_SCALE: 1.8,

  // Terrain generation seeds (deterministic)
  SEED: 42,
};
