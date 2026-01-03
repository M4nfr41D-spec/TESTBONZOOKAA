// ============================================================
// Scaling.js - Enemy level & stats scaling (Δ=1.5) + NodeTier
// ============================================================

export const Scaling = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const DELTA = 1.5;
  const LEVEL_HP_GROWTH = 1.065;
  const LEVEL_DMG_GROWTH = 1.055;
  const TIER_HP_GROWTH = 0.018;
  const TIER_DMG_GROWTH = 0.012;

  function enemyLevel(playerLevel, nodeTier, type = "NORMAL") {
    const nodePressure = clamp(Math.round((nodeTier - playerLevel) * 0.35), -2, +3);
    let base = Math.max(1, Math.floor(playerLevel - DELTA + nodePressure));

    if (type === "ELITE") {
      base += 2 + Math.floor(nodeTier / 10);
      return Math.min(base, playerLevel + 5);
    }
    if (type === "BOSS") {
      base += 4 + Math.floor(nodeTier / 6);
      return Math.min(base, playerLevel + 10);
    }
    return base;
  }

  function hp(baseHP, level, nodeTier, type = "NORMAL") {
    let v = baseHP * Math.pow(LEVEL_HP_GROWTH, level) * (1 + TIER_HP_GROWTH * nodeTier);
    if (type === "ELITE") v *= 1.8;
    if (type === "BOSS") v *= 6.0;
    return Math.round(v);
  }

  function damage(baseDMG, level, nodeTier, type = "NORMAL") {
    let v = baseDMG * Math.pow(LEVEL_DMG_GROWTH, level) * (1 + TIER_DMG_GROWTH * nodeTier);
    if (type === "ELITE") v *= 1.25;
    if (type === "BOSS") v *= 1.6;
    return Math.round(v);
  }

  function encounterParams(nodeTier) {
    return {
      eliteRate: Math.min(0.06 + nodeTier * 0.0025, 0.25),
      projectileComplexity: Math.min(1 + Math.floor(nodeTier / 7), 8),
      spawnDensity: Math.min(1 + nodeTier * 0.03, 2.2)
    };
  }

  return { enemyLevel, hp, damage, encounterParams };
})();
