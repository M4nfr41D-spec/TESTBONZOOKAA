// ============================================================
// PARTICLES.js - Particle Effects System
// ============================================================

import { State } from './State.js';

export const Particles = {
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
        ctx.font = `bold ${p.size}px 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
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
