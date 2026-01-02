// ============================================================
// State.js - Single Source of Truth
// ============================================================

export const State = {
  // Loaded JSON data
  data: {
    config: null,
    items: null,
    rarities: null,
    affixes: null,
    skills: null,
    pilotStats: null,
    enemies: null,
    runUpgrades: null,
    slots: null
  },
  
  // Persistent meta progress (saved to localStorage)
  meta: {
    scrap: 0,
    level: 1,
    xp: 0,
    skillPoints: 0,
    statPoints: 0,
    skills: {},       // { treeId: { skillId: rank } }
    stats: {},        // { statId: points }
    equipment: {},    // { slotId: itemId }
    stash: [],        // Array of item objects
    highestWave: 0,
    totalRuns: 0,
    totalKills: 0,
    totalPlaytime: 0
  },
  
  // Current run state (reset each run)
  run: {
    active: false,
    wave: 0,
    cells: 0,
    scrapEarned: 0,
    xpEarned: 0,
    upgrades: {},     // { upgradeId: tier }
    stats: {
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      timeElapsed: 0
    }
  },
  
  // Player state
  player: {
    x: 0, y: 0,
    vx: 0, vy: 0,
    angle: 0,         // Rotation toward mouse
    radius: 18,
    
    // Stats (calculated by Stats.js)
    maxHP: 100,
    hp: 100,
    maxShield: 0,
    shield: 0,
    damage: 10,
    fireRate: 3,
    speed: 280,
    critChance: 5,
    critDamage: 150,
    projectiles: 1,
    piercing: 0,
    spread: 0,
    bulletSpeed: 600,
    luck: 0,
    pickupRadius: 50,
    
    // Cooldowns
    fireCooldown: 0,
    shieldRegenDelay: 0
  },
  
  // Input state
  input: {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    mouseX: 0,
    mouseY: 0
  },
  
  // Game objects
  bullets: [],
  enemyBullets: [],
  enemies: [],
  pickups: [],
  particles: [],
  
  // UI state
  ui: {
    paused: false,
    tooltip: null,
    selectedItem: null
  }
};

// Reset run state
export function resetRun() {
  State.run = {
    active: false,
    wave: 0,
    cells: 0,
    scrapEarned: 0,
    xpEarned: 0,
    upgrades: {},
    stats: { kills: 0, damageDealt: 0, damageTaken: 0, timeElapsed: 0 }
  };
  State.bullets = [];
  State.enemyBullets = [];
  State.enemies = [];
  State.pickups = [];
  State.particles = [];
}

// Reset player position
export function resetPlayer(canvasW, canvasH) {
  State.player.x = canvasW / 2;
  State.player.y = canvasH * 0.7;
  State.player.vx = 0;
  State.player.vy = 0;
  State.player.angle = -Math.PI / 2; // Point up
  State.player.fireCooldown = 0;
  State.player.shieldRegenDelay = 0;
}

export default State;
