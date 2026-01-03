// ============================================================
// PICKUPS.js - Loot and Currency Pickups
// ============================================================

import { State } from './State.js';
import { Items } from './Items.js';

export const Pickups = {
  // Update all pickups
  update(dt, canvas) {
    const p = State.player;
    
    for (let i = State.pickups.length - 1; i >= 0; i--) {
      const pk = State.pickups[i];
      
      // Gravity
      pk.vy += 100 * dt;
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      
      // Friction
      pk.vx *= 0.98;
      pk.vy *= 0.98;
      
      // Lifetime
      pk.life -= dt;
      if (pk.life <= 0) {
        State.pickups.splice(i, 1);
        continue;
      }
      
      // Magnet effect
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < p.pickupRadius) {
        const pull = (p.pickupRadius - dist) / p.pickupRadius * 500;
        pk.x += (dx / dist) * pull * dt;
        pk.y += (dy / dist) * pull * dt;
      }
      
      // Collection
      if (dist < 25) {
        this.collect(pk);
        State.pickups.splice(i, 1);
        continue;
      }
      
      // Keep on screen
      if (pk.y > canvas.height - 20) {
        pk.y = canvas.height - 20;
        pk.vy = -Math.abs(pk.vy) * 0.5;
      }
    }
  },
  
  // Collect a pickup
  collect(pickup) {
    switch (pickup.type) {
      case 'cells':
        State.run.cells += pickup.value;
        this.spawnCollectEffect(pickup.x, pickup.y, '#00d4ff');
        this.spawnFloatText(pickup.x, pickup.y, `+${pickup.value}⚡`, '#00d4ff');
        break;
        
      case 'scrap':
        State.run.scrapEarned += pickup.value;
        this.spawnCollectEffect(pickup.x, pickup.y, '#ffd700');
        this.spawnFloatText(pickup.x, pickup.y, `+${pickup.value}💰`, '#ffd700');
        break;
        
      case 'item':
        const item = Items.generateRandom(pickup.rarity);
        if (item) {
          const added = Items.addToStash(item);
          if (added) {
            this.spawnCollectEffect(pickup.x, pickup.y, State.data.rarities[item.rarity]?.color || '#ffffff');
            this.spawnFloatText(pickup.x, pickup.y, item.name, State.data.rarities[item.rarity]?.color || '#ffffff');
          } else {
            // Stash full - convert to scrap
            const scrapValue = item.value;
            State.run.scrapEarned += scrapValue;
            this.spawnFloatText(pickup.x, pickup.y, `FULL! +${scrapValue}💰`, '#ff8800');
          }
        }
        break;
        
      case 'health':
        const healed = pickup.value || 25;
        State.player.hp = Math.min(State.player.maxHP, State.player.hp + healed);
        this.spawnCollectEffect(pickup.x, pickup.y, '#00ff88');
        this.spawnFloatText(pickup.x, pickup.y, `+${healed}❤️`, '#00ff88');
        break;
        
      case 'xp':
        import('./Leveling.js').then(module => {
          module.Leveling.addXP(pickup.value);
        });
        this.spawnCollectEffect(pickup.x, pickup.y, '#aa55ff');
        this.spawnFloatText(pickup.x, pickup.y, `+${pickup.value}XP`, '#aa55ff');
        break;
    }
  },
  
  // Spawn collection effect
  spawnCollectEffect(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      State.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 80,
        vy: Math.sin(angle) * 80,
        life: 0.25,
        maxLife: 0.25,
        color: color,
        size: 4
      });
    }
  },
  
  // Spawn floating text
  spawnFloatText(x, y, text, color) {
    State.particles.push({
      x: x,
      y: y - 10,
      vx: 0,
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      text: text,
      isText: true,
      color: color,
      size: 14
    });
  },
  
  // Draw all pickups
  draw(ctx) {
    for (const pk of State.pickups) {
      // Fade when about to expire
      ctx.globalAlpha = Math.min(1, pk.life * 2);
      
      // Pulse effect
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      
      switch (pk.type) {
        case 'cells':
          ctx.fillStyle = '#00d4ff';
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 8 * pulse, 0, Math.PI * 2);
          ctx.fill();
          
          // Lightning bolt symbol
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', pk.x, pk.y + 4);
          break;
          
        case 'scrap':
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 8 * pulse, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('$', pk.x, pk.y + 3);
          break;
          
        case 'item':
          const rarityColor = State.data.rarities?.[pk.rarity]?.color || '#ffffff';
          ctx.fillStyle = rarityColor;
          ctx.shadowColor = rarityColor;
          ctx.shadowBlur = 15;
          
          // Item drops are larger and more prominent
          ctx.beginPath();
          ctx.moveTo(pk.x, pk.y - 12 * pulse);
          ctx.lineTo(pk.x + 10 * pulse, pk.y);
          ctx.lineTo(pk.x, pk.y + 12 * pulse);
          ctx.lineTo(pk.x - 10 * pulse, pk.y);
          ctx.closePath();
          ctx.fill();
          
          // Rarity glow ring
          ctx.strokeStyle = rarityColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 16 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          break;
          
        case 'health':
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 8 * pulse, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+', pk.x, pk.y + 4);
          break;
          
        case 'xp':
          ctx.fillStyle = '#aa55ff';
          ctx.shadowColor = '#aa55ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 6 * pulse, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
};

export default Pickups;
