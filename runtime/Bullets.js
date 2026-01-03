// ============================================================
// BULLETS.js - Projectile System
// ============================================================

import { State } from './State.js';
import { Enemies } from './Enemies.js';
import { Player } from './Player.js';

export const Bullets = {
  // Update all bullets
  update(dt, canvas) {
    // Player bullets
    for (let i = State.bullets.length - 1; i >= 0; i--) {
      const b = State.bullets[i];
      
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      
      // Off screen
      if (b.y < -20 || b.y > canvas.height + 20 || b.x < -20 || b.x > canvas.width + 20) {
        State.bullets.splice(i, 1);
        continue;
      }
      
      // Check collision with enemies
      for (const e of State.enemies) {
        if (e.dead) continue;
        
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < b.size + e.size) {
          // Hit!
          const killData = Enemies.damage(e, b.damage, b.isCrit);
          
          // Spawn damage number
          this.spawnDamageNumber(b.x, b.y, b.damage, b.isCrit);
          
          // Handle kill rewards
          if (killData) {
            this.onEnemyKilled(killData);
          }
          
          b.hits++;
          if (b.hits > b.pierce) {
            State.bullets.splice(i, 1);
          }
          break;
        }
      }
    }
    
    // Enemy bullets
    for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
      const b = State.enemyBullets[i];
      
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      
      // Off screen
      if (b.y < -20 || b.y > canvas.height + 20 || b.x < -20 || b.x > canvas.width + 20) {
        State.enemyBullets.splice(i, 1);
        continue;
      }
      
      // Check collision with player
      const p = State.player;
      const dist = Math.hypot(b.x - p.x, b.y - p.y);
      if (dist < b.size + 15) {
        Player.takeDamage(b.damage);
        State.enemyBullets.splice(i, 1);
      }
    }
  },
  
  // Spawn floating damage number
  spawnDamageNumber(x, y, damage, isCrit) {
    State.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      vx: (Math.random() - 0.5) * 30,
      vy: -80,
      life: 0.7,
      maxLife: 0.7,
      text: Math.round(damage).toString(),
      isText: true,
      color: isCrit ? '#ffff00' : '#ffffff',
      size: isCrit ? 18 : 14
    });
  },
  
  // Handle enemy kill rewards
  onEnemyKilled(killData) {
    const cfg = State.data.config;
    
    // XP
    import('./Leveling.js').then(module => {
      module.Leveling.addXP(killData.xp);
    });
    
    // Cells
    const baseCells = cfg?.economy?.cellsPerKill || 3;
    let cells = baseCells;
    if (killData.isElite) cells *= 3;
    if (killData.isBoss) cells *= 10;
    State.run.cells += Math.floor(cells);
    
    // Scrap
    const baseScrap = cfg?.economy?.scrapPerKill || 5;
    let scrap = baseScrap;
    if (killData.isElite) scrap *= (cfg?.economy?.eliteScrapMult || 3);
    if (killData.isBoss) scrap *= (cfg?.economy?.bossScrapMult || 10);
    State.run.scrapEarned += Math.floor(scrap);
    
    // Loot drop check
    this.checkLootDrop(killData);
  },
  
  // Check for item drop
  checkLootDrop(killData) {
    const cfg = State.data.config?.loot;
    if (!cfg) return;
    
    let dropChance = cfg.baseDropChance || 0.03;
    if (killData.isElite) dropChance = cfg.eliteDropChance || 0.25;
    if (killData.isBoss) dropChance = cfg.bossDropChance || 1.0;
    
    // Apply luck
    dropChance *= (1 + State.player.luck * 0.02);
    
    if (Math.random() < dropChance) {
      // Spawn pickup
      State.pickups.push({
        type: 'item',
        x: killData.x,
        y: killData.y,
        vx: (Math.random() - 0.5) * 50,
        vy: -50 + Math.random() * 30,
        life: 10,
        rarity: killData.isBoss ? 'legendary' : (killData.isElite ? 'rare' : null)
      });
    }
    
    // Always drop cells pickup
    State.pickups.push({
      type: 'cells',
      x: killData.x + (Math.random() - 0.5) * 20,
      y: killData.y,
      vx: (Math.random() - 0.5) * 40,
      vy: -30 + Math.random() * 20,
      value: killData.isBoss ? 50 : (killData.isElite ? 20 : 5),
      life: 8
    });
    
    // Chance for scrap pickup
    if (Math.random() < 0.3 || killData.isElite || killData.isBoss) {
      State.pickups.push({
        type: 'scrap',
        x: killData.x + (Math.random() - 0.5) * 20,
        y: killData.y,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 + Math.random() * 20,
        value: killData.isBoss ? 100 : (killData.isElite ? 30 : 10),
        life: 10
      });
    }
  },
  
  // Draw all bullets
  draw(ctx) {
    // Player bullets
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    
    for (const b of State.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Trail
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = b.size * 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    ctx.shadowBlur = 0;
    
    // Enemy bullets
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    
    for (const b of State.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }
};

export default Bullets;
