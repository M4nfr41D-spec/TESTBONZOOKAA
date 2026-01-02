// ============================================================
// SAVE.js - Persistence Layer
// ============================================================
// Handles saving/loading meta state to LocalStorage

import { State } from './State.js';

const SAVE_KEY = 'bonzookaa_save_v2';
const BACKUP_KEY = 'bonzookaa_backup_v2';

// Deep clone helper
function cloneState(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const Save = {
  // Save meta state to LocalStorage
  save() {
    try {
      const saveData = {
        version: 2,
        timestamp: Date.now(),
        meta: cloneState(State.meta)
      };
      
      // Create backup of previous save
      const previous = localStorage.getItem(SAVE_KEY);
      if (previous) {
        localStorage.setItem(BACKUP_KEY, previous);
      }
      
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log('💾 Game saved');
      return true;
    } catch (error) {
      console.error('❌ Save failed:', error);
      return false;
    }
  },
  
  // Load meta state from LocalStorage
  load() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) {
        console.log('📭 No save file found, using defaults');
        return false;
      }
      
      const parsed = JSON.parse(data);
      
      // Version migration if needed
      if (parsed.version !== 2) {
        console.log('🔄 Migrating save from version', parsed.version);
        this.migrate(parsed);
      }
      
      // Merge loaded data with default state (preserves new properties)
      this.mergeState(parsed.meta);
      
      console.log('📂 Save loaded from', new Date(parsed.timestamp).toLocaleString());
      return true;
    } catch (error) {
      console.error('❌ Load failed:', error);
      return this.loadBackup();
    }
  },
  
  // Load backup if main save is corrupted
  loadBackup() {
    try {
      const data = localStorage.getItem(BACKUP_KEY);
      if (!data) return false;
      
      const parsed = JSON.parse(data);
      this.mergeState(parsed.meta);
      console.log('📂 Loaded from backup');
      return true;
    } catch (error) {
      console.error('❌ Backup load also failed:', error);
      return false;
    }
  },
  
  // Merge loaded state with defaults
  mergeState(loaded) {
    // Deep merge: preserves default values for new properties
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    merge(State.meta, loaded);
  },
  
  // Handle version migration
  migrate(oldSave) {
    // v1 -> v2 migration example:
    if (oldSave.version === 1) {
      // Add new properties that didn't exist in v1
      if (!oldSave.meta.settings) {
        oldSave.meta.settings = State.meta.settings;
      }
      oldSave.version = 2;
    }
  },
  
  // Delete save (for testing or reset)
  delete() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    console.log('🗑️ Save deleted');
  },
  
  // Export save as JSON string (for backup)
  export() {
    const data = localStorage.getItem(SAVE_KEY);
    return data || null;
  },
  
  // Import save from JSON string
  import(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.meta) {
        throw new Error('Invalid save format');
      }
      localStorage.setItem(SAVE_KEY, jsonString);
      this.load();
      return true;
    } catch (error) {
      console.error('❌ Import failed:', error);
      return false;
    }
  }
};

// Auto-save on important events
export function autoSave() {
  Save.save();
}

export default Save;
