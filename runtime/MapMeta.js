// ============================================================
// MapMeta.js - Acts / Clusters / Nodes (persistent meta layer)
// ============================================================

import { State } from "./State.js";

// Simple deterministic RNG (mulberry32)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Small stable string hash (FNV-1a-ish)
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rollType(i) {
  // 30 nodes per cluster, last = boss
  if (i === 29) return "BOSS";
  if (i % 7 === 0) return "EVENT";
  if (i % 5 === 0) return "RESOURCE";
  if (i % 11 === 0) return "ANOMALY";
  return "COMBAT";
}

function rollMods(rng) {
  const pool = [
    "ELITE_PACKS",
    "FAST_ENEMIES",
    "BULLET_HELL",
    "NEBULA_LOW_VIS",
    "ION_STORM",
    "RICH_ORE",
    "LOOT_QUALITY_UP",
    "XP_BOOST"
  ];

  // ~40% chance to have 1 mod, ~10% chance to have 2 mods
  const mods = [];
  const r = rng();
  if (r < 0.40) mods.push(pool[Math.floor(rng() * pool.length)]);
  if (r < 0.10) {
    let m2 = pool[Math.floor(rng() * pool.length)];
    if (mods[0] === m2) m2 = pool[(pool.indexOf(m2) + 1) % pool.length];
    mods.push(m2);
  }
  return mods;
}

function generateCluster(clusterId, baseTier = 1) {
  const rng = mulberry32(hashSeed(clusterId));
  const nodes = [];

  for (let i = 0; i < 30; i++) {
    const id = `${clusterId}_N${i}`;
    nodes.push({
      id,
      index: i,
      type: rollType(i),
      tier: baseTier + Math.floor(i / 3), // gentle tier ramp
      seed: Math.floor(rng() * 1e9),
      mods: rollMods(rng),
      connections: []
    });
  }

  // Graph: mostly forward, some branches + a few back-links
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (i < nodes.length - 1) n.connections.push(nodes[i + 1].id);
    if (rng() < 0.28 && i + 2 < nodes.length) n.connections.push(nodes[i + 2].id);
    if (rng() < 0.12 && i - 2 >= 0) n.connections.push(nodes[i - 2].id);
    n.connections = [...new Set(n.connections)];
  }

  return nodes;
}

function generateDefaultActs() {
  const actId = "ACT_01";
  const clusterId = `${actId}_C1`;

  return [
    {
      id: actId,
      name: "Galaxie Asterion",
      clusters: [
        {
          id: clusterId,
          name: "Wrackgürtel",
          nodes: generateCluster(clusterId, 1)
        }
      ]
    }
  ];
}

export const MapMeta = {
  init() {
    // Robustness: older saves or experimental branches may have a non-object `meta.map`
    if (!State.meta.map || typeof State.meta.map !== 'object' || Array.isArray(State.meta.map)) {
      State.meta.map = {
        version: 1,
        acts: [],
        unlockedActs: ["ACT_01"],
        unlockedNodes: {},
        clearedNodes: {},
        fastTravel: {},
        current: { actId: "ACT_01", clusterId: "ACT_01_C1", nodeId: "ACT_01_C1_N0" }
      };
    }

    const map = State.meta.map;

    // First boot / empty acts: generate
    if (!map.acts || map.acts.length === 0) {
      map.acts = generateDefaultActs();
      map.unlockedActs = map.unlockedActs?.length ? map.unlockedActs : ["ACT_01"];
      map.current = map.current || { actId: "ACT_01", clusterId: "ACT_01_C1", nodeId: "ACT_01_C1_N0" };
      map.unlockedNodes = map.unlockedNodes || {};
      map.clearedNodes = map.clearedNodes || {};
      map.fastTravel = map.fastTravel || {};
      map.unlockedNodes[map.current.nodeId] = true;
    }

    // Safety: ensure current node exists; else reset to first
    if (!this.getNode(map.current?.nodeId)) {
      const first = map.acts?.[0]?.clusters?.[0]?.nodes?.[0];
      if (first) {
        map.current = { actId: "ACT_01", clusterId: "ACT_01_C1", nodeId: first.id };
        map.unlockedNodes[first.id] = true;
      }
    }
  },

  getNode(nodeId) {
    for (const act of State.meta.map.acts) {
      for (const cl of act.clusters) {
        const found = cl.nodes.find(n => n.id === nodeId);
        if (found) return found;
      }
    }
    return null;
  },

  getCurrentNode() {
    return this.getNode(State.meta.map.current.nodeId);
  },

  setCurrentNode(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return false;

    const map = State.meta.map;
    const cur = this.getCurrentNode();
    const isUnlocked = !!map.unlockedNodes[nodeId];
    const isConnected = cur ? cur.connections.includes(nodeId) : false;

    if (!isUnlocked && !isConnected) return false;

    map.current.nodeId = nodeId;
    map.unlockedNodes[nodeId] = true;
    return true;
  },

  markCleared(nodeId) {
    State.meta.map.clearedNodes[nodeId] = true;
    State.meta.map.fastTravel[nodeId] = true;

    const node = this.getNode(nodeId);
    if (node) {
      for (const nextId of node.connections) {
        State.meta.map.unlockedNodes[nextId] = true;
      }
    }
  },

  getConnected(nodeId) {
    const node = this.getNode(nodeId);
    return node ? node.connections.map(id => this.getNode(id)).filter(Boolean) : [];
  },

  getAct(actId) {
    return State.meta.map.acts.find(a => a.id === actId) || null;
  }
};

export default MapMeta;