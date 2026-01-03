// ============================================================
// ENEMIES.js - Enemy System
// ============================================================

import { State } from './State.js';

export const Enemies = {
  // Spawn an enemy
  spawn(type, x, y, isElite = false, isBoss = false) {
    const enemyData = this.getEnemyData(type);
    if (!enemyData) {
      // Default fallback
      const enemy = this.createDefault(x, y, isElite, isBoss);
      State.enemies.push(enemy);
      return enemy;
    }
    
    const waveScale = 1 + State.run.wave * 0.05;
    
    const enemy = {
      id: 'e_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: type,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      hp: enemyData.hp * waveScale * (isElite ? 2 : 1) * (isBoss ? 5 : 1),
      maxHP: enemyData.hp * waveScale * (isElite ? 2 : 1) * (isBoss ? 5 : 1),
      damage: enemyData.damage * waveScale,
      speed: enemyData.speed,
      score: enemyData.score * (isElite ? 3 : 1) * (isBoss ? 10 : 1),
      xp: enemyData.xp * (isElite ? 2 : 1) * (isBoss ? 5 : 1),
      color: isElite ? '#ffaa00' : (isBoss ? '#ff3355' : enemyData.color),
      size: (isBoss ? 50 : (isElite ? 30 : 22)),
      isElite: isElite,
      isBoss: isBoss,
      pattern: enemyData.pattern,
      patternTime: 0,
      shootTimer: 2 + Math.random() * 2,
      shootInterval: isBoss ? 1.0 : (isElite ? 1.5 : 3),
      dead: false
    };
    
    State.enemies.push(enemy);
    return enemy;
  },
  
  // Create default enemy when data not found
  createDefault(x, y, isElite, isBoss) {
    return {
      id: 'e_' + Date.now(),
      type: 'default',
      x, y, vx: 0, vy: 0,
      hp: isBoss ? 200 : (isElite ? 60 : 20),
      maxHP: isBoss ? 200 : (isElite ? 60 : 20),
      damage: 10,
      speed: 80,
      score: 10,
      xp: 10,
      color: isBoss ? '#ff3355' : (isElite ? '#ffaa00' : '#44aa44'),
      size: isBoss ? 50 : (isElite ? 30 : 22),
      isElite, isBoss,
      pattern: 'straight',
      patternTime: 0,
      shootTimer: 3,
      shootInterval: 3,
      dead: false
    };
  },
  
  // Get enemy data from JSON
  getEnemyData(type) {
    const enemies = State.data.enemies;
    if (!enemies) return null;
    
    for (const category of ['basic', 'elite', 'bosses']) {
      if (enemies[category] && enemies[category][type]) {
        return enemies[category][type];
      }
    }
    return null;
  },
  
  // Spawn a wave
  spawnWave(wave, canvasWidth) {
    const w = canvasWidth || 800;
    const isBossWave = wave % 20 === 0;
    
    if (isBossWave) {
      this.spawn('sentinel', w / 2, -60, false, true);
      return;
    }
    
    // Get enemy pool for this wave
    const pool = this.getEnemyPool(wave);
    const count = 5 + Math.floor(wave * 0.8);
    const eliteChance = Math.min(0.25, wave * 0.01);
    
    for (let i = 0; i < count; i++) {
      const type = pool[Math.floor(Math.random() * pool.length)];
      const isElite = Math.random() < eliteChance;
      const x = 50 + Math.random() * (w - 100);
      const y = -30 - i * 40 - Math.random() * 30;
      this.spawn(type, x, y, isElite, false);
    }
  },
  
  // Get enemy pool for wave
  getEnemyPool(wave) {
    if (wave <= 5) return ['grunt'];
    if (wave <= 10) return ['grunt', 'scout'];
    if (wave <= 20) return ['grunt', 'scout', 'diver'];
    return ['scout', 'diver', 'tank'];
  },
  
  // Update all enemies
  update(dt, canvas) {
    for (const e of State.enemies) {
      if (e.dead) continue;
      
      e.patternTime += dt;
      this.applyPattern(e, dt, canvas);
      
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      
      // Off screen check
      if (e.y > canvas.height + 100 || e.x < -100 || e.x > canvas.width + 100) {
        e.dead = true;
        continue;
      }
      
      // Shooting
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && e.y > 30 && e.y < canvas.height * 0.6) {
        e.shootTimer = e.shootInterval + Math.random();
        this.shoot(e);
      }
    }
    
    State.enemies = State.enemies.filter(e => !e.dead);
  },
  
  // Apply movement pattern
  applyPattern(e, dt, canvas) {
    switch (e.pattern) {
      case 'zigzag':
        e.vy = e.speed * 0.5;
        e.vx = Math.sin(e.patternTime * 4) * e.speed;
        break;
      case 'dive':
        e.vy = e.patternTime < 1.5 ? e.speed * 0.3 : e.speed * 2;
        break;
      case 'snake':
        e.vy = e.speed * 0.5;
        e.vx = Math.sin(e.patternTime * 3) * e.speed * 0.8;
        break;
      case 'charge':
        if (e.patternTime > 1) {
          const p = State.player;
          const dx = p.x - e.x, dy = p.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            e.vx = (dx / dist) * e.speed * 1.5;
            e.vy = (dy / dist) * e.speed * 1.5;
          }
        } else {
          e.vy = e.speed * 0.2;
        }
        break;
      default:
        e.vy = e.speed;
    }
    
    // Keep on screen
    if (e.x < 30) e.vx = Math.abs(e.vx);
    if (e.x > canvas.width - 30) e.vx = -Math.abs(e.vx);
  },
  
  // Enemy shoots
  shoot(e) {
    const p = State.player;
    const dx = p.x - e.x, dy = p.y - e.y;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.2;
    const speed = 280;
    
    State.enemyBullets.push({
      x: e.x, y: e.y + e.size / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: e.damage,
      size: e.isBoss ? 8 : 5
    });
  },
  
  // Damage an enemy
  damage(enemy, amount, isCrit = false) {
    if (enemy.dead) return false;
    
    enemy.hp -= amount;
    State.run.stats.damageDealt += amount;
    
    // Hit particles
    for (let i = 0; i < (isCrit ? 10 : 5); i++) {
      State.particles.push({
        x: enemy.x + (Math.random() - 0.5) * enemy.size,
        y: enemy.y + (Math.random() - 0.5) * enemy.size,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        life: 0.25,
        maxLife: 0.3,
        color: isCrit ? '#ffff00' : enemy.color,
        size: isCrit ? 5 : 3
      });
    }
    
    if (enemy.hp <= 0) {
      return this.kill(enemy);
    }
    return null;
  },
  
  // Kill enemy
  kill(enemy) {
    enemy.dead = true;
    State.run.stats.kills++;
    if (enemy.isElite) State.run.stats.eliteKills++;
    if (enemy.isBoss) State.run.stats.bossKills++;
    
    // Death explosion
    const count = enemy.isBoss ? 40 : (enemy.isElite ? 25 : 15);
    for (let i = 0; i < count; i++) {
      State.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 250,
        vy: (Math.random() - 0.5) * 250,
        life: 0.4,
        maxLife: 0.5,
        color: enemy.color,
        size: 3 + Math.random() * 5
      });
    }
    
    return { x: enemy.x, y: enemy.y, xp: enemy.xp, isElite: enemy.isElite, isBoss: enemy.isBoss };
  },
  
  // Draw all enemies
  draw(ctx) {
    for (const e of State.enemies) {
      if (e.dead) continue;
      
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.isBoss ? 25 : (e.isElite ? 18 : 10);
      
      if (e.isBoss) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 - Math.PI / 2;
          const px = e.x + Math.cos(a) * e.size;
          const py = e.y + Math.sin(a) * e.size * 0.8;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - e.size);
        ctx.lineTo(e.x + e.size, e.y);
        ctx.lineTo(e.x, e.y + e.size);
        ctx.lineTo(e.x - e.size, e.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      
      // HP bar
      if (e.hp < e.maxHP) {
        const barW = e.size * 2;
        const pct = e.hp / e.maxHP;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - barW / 2, e.y - e.size - 12, barW, 6);
        ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(e.x - barW / 2 + 1, e.y - e.size - 11, (barW - 2) * pct, 4);
      }
    }
  }
};

export default Enemies;
