export const GAME_CONFIG = {
  // World dimensions
  WORLD_WIDTH: 20000,
  WORLD_HEIGHT: 600,
  VIEWPORT_HEIGHT: 600,

  // Zones (each zone is a distinct visual area)
  ZONES: [
    { name: 'Village', start: 0, end: 4000, ground: '#5a7247', sky: '#87CEEB', trees: true },
    { name: 'Forest', start: 4000, end: 8000, ground: '#3d5a1e', sky: '#6db0d4', trees: true, dense: true },
    { name: 'Lakeside', start: 8000, end: 12000, ground: '#4a7c59', sky: '#7ec8e3', lake: true },
    { name: 'Mountains', start: 12000, end: 16000, ground: '#6b7b5e', sky: '#a0c4e8', mountains: true },
    { name: 'Summit', start: 16000, end: 20000, ground: '#8899a6', sky: '#c4d8e8', snow: true },
  ],

  // Avatar
  AVATAR_Y: 420,
  AVATAR_BASE_SPEED: 0.5,
  AVATAR_MAX_SPEED: 8,

  // Power-to-speed mapping
  POWER_SPEED_FACTOR: 0.02,

  // Visual
  GROUND_Y: 470,
  PARALLAX_BG: 0.3,
  PARALLAX_MID: 0.6,
};
