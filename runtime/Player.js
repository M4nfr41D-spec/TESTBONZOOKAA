// ============================================================
// Player.js - Player Controller (Desktop)
// ============================================================

import { State } from './State.js';
import { Input } from './Input.js';
import { Bullets } from './Bullets.js';
import { Particles } from './Particles.js';

export const Player = {
  
  update(dt, canvas) {
    const p = State.player;
    
    // ========== MOVEMENT (WASD) ==========
    const move = Input.getMovement();
    
    const targetVX = move.dx * p.speed;
    const targetVY = move.dy * p.speed;
    
    // Smooth acceleration
    const accel = 1200;
    const smoothing = Math.min(1, accel * dt / p.speed);
    p.vx += (targetVX - p.vx) * smoothing;
    p.vy += (targetVY - p.vy) * smoothing;
    
    // Apply velocity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Boundary clamping
    const margin = p.radius + 5;
    p.x = Math.max(margin, Math.min(canvas.width - margin, p.x));
    p.y = Math.max(margin, Math.min(canvas.height - margin, p.y));
    
    // ========== AIM (Mouse) ==========
    p.angle = Input.getAimAngle(p.x, p.y);
    
    // ========== SHOOTING ==========
    p.fireCooldown -= dt;
    
    if (State.input.fire && p.fireCooldown <= 0) {
      this.fire();
      p.fireCooldown = 1 / p.fireRate;
    }
    
    // ========== SHIELD REGEN ==========
    p.shieldRegenDelay -= dt;
    if (p.shieldRegenDelay <= 0 && p.shield < p.maxShield) {
      const cfg = State.data.config?.player;
      const regenRate = cfg?.shieldRegenRate || 5;
      p.shield = Math.min(p.maxShield, p.shield + regenRate * dt);
    }
  },
  
  fire() {
    const p = State.player;
    const baseAngle = p.angle;
    const count = p.projectiles;
    const spreadRad = (p.spread || 0) * (Math.PI / 180);
    
    // Calculate angles for multiple projectiles
    let angles = [];
    if (count === 1) {
      angles = [baseAngle];
    } else {
      const totalSpread = spreadRad * (count - 1);
      const startAngle = baseAngle - totalSpread / 2;
      for (let i = 0; i < count; i++) {
        angles.push(startAngle + (spreadRad * i));
      }
    }
    
    // Spawn bullets
    for (const angle of angles) {
      Bullets.spawn({
        x: p.x + Math.cos(angle) * 20,
        y: p.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * p.bulletSpeed,
        vy: Math.sin(angle) * p.bulletSpeed,
        damage: p.damage,
        piercing: p.piercing,
        isPlayer: true,
        crit: Math.random() * 100 < p.critChance
      });
    }
    
    // Muzzle flash
    Particles.spawn(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, 'muzzle');
  },
  
  takeDamage(amount) {
    const p = State.player;
    State.run.stats.damageTaken += amount;
    
    // Shield absorbs first
    if (p.shield > 0) {
      const shieldDmg = Math.min(p.shield, amount);
      p.shield -= shieldDmg;
      amount -= shieldDmg;
      
      if (amount <= 0) {
        p.shieldRegenDelay = State.data.config?.player?.shieldRegenDelay || 3;
        return;
      }
    }
    
    p.hp -= amount;
    p.shieldRegenDelay = State.data.config?.player?.shieldRegenDelay || 3;
    
    // Hit particles
    Particles.spawn(p.x, p.y, 'playerHit');
    
    if (p.hp <= 0) {
      p.hp = 0;
      Particles.spawn(p.x, p.y, 'explosion');
    }
  },
  
  isDead() {
    return State.player.hp <= 0;
  },
  
  draw(ctx) {
    const p = State.player;
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2); // Ship sprite points up
    
    // Ship body
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-14, 16);
    ctx.lineTo(0, 10);
    ctx.lineTo(14, 16);
    ctx.closePath();
    
    // Gradient fill
    const grad = ctx.createLinearGradient(0, -20, 0, 16);
    grad.addColorStop(0, '#00ffaa');
    grad.addColorStop(1, '#005544');
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Engine glow when moving
    const isMoving = Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10;
    if (isMoving) {
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(0, 26 + Math.random() * 6);
      ctx.lineTo(8, 14);
      ctx.fillStyle = `rgba(0, 200, 255, ${0.6 + Math.random() * 0.4})`;
      ctx.fill();
    }
    
    ctx.restore();
    
    // Shield effect
    if (p.shield > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.2 + (p.shield / p.maxShield) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
};

export default Player;
