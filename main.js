// ============================================================
// MAIN.js - Desktop Game Controller
// ============================================================

import { State, resetRun, resetPlayer } from './runtime/State.js';
import { loadAllData } from './runtime/DataLoader.js';
import { Save } from './runtime/Save.js';
import { Stats } from './runtime/Stats.js';
import { Leveling } from './runtime/Leveling.js';
import { Items } from './runtime/Items.js';
import { Player } from './runtime/Player.js';
import { Enemies } from './runtime/Enemies.js';
import { Bullets } from './runtime/Bullets.js';
import { Pickups } from './runtime/Pickups.js';
import { Particles } from './runtime/Particles.js';
import { Input } from './runtime/Input.js';
import { UI } from './runtime/UI.js';
import { MapMeta } from './runtime/MapMeta.js';

// ============================================================
// GAME CONTROLLER
// ============================================================

const Game = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  stars: [],
  
  async init() {
    console.log('🚀 BONZOOKAA Desktop initializing...');
    
    // Setup canvas
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Load data
    await loadAllData();
    
    // Load save
    Save.load();

    // Init persistent map layer (acts/clusters/nodes)
    try { MapMeta.init(); } catch (e) { console.error('MapMeta.init failed', e); }
    
    // Initialize systems
    Input.init(this.canvas);
    UI.init();
    
    // Calculate stats
    Stats.calculate();
    
    // Create stars
    this.initStars();
    
    // Add starter items if new
    if (State.meta.stash.length === 0) {
      this.addStarterItems();
    }
    
    // Update start screen
    this.updateStartModal();
    
    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    
    console.log('✅ Desktop version ready');
  },
  
  resize() {
    const container = document.getElementById('gameContainer');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.initStars();
  },
  
  initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 40 + 15,
        brightness: Math.random() * 0.5 + 0.3
      });
    }
  },
  
  addStarterItems() {
    const starterWeapon = Items.generate('laser_cannon', 'common');
    const starterShield = Items.generate('energy_barrier', 'common');
    const starterEngine = Items.generate('ion_thruster', 'common');
    
    if (starterWeapon) Items.addToStash(starterWeapon);
    if (starterShield) Items.addToStash(starterShield);
    if (starterEngine) Items.addToStash(starterEngine);
    
    if (starterWeapon) Items.equip(starterWeapon.id);
    if (starterShield) Items.equip(starterShield.id);
    if (starterEngine) Items.equip(starterEngine.id);
    
    Stats.calculate();
    Save.save();
    UI.renderAll();
  },
  
  // Main loop
  loop(time) {
    try {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      
      // Clear
      this.ctx.fillStyle = '#050810';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Stars always
      this.updateStars(dt);
      this.drawStars();
      
      // Game logic
      if (State.run.active && !State.ui.paused) {
        this.update(dt);
        this.draw();
      }
    } catch (error) {
      console.error('❌ Error in game loop:', error);
    }
    
    requestAnimationFrame((t) => this.loop(t));
  },
  
  update(dt) {
    State.run.stats.timeElapsed += dt;
    
    Player.update(dt, this.canvas);
    
    if (Player.isDead()) {
      this.onDeath();
      return;
    }
    
    Enemies.update(dt, this.canvas);
    Bullets.update(dt, this.canvas);
    Pickups.update(dt, this.canvas);
    Particles.update(dt);
    
    // Wave complete
    if (State.enemies.length === 0 && State.run.wave > 0) {
      this.nextWave();
    }
    
    this.updateHUD();
  },
  
  draw() {
    Pickups.draw(this.ctx);
    Enemies.draw(this.ctx);
    Bullets.draw(this.ctx);
    Player.draw(this.ctx);
    Particles.draw(this.ctx);
  },
  
  updateStars(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      }
    }
  },
  
  drawStars() {
    for (const s of this.stars) {
      this.ctx.fillStyle = `rgba(255,255,255,${s.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },
  
  // ========== GAME FLOW ==========
  
  start() {
    console.log('🎮 Game.start() called');
    
    try {
      resetRun();
      State.run.active = true;
      State.run.wave = 0;
      
      Stats.calculate();
      Stats.initializeHP();
      
      resetPlayer(this.canvas.width, this.canvas.height);
      
      this.hideModal('startModal');
      this.nextWave();
      
      UI.renderAll();
      
      console.log('✅ Game started successfully');
    } catch (error) {
      console.error('❌ Error starting game:', error);
    }
  },
  
  nextWave() {
    State.run.wave++;
    
    // Vendor check
    const cfg = State.data.config?.waves;
    const vendorStart = cfg?.vendorStart || 5;
    const vendorInterval = cfg?.vendorInterval || 10;
    
    if (State.run.wave > vendorStart && (State.run.wave - vendorStart) % vendorInterval === 0) {
      this.openVendor();
      return;
    }
    
    // Announce
    const isBoss = State.run.wave % 20 === 0;
    this.announce(isBoss ? `👑 BOSS WAVE ${State.run.wave}` : `WAVE ${State.run.wave}`, isBoss ? 'boss' : '');
    
    Enemies.spawnWave(State.run.wave, this.canvas.width);
    this.updateHUD();
  },
  
  openVendor() {
    State.ui.paused = true;
    UI.renderVendor();
    this.showModal('vendorModal');
  },
  
  closeVendor() {
    this.hideModal('vendorModal');
    State.ui.paused = false;
    Stats.calculate();
    UI.renderShipStats();
    this.nextWave();
  },
  
  onDeath() {
    State.run.active = false;
    
    // Add earnings
    State.meta.scrap += State.run.scrapEarned;
    State.meta.totalRuns++;
    State.meta.totalKills += State.run.stats.kills;
    State.meta.totalPlaytime += State.run.stats.timeElapsed;
    
    if (State.run.wave > State.meta.highestWave) {
      State.meta.highestWave = State.run.wave;
    }
    
    Save.save();
    
    // Update death modal
    document.getElementById('deathWave').textContent = State.run.wave;
    document.getElementById('deathKills').textContent = State.run.stats.kills;
    document.getElementById('deathDmg').textContent = this.formatNumber(State.run.stats.damageDealt);
    document.getElementById('deathTime').textContent = this.formatTime(State.run.stats.timeElapsed);
    document.getElementById('deathScrapEarned').textContent = State.run.scrapEarned;
    document.getElementById('deathXP').textContent = State.run.xpEarned;
    
    this.showModal('deathModal');
  },
  
  restart() {
    this.hideModal('deathModal');
    this.start();
  },
  
  toMenu() {
    this.hideModal('deathModal');
    this.updateStartModal();
    this.showModal('startModal');
    UI.renderAll();
  },
  
  // ========== UI HELPERS ==========
  
  announce(text, type = '') {
    const el = document.getElementById('announcement');
    if (el) {
      el.textContent = text;
      el.className = 'show ' + type;
      setTimeout(() => el.className = '', 2000);
    }
  },
  
  updateHUD() {
    const p = State.player;
    
    document.getElementById('hudCells').textContent = State.run.cells;
    document.getElementById('hudScrap').textContent = State.meta.scrap + State.run.scrapEarned;
    document.getElementById('levelBadge').textContent = State.meta.level;
    document.getElementById('waveDisplay').textContent = `WAVE ${State.run.wave}`;
    
    // XP
    const xpProgress = Leveling.getProgress();
    const xpNeeded = Leveling.xpForLevel(State.meta.level);
    document.getElementById('xpBar').style.width = (xpProgress * 100) + '%';
    document.getElementById('xpText').textContent = `${State.meta.xp} / ${xpNeeded} XP`;
    
    // HP
    const hpPct = (p.hp / p.maxHP) * 100;
    const hpBar = document.getElementById('hpBar');
    hpBar.style.width = hpPct + '%';
    hpBar.className = 'player-bar-fill hp' + (hpPct < 30 ? ' low' : '');
    document.getElementById('hpText').textContent = `${Math.ceil(p.hp)}/${Math.round(p.maxHP)}`;
    
    // Shield
    const shPct = p.maxShield > 0 ? (p.shield / p.maxShield) * 100 : 0;
    document.getElementById('shieldBar').style.width = shPct + '%';
    document.getElementById('shieldText').textContent = `${Math.ceil(p.shield)}/${Math.round(p.maxShield)}`;
  },
  
  updateStartModal() {
    document.getElementById('startScrap').textContent = State.meta.scrap;
    document.getElementById('startLevel').textContent = State.meta.level;
    document.getElementById('startWave').textContent = State.meta.highestWave;
    document.getElementById('startRuns').textContent = State.meta.totalRuns;
  

    // Current node info + available connections
    try {
      const node = MapMeta.getCurrentNode?.() || null;
      const nameEl = document.getElementById('startNodeName');
      const tierEl = document.getElementById('startNodeTier');
      if (nameEl) nameEl.textContent = node ? `${node.id} (${node.type})` : '—';
      if (tierEl) tierEl.textContent = node ? node.tier : '—';
      this.renderNodeOptions();
    } catch (e) {
      console.warn('Node info render failed:', e);
    }

  },
  
  showModal(id) {
    document.getElementById(id)?.classList.add('active');
  },
  
  hideModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  renderNodeOptions() {
    const container = document.getElementById('startNodeOptions');
    if (!container) return;

    const cur = MapMeta.getCurrentNode?.();
    const connected = cur ? MapMeta.getConnected(cur.id) : [];

    container.innerHTML = '';

    // current node button (replay)
    if (cur) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = `Replay: ${cur.type} (Tier ${cur.tier})`;
      btn.onclick = () => this.selectNode(cur.id);
      container.appendChild(btn);
    }

    for (const n of connected) {
      if (!n) continue;
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = `Go: ${n.type} (Tier ${n.tier})`;
      btn.onclick = () => this.selectNode(n.id);
      container.appendChild(btn);
    }

    if (!cur) {
      const note = document.createElement('div');
      note.style.opacity = '0.8';
      note.textContent = 'No node selected.';
      container.appendChild(note);
    }
  },

  selectNode(nodeId) {
    const ok = MapMeta.setCurrentNode?.(nodeId);
    if (!ok) {
      this.announce?.('Node locked', 'bad');
      return;
    }
    Save.save?.();
    this.updateStartModal();
    this.announce?.('Node selected', 'good');
  },

  enterPortal() {
    // Called when player touches portal pickup after boss
    try {
      const nodeId = State.run.pendingNodeClear;
      if (nodeId) {
        MapMeta.markCleared(nodeId);
      }
      Save.save();

      // Return to base/start modal
      this.announce('Node cleared — returning to base', 'good');
      this.toMenu();
    } catch (e) {
      console.error('enterPortal failed', e);
      // fallback: at least go to menu
      this.toMenu();
    }
  },
,
  
  // ========== DEBUG ==========
  
  debugAddItems() {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (let i = 0; i < 8; i++) {
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const item = Items.generateRandom(rarity);
      if (item) Items.addToStash(item);
    }
    Save.save();
    UI.renderAll();
  },
  
  debugAddResources() {
    State.meta.scrap += 1000;
    State.meta.skillPoints += 10;
    State.meta.statPoints += 20;
    State.run.cells += 500;
    Save.save();
    this.updateStartModal();
    UI.renderAll();
  },
  
  // ========== FORMATTING ==========
  
  formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  },
  
  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
};

// Global
window.Game = Game;

// Init
document.addEventListener('DOMContentLoaded', () => Game.init());
