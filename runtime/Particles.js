// ============================================================
// PARTICLES.js - Particle Effects System
// ============================================================

import { State } from './State.js';

export const Particles = {
  // Generic spawn by type
  spawn(x, y, type) {
    switch(type) {
      case 'muzzle':
        this.sparks(x, y, '#00ffff', 4);
        break;
      case 'playerHit':
        this.sparks(x, y, '#ff6666', 6);
        break;
      case 'explosion':
        this.explosion(x, y, '#ff4444', 20, 200);
        break;
      case 'heal':
        this.ring(x, y, '#00ff00', 20);
        break;
      case 'levelUp':
        this.explosion(x, y, '#ffff00', 30, 250);
        this.ring(x, y, '#ffff00', 40);
        break;
      default:
        // Basic particle
        State.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 0.3,
          maxLife: 0.3,
          color: '#ffffff',
          size: 3
        });
    }
  },
  
  // Update all particles
  update(dt) {
    for (let i = State.particles.length - 1; i >= 0; i--) {
      const p = State.particles[i];
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      
      // Gravity for some particles
      if (p.gravity) {
        p.vy += 200 * dt;
      }
      
      // Friction
      if (p.friction) {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }
      
      if (p.life <= 0) {
        State.particles.splice(i, 1);
      }
    }
    
    // Limit particle count for performance
    const maxParticles = 300;
    if (State.particles.length > maxParticles) {
      State.particles.splice(0, State.particles.length - maxParticles);
    }
  },
  
  // Draw all particles
  draw(ctx) {
    for (const p of State.particles) {
      const alpha = Math.min(1, (p.life / p.maxLife) * 2);
      ctx.globalAlpha = alpha;
      
      if (p.isText) {
        // Text particle (damage numbers, pickup text)
        // Punch animation: scale up then down
        let scale = 1.0;
        if (p.scale && p.scale > 1) {
          const progress = 1 - (p.life / p.maxLife);
          if (progress < 0.15) {
            // Scale up quickly
            scale = 1 + (p.scale - 1) * (progress / 0.15);
          } else {
            // Scale back down
            scale = p.scale - (p.scale - 1) * ((progress - 0.15) / 0.85);
          }
        }
        
        const fontSize = Math.round(p.size * scale);
        ctx.font = `bold ${fontSize}px 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isCrit ? 15 : 5;
        
        // Outline for better readability
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
        ctx.shadowBlur = 0;
      } else {
        // Regular particle
        const size = p.size * Math.min(1, p.life / p.maxLife * 2);
        
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = size * 2;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.globalAlpha = 1;
  },
  
  // Spawn explosion effect
  explosion(x, y, color, count = 15, speed = 150) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.5);
      
      State.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: color,
        size: 2 + Math.random() * 4,
        friction: true
      });
    }
  },
  
  // Spawn spark effect
  sparks(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      State.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100 - 50,
        life: 0.15 + Math.random() * 0.15,
        maxLife: 0.3,
        color: color,
        size: 2 + Math.random() * 2,
        gravity: true
      });
    }
  },
  
  // Spawn ring effect
  ring(x, y, color, radius = 30) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      State.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50,
        life: 0.3,
        maxLife: 0.3,
        color: color,
        size: 3
      });
    }
  },
  
  // Spawn trail effect (for bullets, etc)
  trail(x, y, color, size = 3) {
    State.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * 20 + 10,
      life: 0.1 + Math.random() * 0.1,
      maxLife: 0.2,
      color: color,
      size: size * (0.5 + Math.random() * 0.5)
    });
  },
  
  // Spawn floating text
  text(x, y, text, color, size = 14) {
    State.particles.push({
      x: x,
      y: y,
      vx: 0,
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      text: text,
      isText: true,
      color: color,
      size: size
    });
  },
  
  // Clear all particles
  clear() {
    State.particles = [];
  }
};

export default Particles;
