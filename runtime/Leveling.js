// ============================================================
// LEVELING.js - XP and Level Up System
// ============================================================

import { State } from './State.js';
import { getConfig } from './DataLoader.js';
import Stats from './Stats.js';
import { autoSave } from './Save.js';

export const Leveling = {
  // Calculate XP required for a level
  xpForLevel(level) {
    const baseXP = getConfig('progression.baseXP', 100);
    const scale = getConfig('progression.xpScale', 1.15);
    return Math.floor(baseXP * Math.pow(scale, level - 1));
  },
  
  // Add XP and check for level up
  addXP(amount) {
    const maxLevel = getConfig('progression.maxLevel', 100);
    
    if (State.meta.level >= maxLevel) {
      // Mastery XP or similar could be added here
      return false;
    }
    
    // Add to meta and run tracking
    State.meta.xp += amount;
    State.run.xpEarned += amount;
    
    // Check for level ups
    let leveledUp = false;
    while (State.meta.level < maxLevel) {
      const required = this.xpForLevel(State.meta.level);
      
      if (State.meta.xp >= required) {
        State.meta.xp -= required;
        this.levelUp();
        leveledUp = true;
      } else {
        break;
      }
    }
    
    return leveledUp;
  },
  
  // Level up!
  levelUp() {
    State.meta.level++;
    
    // Award skill points
    const skillPerLevel = getConfig('progression.skillPerLevel', 1);
    State.meta.skillPoints += skillPerLevel;
    
    // Award stat points
    const statPerLevel = getConfig('progression.statPerLevel', 3);
    State.meta.statPoints += statPerLevel;
    
    // Recalculate stats
    Stats.calculate();
    
    // Heal to full on level up
    State.player.hp = State.player.maxHP;
    State.player.shield = State.player.maxShield;
    
    console.log(`🎉 Level Up! Now level ${State.meta.level}`);
    console.log(`  +${skillPerLevel} Skill Points, +${statPerLevel} Stat Points`);
    
    // Trigger UI notification
    State.ui.levelUp = State.meta.level;
    
    // Auto save
    autoSave();
    
    return {
      level: State.meta.level,
      skillPoints: skillPerLevel,
      statPoints: statPerLevel
    };
  },
  
  // Get current XP progress (0-1)
  getProgress() {
    const required = this.xpForLevel(State.meta.level);
    return State.meta.xp / required;
  },
  
  // Get XP remaining to next level
  getXPRemaining() {
    return this.xpForLevel(State.meta.level) - State.meta.xp;
  },
  
  // Calculate XP from enemy kill
  getKillXP(enemyType, isElite = false, isBoss = false) {
    const enemies = State.data.enemies;
    if (!enemies) return 10;
    
    let xp = 10;
    
    // Find enemy definition
    for (const category of Object.values(enemies)) {
      if (typeof category === 'object' && enemyType in category) {
        xp = category[enemyType].xp || 10;
        break;
      }
    }
    
    // Elite/Boss multipliers
    if (isBoss) xp *= 5;
    else if (isElite) xp *= 2;
    
    // XP bonus from skills/equipment could be applied here
    const xpBonus = 0; // TODO: Get from stats
    xp *= (1 + xpBonus / 100);
    
    return Math.floor(xp);
  },
  
  // Add skill point (from skill trees)
  canLearnSkill(treeId, skillId) {
    const tree = State.data.skills?.[treeId];
    if (!tree) return false;
    
    const skill = tree.skills[skillId];
    if (!skill) return false;
    
    // Check if we have skill points
    if (State.meta.skillPoints <= 0) return false;
    
    // Check current rank vs max
    const currentRank = State.meta.skills[treeId]?.[skillId] || 0;
    if (currentRank >= skill.maxRank) return false;
    
    // Check requirements
    if (skill.requires) {
      const reqSkill = skill.requires.skill;
      const reqRank = skill.requires.rank;
      const currentReqRank = State.meta.skills[treeId]?.[reqSkill] || 0;
      
      if (currentReqRank < reqRank) return false;
    }
    
    return true;
  },
  
  // Learn a skill
  learnSkill(treeId, skillId) {
    if (!this.canLearnSkill(treeId, skillId)) return false;
    
    // Initialize tree if needed
    if (!State.meta.skills[treeId]) {
      State.meta.skills[treeId] = {};
    }
    
    // Initialize skill if needed
    if (!State.meta.skills[treeId][skillId]) {
      State.meta.skills[treeId][skillId] = 0;
    }
    
    // Learn!
    State.meta.skills[treeId][skillId]++;
    State.meta.skillPoints--;
    
    // Recalculate stats
    Stats.calculate();
    autoSave();
    
    const skill = State.data.skills[treeId].skills[skillId];
    console.log(`📖 Learned ${skill.name} (Rank ${State.meta.skills[treeId][skillId]})`);
    
    return true;
  },
  
  // Allocate stat point
  allocateStat(statId) {
    if (State.meta.statPoints <= 0) return false;
    
    if (!State.data.pilotStats?.[statId]) return false;
    
    // Initialize if needed
    if (!State.meta.stats[statId]) {
      State.meta.stats[statId] = 0;
    }
    
    State.meta.stats[statId]++;
    State.meta.statPoints--;
    
    Stats.calculate();
    autoSave();
    
    const stat = State.data.pilotStats[statId];
    console.log(`💪 ${stat.name} increased to ${State.meta.stats[statId]}`);
    
    return true;
  }
};

export default Leveling;
