// ============================================================
// UI.js - Desktop UI System
// ============================================================

import { State } from './State.js';
import { Stats } from './Stats.js';
import { Leveling } from './Leveling.js';
import { Items } from './Items.js';
import { Save } from './Save.js';

export const UI = {
  tooltipEl: null,
  
  init() {
    this.tooltipEl = document.getElementById('tooltip');
    
    // Initial render
    this.renderAll();
  },
  
  renderAll() {
    this.renderEquipment();
    this.renderStash();
    this.renderShipStats();
    this.renderPilotStats();
    this.renderSkillTrees();
  },
  
  // ========== EQUIPMENT PANEL ==========
  renderEquipment() {
    const container = document.getElementById('equipmentGrid');
    if (!container) return;
    
    const slots = State.data.slots;
    const equipment = State.meta.equipment;
    const stash = State.meta.stash;
    const rarities = State.data.rarities;
    
    let html = '';
    
    for (const [slotId, slotDef] of Object.entries(slots || {})) {
      const equippedId = equipment[slotId];
      const item = equippedId ? stash.find(i => i.id === equippedId) : null;
      const rarityColor = item ? (rarities[item.rarity]?.color || '#666') : '#333';
      
      html += `
        <div class="equip-slot ${item ? 'filled' : ''}" 
             style="--rarity-color: ${rarityColor}"
             onclick="UI.onEquipSlotClick('${slotId}')"
             onmouseenter="UI.showSlotTooltip(event, '${slotId}')"
             onmouseleave="UI.hideTooltip()">
          <div class="slot-icon">${item ? item.icon : slotDef.icon}</div>
          <div class="slot-info">
            <div class="slot-type">${slotDef.name}</div>
            ${item 
              ? `<div class="slot-item" style="color:${rarityColor}">${item.name}</div>`
              : `<div class="slot-empty">Empty</div>`
            }
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  // ========== STASH PANEL ==========
  renderStash() {
    const container = document.getElementById('stashGrid');
    if (!container) return;
    
    const stash = State.meta.stash;
    const equipment = State.meta.equipment;
    const rarities = State.data.rarities;
    const maxSlots = State.data.config?.stash?.baseSlots || 40;
    
    let html = '';
    
    // Items
    for (const item of stash) {
      const isEquipped = Object.values(equipment).includes(item.id);
      const rarityColor = rarities[item.rarity]?.color || '#666';
      
      html += `
        <div class="stash-slot filled ${isEquipped ? 'equipped' : ''}"
             style="--rarity-color: ${rarityColor}"
             onclick="UI.onStashItemClick('${item.id}')"
             onmouseenter="UI.showItemTooltip(event, '${item.id}')"
             onmouseleave="UI.hideTooltip()">
          ${item.icon}
        </div>
      `;
    }
    
    // Empty slots
    const emptyCount = Math.max(0, Math.min(maxSlots - stash.length, 20));
    for (let i = 0; i < emptyCount; i++) {
      html += `<div class="stash-slot"></div>`;
    }
    
    container.innerHTML = html;
  },
  
  // ========== SHIP STATS ==========
  renderShipStats() {
    const container = document.getElementById('shipStats');
    if (!container) return;
    
    const p = State.player;
    
    const stats = [
      { name: 'HP', value: Math.round(p.maxHP) },
      { name: 'Shield', value: Math.round(p.maxShield) },
      { name: 'Damage', value: p.damage.toFixed(1) },
      { name: 'Fire Rate', value: p.fireRate.toFixed(1) + '/s' },
      { name: 'Crit %', value: p.critChance.toFixed(0) + '%' },
      { name: 'Crit Dmg', value: p.critDamage + '%' },
      { name: 'Speed', value: Math.round(p.speed) },
      { name: 'Projectiles', value: p.projectiles },
      { name: 'Pierce', value: p.piercing },
      { name: 'Luck', value: p.luck },
      { name: 'DPS', value: Stats.getDPS(), highlight: true }
    ];
    
    let html = '';
    for (const stat of stats) {
      html += `
        <div class="stat-item ${stat.highlight ? 'highlight' : ''}">
          <span>${stat.name}</span>
          <span class="stat-value">${stat.value}</span>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  // ========== PILOT STATS ==========
  renderPilotStats() {
    const container = document.getElementById('pilotStats');
    const pointsEl = document.getElementById('statPointsNum');
    if (!container) return;
    
    const pilotStats = State.data.pilotStats;
    const allocated = State.meta.stats;
    const points = State.meta.statPoints;
    
    if (pointsEl) pointsEl.textContent = points;
    
    let html = '';
    
    for (const [statId, statDef] of Object.entries(pilotStats || {})) {
      const current = allocated[statId] || 0;
      
      html += `
        <div class="pilot-stat-row">
          <span class="pstat-icon" style="color:${statDef.color}">${statDef.icon}</span>
          <span class="pstat-name">${statDef.name}</span>
          <span class="pstat-value">${current}</span>
          <button class="pstat-btn" 
                  onclick="UI.allocateStat('${statId}')"
                  ${points > 0 ? '' : 'disabled'}>+</button>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  // ========== SKILL TREES ==========
  renderSkillTrees() {
    const container = document.getElementById('skillTrees');
    const pointsEl = document.getElementById('skillPointsNum');
    if (!container) return;
    
    const trees = State.data.skills;
    const learned = State.meta.skills;
    const points = State.meta.skillPoints;
    
    if (pointsEl) pointsEl.textContent = points;
    
    let html = '';
    
    for (const [treeId, tree] of Object.entries(trees || {})) {
      const totalInTree = Object.values(learned[treeId] || {}).reduce((a, b) => a + b, 0);
      
      html += `
        <div class="skill-tree-section" id="tree-${treeId}">
          <div class="skill-tree-header" style="--tree-color: ${tree.color}" onclick="UI.toggleTree('${treeId}')">
            <span class="tree-icon">${tree.icon}</span>
            <span class="tree-name">${tree.name}</span>
            <span class="tree-pts">${totalInTree} pts</span>
          </div>
          <div class="skill-tree-body">
      `;
      
      for (const [skillId, skill] of Object.entries(tree.skills)) {
        const currentRank = learned[treeId]?.[skillId] || 0;
        const canLearn = Leveling.canLearnSkill(treeId, skillId);
        const maxed = currentRank >= skill.maxRank;
        
        html += `
          <div class="skill-node ${currentRank > 0 ? 'learned' : ''} ${canLearn && !maxed ? 'available' : ''}"
               onclick="UI.learnSkill('${treeId}', '${skillId}')">
            <span class="skill-icon">${skill.icon}</span>
            <div class="skill-info">
              <div class="skill-name">${skill.name}</div>
              <div class="skill-desc">${skill.description}</div>
            </div>
            <span class="skill-rank">${currentRank}/${skill.maxRank}</span>
          </div>
        `;
      }
      
      html += `</div></div>`;
    }
    
    container.innerHTML = html;
  },
  
  toggleTree(treeId) {
    const section = document.getElementById(`tree-${treeId}`);
    if (section) section.classList.toggle('open');
  },
  
  // ========== VENDOR ==========
  renderVendor() {
    const container = document.getElementById('vendorGrid');
    const cellsEl = document.getElementById('vendorCells');
    if (!container) return;
    
    const upgrades = State.data.runUpgrades;
    const current = State.run.upgrades;
    const cells = State.run.cells;
    
    if (cellsEl) cellsEl.textContent = cells;
    
    let html = '';
    
    for (const [upgradeId, upgrade] of Object.entries(upgrades || {})) {
      const tier = current[upgradeId] || 0;
      const maxed = tier >= upgrade.maxTier;
      const cost = maxed ? 0 : upgrade.costs[tier];
      const canBuy = !maxed && cells >= cost;
      
      html += `
        <div class="vendor-card ${maxed ? 'maxed' : ''} ${canBuy ? 'available' : ''}"
             onclick="UI.buyUpgrade('${upgradeId}')">
          <div class="upgrade-icon">${upgrade.icon}</div>
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-tier">${tier}/${upgrade.maxTier}</div>
          <div class="upgrade-cost ${canBuy ? '' : 'expensive'}">${maxed ? 'MAX' : cost + ' ⚡'}</div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  // ========== TOOLTIPS ==========
  showItemTooltip(event, itemId) {
    const item = State.meta.stash.find(i => i.id === itemId);
    if (!item) return;
    
    const rarities = State.data.rarities;
    const rarityData = rarities?.[item.rarity];
    const isEquipped = Object.values(State.meta.equipment).includes(itemId);
    
    let statsHtml = '';
    for (const [stat, value] of Object.entries(item.stats || {})) {
      statsHtml += `<div class="tooltip-stat">+${value} ${this.formatStatName(stat)}</div>`;
    }
    for (const affix of item.affixes || []) {
      statsHtml += `<div class="tooltip-stat affix">+${affix.value} ${this.formatStatName(affix.stat)}</div>`;
    }
    
    const html = `
      <div class="tooltip-header">
        <span class="tooltip-icon">${item.icon}</span>
        <div>
          <div class="tooltip-name" style="color:${rarityData?.color || '#fff'}">${item.name}</div>
          <div class="tooltip-type">${item.slot} • Level ${item.level}</div>
        </div>
      </div>
      <div class="tooltip-body">
        ${statsHtml}
        <div class="tooltip-value">Sell: ${item.value} 💰</div>
        <div class="tooltip-hint">${isEquipped ? 'Click to unequip' : 'Click to equip'}</div>
      </div>
    `;
    
    this.showTooltip(event, html, rarityData?.color);
  },
  
  showSlotTooltip(event, slotId) {
    const slots = State.data.slots;
    if (!slots) return;
    
    const equipment = State.meta.equipment;
    const stash = State.meta.stash;
    const slotDef = slots[slotId];
    if (!slotDef) return;
    
    const equippedId = equipment[slotId];
    const item = equippedId ? stash.find(i => i.id === equippedId) : null;
    
    if (item) {
      this.showItemTooltip(event, item.id);
    } else {
      const html = `
        <div class="tooltip-header">
          <span class="tooltip-icon">${slotDef.icon}</span>
          <div>
            <div class="tooltip-name">${slotDef.name}</div>
            <div class="tooltip-type">Empty Slot</div>
          </div>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-hint">Click to see available items</div>
        </div>
      `;
      this.showTooltip(event, html);
    }
  },
  
  showTooltip(event, html, color = null) {
    if (!this.tooltipEl) return;
    
    // Wrap in tooltip-panel for proper styling
    this.tooltipEl.innerHTML = `
      <div class="tooltip-panel" style="--rarity-color: ${color || 'var(--cyan)'}">
        ${html}
      </div>
    `;
    this.tooltipEl.classList.add('visible');
    
    // Position
    const rect = this.tooltipEl.getBoundingClientRect();
    let x = event.clientX + 15;
    let y = event.clientY + 15;
    
    // Keep on screen
    if (x + rect.width > window.innerWidth - 10) {
      x = event.clientX - rect.width - 15;
    }
    if (y + rect.height > window.innerHeight - 10) {
      y = event.clientY - rect.height - 15;
    }
    
    this.tooltipEl.style.left = x + 'px';
    this.tooltipEl.style.top = y + 'px';
  },
  
  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove('visible');
    }
  },
  
  // ========== ACTIONS ==========
  onEquipSlotClick(slotId) {
    const equipment = State.meta.equipment;
    const equippedId = equipment[slotId];
    
    if (equippedId) {
      // Unequip
      Items.unequip(slotId);
      Stats.calculate();
      Save.save();
      this.renderAll();
    }
  },
  
  onStashItemClick(itemId) {
    const item = State.meta.stash.find(i => i.id === itemId);
    if (!item) return;
    
    const isEquipped = Object.values(State.meta.equipment).includes(itemId);
    
    if (isEquipped) {
      // Find slot and unequip
      for (const [slot, id] of Object.entries(State.meta.equipment)) {
        if (id === itemId) {
          Items.unequip(slot);
          break;
        }
      }
    } else {
      // Equip
      Items.equip(itemId);
    }
    
    Stats.calculate();
    Save.save();
    this.renderAll();
  },
  
  allocateStat(statId) {
    if (Leveling.allocateStat(statId)) {
      this.renderPilotStats();
      this.renderShipStats();
    }
  },
  
  learnSkill(treeId, skillId) {
    if (Leveling.learnSkill(treeId, skillId)) {
      this.renderSkillTrees();
      this.renderShipStats();
    }
  },
  
  buyUpgrade(upgradeId) {
    const upgrades = State.data.runUpgrades;
    const upgrade = upgrades?.[upgradeId];
    if (!upgrade) return;
    
    const tier = State.run.upgrades[upgradeId] || 0;
    if (tier >= upgrade.maxTier) return;
    
    const cost = upgrade.costs[tier];
    if (State.run.cells < cost) return;
    
    State.run.cells -= cost;
    State.run.upgrades[upgradeId] = tier + 1;
    
    Stats.calculate();
    this.renderVendor();
    this.renderShipStats();
  },
  
  // ========== HELPERS ==========
  formatStatName(stat) {
    const names = {
      damage: 'Damage',
      fireRate: 'Fire Rate',
      speed: 'Speed',
      maxHP: 'Max HP',
      shieldCap: 'Shield',
      critChance: 'Crit %',
      critDamage: 'Crit Dmg',
      piercing: 'Pierce',
      projectiles: 'Projectiles',
      luck: 'Luck',
      pickupRadius: 'Pickup',
      hpRegen: 'HP Regen',
      shieldRegen: 'Shield Regen',
      lifesteal: 'Lifesteal'
    };
    return names[stat] || stat;
  }
};

// Global access
window.UI = UI;

export default UI;
