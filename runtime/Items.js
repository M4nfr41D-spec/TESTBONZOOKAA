// ============================================================
// ITEMS.js - Item Generation System (Diablo 2 Style)
// ============================================================
// Generates random items with affixes based on rarity

import { State } from './State.js';
import { getItemData, getRandomAffix } from './DataLoader.js';

export const Items = {
  // Generate a random item
  generate(baseId, forceRarity = null) {
    const baseData = getItemData(baseId);
    if (!baseData) {
      console.warn('Items.generate: Unknown item', baseId);
      return null;
    }
    
    const rarities = State.data.rarities;
    if (!rarities) return null;
    
    // Roll rarity
    const rarity = forceRarity || this.rollRarity(baseData.rarities);
    const rarityData = rarities[rarity];
    
    // Create item
    const item = {
      id: this.generateId(),
      baseId: baseId,
      name: baseData.name,
      slot: baseData.slot,
      icon: baseData.icon,
      description: baseData.description,
      rarity: rarity,
      level: State.meta.level,
      stats: {},
      affixes: [],
      value: 0
    };
    
    // Roll base stats with rarity multiplier
    for (const [stat, range] of Object.entries(baseData.stats || {})) {
      const base = range[0] + Math.random() * (range[1] - range[0]);
      item.stats[stat] = Math.round(base * rarityData.powerMult * 10) / 10;
    }
    
    // Roll affixes based on rarity
    const numAffixes = Math.floor(Math.random() * (rarityData.maxAffixes + 1));
    const usedStats = new Set();
    
    for (let i = 0; i < numAffixes; i++) {
      const type = i < numAffixes / 2 ? 'prefix' : 'suffix';
      const affix = getRandomAffix(rarity, type);
      
      // Avoid duplicate stat types
      if (affix && !usedStats.has(affix.stat)) {
        usedStats.add(affix.stat);
        
        const value = affix.range[0] + Math.random() * (affix.range[1] - affix.range[0]);
        item.affixes.push({
          id: affix.id,
          name: affix.name,
          stat: affix.stat,
          value: Math.round(value * 10) / 10,
          type: type
        });
      }
    }
    
    // Build display name with affixes
    item.name = this.buildName(baseData.name, item.affixes);
    
    // Calculate sell value
    item.value = Math.floor(50 * rarityData.sellMult * (1 + item.level * 0.1));
    
    return item;
  },
  
  // Roll rarity based on weights and player luck
  rollRarity(allowedRarities) {
    const rarities = State.data.rarities;
    if (!rarities) return allowedRarities[0];
    
    const luck = State.player.luck || 0;
    
    // Build weighted pool
    let weights = {};
    let total = 0;
    
    for (const rarity of allowedRarities) {
      const data = rarities[rarity];
      if (data) {
        // Higher luck = better chances for rare items
        let weight = data.weight;
        if (rarity !== 'common') {
          weight *= (1 + luck * 0.02); // +2% per luck point
        }
        weights[rarity] = weight;
        total += weight;
      }
    }
    
    // Roll
    let roll = Math.random() * total;
    for (const [rarity, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    
    return allowedRarities[0];
  },
  
  // Build item name from base + affixes
  buildName(baseName, affixes) {
    const prefix = affixes.find(a => a.type === 'prefix');
    const suffix = affixes.find(a => a.type === 'suffix');
    
    let name = baseName;
    if (prefix) name = prefix.name + ' ' + name;
    if (suffix) name = name + ' ' + suffix.name;
    
    return name;
  },
  
  // Generate unique item ID
  generateId() {
    return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  },
  
  // Get random item from any category
  generateRandom(forceRarity = null) {
    const items = State.data.items;
    if (!items) return null;
    
    // Collect all item IDs
    const allIds = [];
    for (const category of Object.values(items)) {
      for (const id of Object.keys(category)) {
        allIds.push(id);
      }
    }
    
    if (allIds.length === 0) return null;
    
    const randomId = allIds[Math.floor(Math.random() * allIds.length)];
    return this.generate(randomId, forceRarity);
  },
  
  // Add item to stash
  addToStash(item) {
    const maxSlots = State.data.config?.stash?.baseSlots || 56;
    
    if (State.meta.stash.length >= maxSlots) {
      console.warn('Stash is full!');
      return false;
    }
    
    State.meta.stash.push(item);
    State.run.stats.itemsFound++;
    return true;
  },
  
  // Remove item from stash
  removeFromStash(itemId) {
    const index = State.meta.stash.findIndex(i => i.id === itemId);
    if (index !== -1) {
      State.meta.stash.splice(index, 1);
      return true;
    }
    return false;
  },
  
  // Equip item
  equip(itemId) {
    const item = State.meta.stash.find(i => i.id === itemId);
    if (!item) return false;
    
    // Find appropriate slot
    let slot = item.slot;
    
    // Handle module slots (module1, module2, module3)
    if (item.slot.startsWith('module')) {
      const slots = ['module1', 'module2', 'module3'];
      for (const s of slots) {
        if (!State.meta.equipment[s]) {
          slot = s;
          break;
        }
      }
    }
    
    State.meta.equipment[slot] = itemId;
    return true;
  },
  
  // Unequip item
  unequip(slot) {
    if (State.meta.equipment[slot]) {
      State.meta.equipment[slot] = null;
      return true;
    }
    return false;
  },
  
  // Sell item for scrap
  sell(itemId) {
    const item = State.meta.stash.find(i => i.id === itemId);
    if (!item) return 0;
    
    // Unequip if equipped
    for (const [slot, id] of Object.entries(State.meta.equipment)) {
      if (id === itemId) {
        State.meta.equipment[slot] = null;
      }
    }
    
    // Remove and add scrap
    this.removeFromStash(itemId);
    State.meta.scrap += item.value;
    
    return item.value;
  },
  
  // Compare two items
  compare(item1, item2) {
    if (!item1 || !item2) return null;
    
    const diff = {};
    
    // Compare base stats
    const allStats = new Set([
      ...Object.keys(item1.stats || {}),
      ...Object.keys(item2.stats || {})
    ]);
    
    for (const stat of allStats) {
      const v1 = item1.stats?.[stat] || 0;
      const v2 = item2.stats?.[stat] || 0;
      if (v1 !== v2) {
        diff[stat] = { old: v1, new: v2, change: v2 - v1 };
      }
    }
    
    return diff;
  }
};

export default Items;
