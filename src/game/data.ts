import type { StarSystem, ShipStats, Skill } from "./types";

export const COMMODITIES = [
  { id: "food", name: "Food", basePrice: 10, color: "#88ff88" },
  { id: "ore", name: "Ore", basePrice: 25, color: "#ffaa44" },
  { id: "technology", name: "Technology", basePrice: 100, color: "#44aaff" },
  { id: "fuel", name: "Fuel", basePrice: 50, color: "#ff8844" },
  { id: "weapons", name: "Weapons", basePrice: 200, color: "#ff4444" },
  { id: "medical", name: "Medical Supplies", basePrice: 80, color: "#ff88ff" },
];

export const SHIP_STATS: Record<string, ShipStats> = {
  scout: {
    type: "scout",
    name: "Scout",
    speed: 5.0,
    maxShield: 50,
    maxHull: 60,
    cargoCapacity: 20,
    fireRate: 12,
    bulletDamage: 10,
    cost: 0,
  },
  freighter: {
    type: "freighter",
    name: "Freighter",
    speed: 2.5,
    maxShield: 30,
    maxHull: 80,
    cargoCapacity: 100,
    fireRate: 20,
    bulletDamage: 8,
    cost: 5000,
  },
  fighter: {
    type: "fighter",
    name: "Fighter",
    speed: 4.5,
    maxShield: 120,
    maxHull: 80,
    cargoCapacity: 15,
    fireRate: 6,
    bulletDamage: 18,
    cost: 8000,
  },
};

function genStars(count: number) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * 2400,
      y: Math.random() * 1800,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
  return arr;
}

export function buildInitialSystems(): Record<string, StarSystem> {
  const systems: Record<string, StarSystem> = {
    sol: {
      id: "sol",
      name: "Sol",
      mapX: 320,
      mapY: 260,
      color: "#ffdd44",
      starRadius: 30,
      pirateSpawnRate: 0.003,
      stars: genStars(120),
      enemies: [],
      stations: [
        {
          id: "earth_station",
          name: "Earth Station",
          systemId: "sol",
          x: 800,
          y: 300,
          prices: { food: 8, ore: 30, technology: 90, fuel: 55, weapons: 210, medical: 75 },
          supply: { food: 80, ore: 40, technology: 60, fuel: 70, weapons: 30, medical: 50 },
          demand: { food: 50, ore: 70, technology: 80, fuel: 60, weapons: 65, medical: 70 },
          missions: [],
          lastPriceUpdate: 0,
        },
        {
          id: "lunar_base",
          name: "Lunar Base",
          systemId: "sol",
          x: 1400,
          y: 600,
          prices: { food: 12, ore: 22, technology: 110, fuel: 45, weapons: 195, medical: 85 },
          supply: { food: 40, ore: 80, technology: 40, fuel: 80, weapons: 50, medical: 40 },
          demand: { food: 70, ore: 40, technology: 70, fuel: 50, weapons: 60, medical: 75 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "sol_to_alpha", x: 200, y: 900, targetSystemId: "alpha_centauri", targetGateId: "alpha_to_sol" },
        { id: "sol_to_vega", x: 1800, y: 200, targetSystemId: "vega", targetGateId: "vega_to_sol" },
      ],
    },
    alpha_centauri: {
      id: "alpha_centauri",
      name: "Alpha Centauri",
      mapX: 140,
      mapY: 420,
      color: "#ff9944",
      starRadius: 24,
      pirateSpawnRate: 0.005,
      stars: genStars(110),
      enemies: [],
      stations: [
        {
          id: "proxima_outpost",
          name: "Proxima Outpost",
          systemId: "alpha_centauri",
          x: 700,
          y: 400,
          prices: { food: 15, ore: 18, technology: 120, fuel: 40, weapons: 180, medical: 90 },
          supply: { food: 30, ore: 90, technology: 30, fuel: 85, weapons: 45, medical: 35 },
          demand: { food: 80, ore: 30, technology: 85, fuel: 45, weapons: 70, medical: 80 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "alpha_to_sol", x: 1600, y: 800, targetSystemId: "sol", targetGateId: "sol_to_alpha" },
        { id: "alpha_to_sirius", x: 300, y: 200, targetSystemId: "sirius", targetGateId: "sirius_to_alpha" },
      ],
    },
    vega: {
      id: "vega",
      name: "Vega",
      mapX: 530,
      mapY: 120,
      color: "#aaddff",
      starRadius: 28,
      pirateSpawnRate: 0.004,
      stars: genStars(130),
      enemies: [],
      stations: [
        {
          id: "vega_prime",
          name: "Vega Prime",
          systemId: "vega",
          x: 900,
          y: 500,
          prices: { food: 20, ore: 35, technology: 80, fuel: 60, weapons: 230, medical: 65 },
          supply: { food: 55, ore: 55, technology: 80, fuel: 50, weapons: 25, medical: 60 },
          demand: { food: 60, ore: 65, technology: 60, fuel: 65, weapons: 75, medical: 65 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "vega_to_sol", x: 400, y: 700, targetSystemId: "sol", targetGateId: "sol_to_vega" },
        { id: "vega_to_tau", x: 1500, y: 300, targetSystemId: "tau_ceti", targetGateId: "tau_to_vega" },
      ],
    },
    sirius: {
      id: "sirius",
      name: "Sirius",
      mapX: 180,
      mapY: 180,
      color: "#ffffff",
      starRadius: 32,
      pirateSpawnRate: 0.007,
      stars: genStars(100),
      enemies: [],
      stations: [
        {
          id: "sirius_station",
          name: "Sirius Citadel",
          systemId: "sirius",
          x: 1100,
          y: 400,
          prices: { food: 18, ore: 28, technology: 95, fuel: 70, weapons: 160, medical: 100 },
          supply: { food: 50, ore: 60, technology: 70, fuel: 40, weapons: 60, medical: 30 },
          demand: { food: 65, ore: 55, technology: 75, fuel: 70, weapons: 55, medical: 85 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "sirius_to_alpha", x: 1700, y: 600, targetSystemId: "alpha_centauri", targetGateId: "alpha_to_sirius" },
        { id: "sirius_to_proxima", x: 350, y: 850, targetSystemId: "proxima", targetGateId: "proxima_to_sirius" },
      ],
    },
    tau_ceti: {
      id: "tau_ceti",
      name: "Tau Ceti",
      mapX: 640,
      mapY: 280,
      color: "#ffcc88",
      starRadius: 22,
      pirateSpawnRate: 0.006,
      stars: genStars(90),
      enemies: [],
      stations: [
        {
          id: "tau_outpost",
          name: "Tau Outpost",
          systemId: "tau_ceti",
          x: 600,
          y: 600,
          prices: { food: 25, ore: 20, technology: 85, fuel: 65, weapons: 175, medical: 70 },
          supply: { food: 35, ore: 75, technology: 55, fuel: 60, weapons: 40, medical: 55 },
          demand: { food: 75, ore: 45, technology: 72, fuel: 55, weapons: 68, medical: 72 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "tau_to_vega", x: 1200, y: 300, targetSystemId: "vega", targetGateId: "vega_to_tau" },
        { id: "tau_to_proxima", x: 800, y: 800, targetSystemId: "proxima", targetGateId: "proxima_to_tau" },
      ],
    },
    proxima: {
      id: "proxima",
      name: "Proxima",
      mapX: 430,
      mapY: 400,
      color: "#ff6644",
      starRadius: 18,
      pirateSpawnRate: 0.009,
      stars: genStars(80),
      enemies: [],
      stations: [
        {
          id: "proxima_haven",
          name: "Proxima Haven",
          systemId: "proxima",
          x: 1000,
          y: 500,
          prices: { food: 30, ore: 15, technology: 140, fuel: 35, weapons: 145, medical: 110 },
          supply: { food: 20, ore: 95, technology: 25, fuel: 90, weapons: 70, medical: 20 },
          demand: { food: 90, ore: 25, technology: 90, fuel: 35, weapons: 50, medical: 90 },
          missions: [],
          lastPriceUpdate: 0,
        },
      ],
      gates: [
        { id: "proxima_to_sirius", x: 1600, y: 200, targetSystemId: "sirius", targetGateId: "sirius_to_proxima" },
        { id: "proxima_to_tau", x: 400, y: 800, targetSystemId: "tau_ceti", targetGateId: "tau_to_proxima" },
      ],
    },
  };
  return systems;
}

export const UPGRADES = [
  { id: "speed_boost", name: "Speed Booster", description: "Increases ship speed by 0.5", stat: "speed", delta: 0.5, cost: 1500 },
  { id: "shield_cell", name: "Shield Cell", description: "Adds 25 max shield", stat: "maxShield", delta: 25, cost: 1200 },
  { id: "hull_plating", name: "Hull Plating", description: "Adds 30 max hull", stat: "maxHull", delta: 30, cost: 1000 },
  { id: "cargo_rack", name: "Cargo Rack", description: "Adds 20 cargo capacity", stat: "cargoCapacity", delta: 20, cost: 800 },
  { id: "fire_control", name: "Fire Control", description: "Reduces fire cooldown by 2", stat: "fireRate", delta: -2, cost: 2000 },
  { id: "damage_amp", name: "Damage Amplifier", description: "Adds 5 bullet damage", stat: "bulletDamage", delta: 5, cost: 2500 },
];

const DELIVERY_ITEMS = ["Data Crystals", "Medical Nanites", "Fuel Cells", "Rare Ore Samples", "Diplomatic Parcel", "Engine Components"];

let missionIdCounter = 1;

export function generateMissions(stationId: string, systems: Record<string, StarSystem>): any[] {
  const systemIds = Object.keys(systems).filter(s => s !== "sol");
  const missions = [];
  
  for (let i = 0; i < 3; i++) {
    const rand = Math.random();
    const id = `mission_${missionIdCounter++}_${stationId}`;
    
    if (rand < 0.4) {
      const targetSysId = systemIds[Math.floor(Math.random() * systemIds.length)];
      const targetSys = systems[targetSysId];
      const targetStation = targetSys.stations[Math.floor(Math.random() * targetSys.stations.length)];
      const item = DELIVERY_ITEMS[Math.floor(Math.random() * DELIVERY_ITEMS.length)];
      missions.push({
        id,
        type: "delivery",
        title: `Delivery to ${targetStation.name}`,
        description: `Transport ${item} to ${targetStation.name} in the ${targetSys.name} system.`,
        reward: 800 + Math.floor(Math.random() * 1200),
        xpReward: 80 + Math.floor(Math.random() * 120),
        targetSystemId: targetSysId,
        targetStationId: targetStation.id,
        cargoItem: item,
        accepted: false,
        complete: false,
      });
    } else if (rand < 0.7) {
      const killsRequired = 3 + Math.floor(Math.random() * 5);
      missions.push({
        id,
        type: "combat",
        title: `Eliminate Pirate Squadron`,
        description: `Destroy ${killsRequired} pirate ships in this system.`,
        reward: 600 + killsRequired * 200,
        xpReward: 60 + killsRequired * 30,
        targetSystemId: null,
        killsRequired,
        killCount: 0,
        accepted: false,
        complete: false,
      });
    } else {
      const targetSysId = systemIds[Math.floor(Math.random() * systemIds.length)];
      const targetSys = systems[targetSysId];
      missions.push({
        id,
        type: "exploration",
        title: `Survey ${targetSys.name}`,
        description: `Travel to the ${targetSys.name} system and return with survey data.`,
        reward: 500 + Math.floor(Math.random() * 800),
        xpReward: 100 + Math.floor(Math.random() * 100),
        targetSystemId: targetSysId,
        accepted: false,
        complete: false,
      });
    }
  }
  return missions;
}

export const XP_TABLE = [0, 200, 500, 1000, 1800, 3000, 4800, 7500, 11000, 16000, 22000];

export function getXpForNextLevel(level: number): number {
  return XP_TABLE[Math.min(level, XP_TABLE.length - 1)] ?? 99999;
}
