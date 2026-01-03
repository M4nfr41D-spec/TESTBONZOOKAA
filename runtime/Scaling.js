// ============================================================
// Scaling.js - Enemy level & stat scaling based on PlayerLevel + NodeTier
// ============================================================

import { State } from "./State.js";
import { MapMeta } from "./MapMeta.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const Scaling = {
  // Tunables
  DELTA: 1.5,               // normals ~1-2 levels under player
  LEVEL_HP_GROWTH: 1.065,
  LEVEL_DMG_GROWTH: 1.055,
  TIER_HP_GROWTH: 0.018,
  TIER_DMG_GROWTH: 0.012,

  enemyLevel(playerLevel, nodeTier, kind = "NORMAL") {
    const nodePressure = clamp(Math.round((nodeTier - playerLevel) * 0.35), -2, +3);
    let base = Math.max(1, Math.floor(playerLevel - this.DELTA + nodePressure));

    if (kind === "ELITE") {
      base += 2 + Math.floor(nodeTier / 10);
      return Math.min(base, playerLevel + 5);
    }
    if (kind === "BOSS") {
      base += 4 + Math.floor(nodeTier / 6);
      return Math.min(base, playerLevel + 10);
    }
    return base;
  },

  hp(baseHP, level, nodeTier, kind = "NORMAL") {
    let hp = baseHP *
      Math.pow(this.LEVEL_HP_GROWTH, level) *
      (1 + this.TIER_HP_GROWTH * nodeTier);

    if (kind === "ELITE") hp *= 1.8;
    if (kind === "BOSS") hp *= 6.0;

    return Math.max(1, Math.round(hp));
  },

  damage(baseDMG, level, nodeTier, kind = "NORMAL") {
    let dmg = baseDMG *
      Math.pow(this.LEVEL_DMG_GROWTH, level) *
      (1 + this.TIER_DMG_GROWTH * nodeTier);

    if (kind === "ELITE") dmg *= 1.25;
    if (kind === "BOSS") dmg *= 1.6;

    return Math.max(1, Math.round(dmg));
  },

  encounterParams(nodeTier) {
    return {
      eliteRate: Math.min(0.06 + nodeTier * 0.0025, 0.25),
      projectileComplexity: Math.min(1 + Math.floor(nodeTier / 7), 8),
      spawnDensity: Math.min(1 + nodeTier * 0.03, 2.2)
    };
  },

  // Convenience: pull live values from state
  currentNodeTier() {
    try {
      return MapMeta.getCurrentTier();
    } catch {
      return 1;
    }
  },

  currentActIndex() {
    const actId = State.meta?.map?.current?.actId;
    const acts = State.meta?.map?.acts;
    if (!actId || !Array.isArray(acts)) return 1;
    const idx = acts.findIndex(a => a.id === actId);
    return idx >= 0 ? idx + 1 : 1;
  }
};

export default Scaling;
