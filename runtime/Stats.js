// ============================================================
// STATS.js - Player Stats Calculator
// ============================================================
// Calculates final player stats from: Base + Meta + Skills + Equipment + RunUpgrades

import { State } from './State.js';

export const Stats = {
  // Recalculate all player stats
  calculate() {
    const p = State.player;
    const m = State.meta;
    const r = State.run;
    const data = State.data;
    
    if (!data.config) {
      console.warn('Stats.calculate: No config data loaded');
      return;
    }
    
    const cfg = data.config.player;
    
    // ========== BASE VALUES ==========
    p.maxHP = cfg.baseHP;
    p.damage = cfg.baseDamage;
    p.speed = cfg.baseSpeed;
    p.fireRate = cfg.baseFireRate;
    p.critChance = cfg.baseCritChance;
    p.critDamage = cfg.baseCritDamage;
    p.pickupRadius = cfg.basePickupRadius;
    p.maxShield = 0;
    p.piercing = 0;
    p.projectiles = 1;
    p.luck = 0;
    p.hpRegen = 0;
    p.shieldRegen = 0;
    
    // ========== PILOT STATS (flat bonuses) ==========
    if (data.pilotStats) {
      for (const [statId, points] of Object.entries(m.stats)) {
        const statDef = data.pilotStats[statId];
        if (statDef && points > 0) {
          this.applyStat(statDef.effect.stat, statDef.effect.perPoint * points, 'flat');
        }
      }
    }
    
    // ========== SKILL TREE BONUSES (percent bonuses) ==========
    if (data.skills) {
      for (const [treeId, tree] of Object.entries(data.skills)) {
        const learned = m.skills[treeId] || {};
        for (const [skillId, rank] of Object.entries(learned)) {
          if (rank > 0 && tree.skills[skillId]) {
            const skill = tree.skills[skillId];
            if (skill.effect) {
              this.applyStat(skill.effect.stat, skill.effect.perRank * rank, 'percent');
            }
          }
        }
      }
    }
    
    // ========== EQUIPMENT BONUSES ==========
    for (const [slotId, itemId] of Object.entries(m.equipment)) {
      if (!itemId) continue;
      
      const item = m.stash.find(i => i.id === itemId);
      if (!item) continue;
      
      // Base stats
      for (const [stat, value] of Object.entries(item.stats || {})) {
        this.applyStat(stat, value, 'flat');
      }
      
      // Affix bonuses
      for (const affix of item.affixes || []) {
        this.applyStat(affix.stat, affix.value, 'flat');
      }
    }
    
    // ========== RUN UPGRADES (percent bonuses) ==========
    if (data.runUpgrades) {
      for (const [upgradeId, tier] of Object.entries(r.upgrades)) {
        if (tier > 0 && data.runUpgrades[upgradeId]) {
          const upgrade = data.runUpgrades[upgradeId];
          if (upgrade.effect) {
            this.applyStat(upgrade.effect.stat, upgrade.effect.perTier * tier, 'percent');
          }
        }
      }
    }
    
    // ========== ENSURE MINIMUMS ==========
    p.maxHP = Math.max(1, Math.round(p.maxHP));
    p.damage = Math.max(1, Math.round(p.damage * 10) / 10);
    p.speed = Math.max(50, Math.round(p.speed));
    p.fireRate = Math.max(0.5, Math.round(p.fireRate * 10) / 10);
    p.critChance = Math.min(100, Math.max(0, p.critChance));
    p.critDamage = Math.max(100, p.critDamage);
    p.projectiles = Math.max(1, Math.floor(p.projectiles));
    p.piercing = Math.max(0, Math.floor(p.piercing));
    p.pickupRadius = Math.max(20, Math.round(p.pickupRadius));
    
    // Cap HP if needed
    if (p.hp > p.maxHP) p.hp = p.maxHP;
    if (p.shield > p.maxShield) p.shield = p.maxShield;
    
    console.log('📊 Stats calculated:', {
      hp: p.maxHP,
      damage: p.damage,
      fireRate: p.fireRate,
      speed: p.speed,
      crit: p.critChance + '%'
    });
  },
  
  // Apply a stat bonus
  applyStat(stat, value, type = 'flat') {
    const p = State.player;
    
    // Percent bonuses multiply, flat bonuses add
    if (type === 'percent') {
      value = value / 100;
    }
    
    switch (stat) {
      case 'damage':
        if (type === 'percent') p.damage *= (1 + value);
        else p.damage += value;
        break;
      case 'fireRate':
        if (type === 'percent') p.fireRate *= (1 + value);
        else p.fireRate += value;
        break;
      case 'speed':
        if (type === 'percent') p.speed *= (1 + value);
        else p.speed += value;
        break;
      case 'maxHP':
        if (type === 'percent') p.maxHP *= (1 + value);
        else p.maxHP += value;
        break;
      case 'shieldCap':
        if (type === 'percent') p.maxShield *= (1 + value);
        else p.maxShield += value;
        break;
      case 'critChance':
        p.critChance += value * (type === 'percent' ? 100 : 1);
        break;
      case 'critDamage':
        p.critDamage += value * (type === 'percent' ? 100 : 1);
        break;
      case 'piercing':
        p.piercing += value;
        break;
      case 'projectiles':
        p.projectiles += value;
        break;
      case 'luck':
        p.luck += value;
        break;
      case 'pickupRadius':
        if (type === 'percent') p.pickupRadius *= (1 + value);
        else p.pickupRadius += value;
        break;
      case 'hpRegen':
        p.hpRegen += value;
        break;
      case 'shieldRegen':
        p.shieldRegen += value;
        break;
      case 'dropRate':
        p.luck += value; // Treat as luck for simplicity
        break;
      // Add more stats as needed
    }
  },
  
  // Initialize player HP/Shield on run start
  initializeHP() {
    const p = State.player;
    p.hp = p.maxHP;
    p.shield = p.maxShield;
  },
  
  // Get DPS calculation for display
  getDPS() {
    const p = State.player;
    const baseDPS = p.damage * p.fireRate * p.projectiles;
    const critMult = 1 + (p.critChance / 100) * ((p.critDamage - 100) / 100);
    return Math.round(baseDPS * critMult);
  }
};

export default Stats;
