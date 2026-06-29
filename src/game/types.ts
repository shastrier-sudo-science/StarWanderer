export type GameScreen = "title" | "space" | "starmap" | "station" | "gameover";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromPlayer: boolean;
}

export interface EnemyShip {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  state: "patrol" | "chase" | "attack";
  patrolAngle: number;
  shootCooldown: number;
  xpReward: number;
  creditReward: number;
  name: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  systemId: string;
  prices: Record<string, number>;
  supply: Record<string, number>;
  demand: Record<string, number>;
  missions: Mission[];
  lastPriceUpdate: number;
}

export interface StarSystem {
  id: string;
  name: string;
  mapX: number;
  mapY: number;
  color: string;
  starRadius: number;
  stations: Station[];
  gates: JumpGate[];
  stars: { x: number; y: number; brightness: number }[];
  enemies: EnemyShip[];
  pirateSpawnRate: number;
}

export interface JumpGate {
  id: string;
  x: number;
  y: number;
  targetSystemId: string;
  targetGateId: string;
}

export interface CargoItem {
  commodity: string;
  amount: number;
  buyPrice: number;
}

export type ShipType = "scout" | "freighter" | "fighter";

export interface ShipStats {
  type: ShipType;
  name: string;
  speed: number;
  maxShield: number;
  maxHull: number;
  cargoCapacity: number;
  fireRate: number;
  bulletDamage: number;
  cost: number;
}

export interface MissionType {
  type: "delivery" | "combat" | "exploration";
}

export interface Mission {
  id: string;
  type: "delivery" | "combat" | "exploration";
  title: string;
  description: string;
  reward: number;
  xpReward: number;
  targetSystemId?: string;
  targetStationId?: string;
  killCount?: number;
  killsRequired?: number;
  cargoItem?: string;
  accepted: boolean;
  complete: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  effect: (level: number) => void;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  cargoCapacity: number;
  cargo: CargoItem[];
  credits: number;
  xp: number;
  level: number;
  currentSystemId: string;
  shipStats: ShipStats;
  activeMissions: Mission[];
  skills: Record<string, number>;
  totalKills: number;
  systemsVisited: Set<string>;
  dockedStationId: string | null;
  shieldRegenCooldown: number;
  shootCooldown: number;
  invincibleTime: number;
}

export interface GameState {
  screen: GameScreen;
  player: PlayerState;
  systems: Record<string, StarSystem>;
  bullets: Bullet[];
  particles: Particle[];
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  tick: number;
  combatLog: string[];
  notification: { text: string; ttl: number } | null;
  selectedStationId: string | null;
  stationTab: "trade" | "missions" | "upgrades" | "shipyard";
  mapSelectedSystem: string | null;
  enemyIdCounter: number;
}
