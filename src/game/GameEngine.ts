import type { GameState, PlayerState, EnemyShip, Bullet, Particle, StarSystem, Station } from "./types";
import { buildInitialSystems, SHIP_STATS, generateMissions, getXpForNextLevel, XP_TABLE, UPGRADES as UPGRADES_LIST } from "./data";

const WIDTH = 1920;
const HEIGHT = 1080;
const STATION_DOCK_RADIUS = 70;
const GATE_TRAVEL_RADIUS = 80;
const BULLET_SPEED = 12;
const BULLET_LIFE = 60;
const ENEMY_BULLET_SPEED = 8;
const PIRATE_NAMES = ["Marauder", "Corsair", "Raider", "Buccaneer", "Scourge", "Vandal", "Reaver"];

export class GameEngine {
  state: GameState;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  animFrameId: number = 0;
  onStateChange: () => void;

  constructor(onStateChange: () => void) {
    this.onStateChange = onStateChange;
    const systems = buildInitialSystems();
    Object.values(systems).forEach(sys => {
      sys.stations.forEach(st => {
        st.missions = generateMissions(st.id, systems);
      });
    });

    const scout = SHIP_STATS["scout"];
    this.state = {
      screen: "title",
      player: {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        vx: 0,
        vy: 0,
        angle: 0,
        hp: scout.maxHull,
        maxHp: scout.maxHull,
        shield: scout.maxShield,
        maxShield: scout.maxShield,
        cargoCapacity: scout.cargoCapacity,
        cargo: [],
        credits: 1000,
        xp: 0,
        level: 1,
        currentSystemId: "sol",
        shipStats: { ...scout },
        activeMissions: [],
        skills: {},
        totalKills: 0,
        systemsVisited: new Set(["sol"]),
        dockedStationId: null,
        shieldRegenCooldown: 0,
        shootCooldown: 0,
        invincibleTime: 0,
      },
      systems,
      bullets: [],
      particles: [],
      keys: {},
      mouseX: 0,
      mouseY: 0,
      mouseDown: false,
      tick: 0,
      combatLog: [],
      notification: null,
      selectedStationId: null,
      stationTab: "trade",
      mapSelectedSystem: null,
      enemyIdCounter: 0,
    };
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.loop();
  }

  unmount() {
    cancelAnimationFrame(this.animFrameId);
  }

  private loop = () => {
    this.update();
    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private addLog(msg: string) {
    this.state.combatLog = [msg, ...this.state.combatLog].slice(0, 8);
  }

  private notify(text: string) {
    this.state.notification = { text, ttl: 180 };
  }

  private spawnParticles(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private spawnEnemy(system: StarSystem) {
    const id = ++this.state.enemyIdCounter;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * WIDTH; y = -60; }
    else if (edge === 1) { x = WIDTH + 60; y = Math.random() * HEIGHT; }
    else if (edge === 2) { x = Math.random() * WIDTH; y = HEIGHT + 60; }
    else { x = -60; y = Math.random() * HEIGHT; }
    const tier = Math.floor(Math.random() * 3);
    const name = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
    const hp = 30 + tier * 30;
    system.enemies.push({
      id, x, y, vx: 0, vy: 0,
      angle: Math.random() * Math.PI * 2,
      hp, maxHp: hp,
      shield: tier * 20, maxShield: tier * 20,
      speed: 1.5 + tier * 0.5,
      state: "patrol",
      patrolAngle: Math.random() * Math.PI * 2,
      shootCooldown: 60 + Math.random() * 60,
      xpReward: 50 + tier * 50,
      creditReward: 100 + tier * 200,
      name,
    });
  }

  private giveXp(amount: number) {
    const p = this.state.player;
    p.xp += amount;
    const needed = getXpForNextLevel(p.level);
    if (p.xp >= needed && p.level < XP_TABLE.length - 1) {
      p.level++;
      p.hp = Math.min(p.hp + 20, p.maxHp);
      p.shield = p.maxShield;
      this.notify(`Level Up! You are now level ${p.level}`);
      this.addLog(`Level Up to ${p.level}!`);
    }
  }

  private updatePlayer() {
    const p = this.state.player;
    if (p.dockedStationId) return;

    const keys = this.state.keys;
    const spd = p.shipStats.speed;
    let dx = 0, dy = 0;

    if (keys["w"] || keys["W"] || keys["ArrowUp"]) dy -= 1;
    if (keys["s"] || keys["S"] || keys["ArrowDown"]) dy += 1;
    if (keys["a"] || keys["A"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["d"] || keys["D"] || keys["ArrowRight"]) dx += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    const friction = 0.88;
    p.vx = (p.vx + dx * spd * 0.3) * friction;
    p.vy = (p.vy + dy * spd * 0.3) * friction;

    const maxSpd = spd;
    const curSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (curSpd > maxSpd) { p.vx = (p.vx / curSpd) * maxSpd; p.vy = (p.vy / curSpd) * maxSpd; }

    p.x += p.vx;
    p.y += p.vy;

    p.x = Math.max(30, Math.min(WIDTH - 30, p.x));
    p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));

    if (dx !== 0 || dy !== 0) p.angle = Math.atan2(dy, dx) + Math.PI / 2;

    if (p.invincibleTime > 0) p.invincibleTime--;
    if (p.shieldRegenCooldown > 0) p.shieldRegenCooldown--;
    if (p.shieldRegenCooldown <= 0 && p.shield < p.maxShield) {
      p.shield = Math.min(p.maxShield, p.shield + 0.15);
    }

    if (p.shootCooldown > 0) p.shootCooldown--;
    if (this.state.mouseDown && p.shootCooldown <= 0 && this.canvas) {
      p.shootCooldown = p.shipStats.fireRate;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const mx = this.state.mouseX * scaleX;
      const my = this.state.mouseY * scaleY;
      const tx = mx - p.x;
      const ty = my - p.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > 1) {
        this.state.bullets.push({
          x: p.x, y: p.y,
          vx: (tx / dist) * BULLET_SPEED,
          vy: (ty / dist) * BULLET_SPEED,
          life: BULLET_LIFE,
          fromPlayer: true,
        });
      }
    }

    const sys = this.state.systems[p.currentSystemId];
    if (!sys) return;

    for (const station of sys.stations) {
      const dx = p.x - station.x;
      const dy = p.y - station.y;
      if (Math.sqrt(dx * dx + dy * dy) < STATION_DOCK_RADIUS) {
        this.dockAtStation(station.id);
        return;
      }
    }

    if (this.state.screen === "space") {
      for (const gate of sys.gates) {
        const dx = p.x - gate.x;
        const dy = p.y - gate.y;
        if (Math.sqrt(dx * dx + dy * dy) < GATE_TRAVEL_RADIUS) {
          this.travelThroughGate(gate.targetSystemId, gate.targetGateId);
          return;
        }
      }
    }
  }

  private dockAtStation(stationId: string) {
    const p = this.state.player;
    p.dockedStationId = stationId;
    p.vx = 0; p.vy = 0;
    this.state.selectedStationId = stationId;
    this.state.stationTab = "trade";
    this.state.screen = "station";
    this.onStateChange();
    this.notify("Docked at station");

    for (const mission of p.activeMissions) {
      if (mission.type === "delivery" && mission.targetStationId === stationId && !mission.complete) {
        mission.complete = true;
        p.credits += mission.reward;
        this.giveXp(mission.xpReward);
        this.notify(`Mission complete: ${mission.title} (+${mission.reward} credits)`);
        this.addLog(`Mission complete: +${mission.reward} CR`);
      }
    }
    p.activeMissions = p.activeMissions.filter(m => !(m.complete));

    const sys = this.state.systems[p.currentSystemId];
    for (const st of sys.stations) {
      if (st.id === stationId) {
        if (this.state.tick - st.lastPriceUpdate > 600) {
          this.updateStationPrices(st);
          st.lastPriceUpdate = this.state.tick;
        }
        st.missions = generateMissions(st.id, this.state.systems);
      }
    }
  }

  private travelThroughGate(targetSysId: string, targetGateId: string) {
    const p = this.state.player;
    const targetSys = this.state.systems[targetSysId];
    if (!targetSys) return;
    const targetGate = targetSys.gates.find(g => g.id === targetGateId);
    if (!targetGate) return;
    p.currentSystemId = targetSysId;
    p.x = targetGate.x + 120 * Math.cos(Math.random() * Math.PI * 2);
    p.y = targetGate.y + 120 * Math.sin(Math.random() * Math.PI * 2);
    p.vx = 0; p.vy = 0;
    p.systemsVisited.add(targetSysId);
    this.spawnParticles(p.x, p.y, "#00ffff", 30, 4);
    this.notify(`Arrived in ${targetSys.name}`);

    for (const mission of p.activeMissions) {
      if (mission.type === "exploration" && mission.targetSystemId === targetSysId && !mission.complete) {
        mission.complete = true;
        p.credits += mission.reward;
        this.giveXp(mission.xpReward);
        this.notify(`Mission complete: ${mission.title} (+${mission.reward} credits)`);
      }
    }
    p.activeMissions = p.activeMissions.filter(m => !m.complete);
    this.onStateChange();
  }

  private updateStationPrices(st: Station) {
    for (const key of Object.keys(st.prices)) {
      st.supply[key] = Math.max(5, Math.min(100, (st.supply[key] || 50) + Math.floor(Math.random() * 20) - 10));
      st.demand[key] = Math.max(5, Math.min(100, (st.demand[key] || 50) + Math.floor(Math.random() * 20) - 10));
    }
  }

  private updateEnemies() {
    const p = this.state.player;
    if (p.dockedStationId) return;
    const sys = this.state.systems[p.currentSystemId];
    if (!sys) return;

    if (Math.random() < sys.pirateSpawnRate && sys.enemies.length < 6) {
      this.spawnEnemy(sys);
    }

    for (let i = sys.enemies.length - 1; i >= 0; i--) {
      const e = sys.enemies[i];
      const ddx = p.x - e.x;
      const ddy = p.y - e.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (dist < 400) {
        e.state = "chase";
      } else if (dist > 700) {
        e.state = "patrol";
      }

      if (e.state === "chase") {
        e.angle = Math.atan2(ddy, ddx);
        e.vx += Math.cos(e.angle) * 0.15;
        e.vy += Math.sin(e.angle) * 0.15;
      } else {
        e.patrolAngle += 0.01;
        e.vx += Math.cos(e.patrolAngle) * 0.05;
        e.vy += Math.sin(e.patrolAngle) * 0.05;
      }

      const eSpd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (eSpd > e.speed) { e.vx = (e.vx / eSpd) * e.speed; e.vy = (e.vy / eSpd) * e.speed; }

      e.x += e.vx;
      e.y += e.vy;

      e.x = Math.max(-100, Math.min(WIDTH + 100, e.x));
      e.y = Math.max(-100, Math.min(HEIGHT + 100, e.y));

      if (e.state === "chase") {
        e.shootCooldown--;
        if (e.shootCooldown <= 0 && dist < 350) {
          e.shootCooldown = 80 + Math.floor(Math.random() * 40);
          const ang = Math.atan2(ddy, ddx);
          this.state.bullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(ang) * ENEMY_BULLET_SPEED,
            vy: Math.sin(ang) * ENEMY_BULLET_SPEED,
            life: 50,
            fromPlayer: false,
          });
        }
      }

      if (e.shield > 0) {
        e.shield = Math.min(e.maxShield, e.shield + 0.05);
      }
    }
  }

  private updateBullets() {
    const p = this.state.player;
    const sys = this.state.systems[p.currentSystemId];

    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.x < -50 || b.x > WIDTH + 50 || b.y < -50 || b.y > HEIGHT + 50) {
        this.state.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer && sys) {
        for (let j = sys.enemies.length - 1; j >= 0; j--) {
          const e = sys.enemies[j];
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < 18) {
            this.state.bullets.splice(i, 1);
            this.spawnParticles(e.x, e.y, "#ff6600", 5, 3);
            let dmg = p.shipStats.bulletDamage;
            if (e.shield > 0) {
              const shDmg = Math.min(e.shield, dmg);
              e.shield -= shDmg;
              dmg -= shDmg;
            }
            e.hp -= dmg;
            if (e.hp <= 0) {
              this.spawnParticles(e.x, e.y, "#ff4400", 25, 6);
              this.spawnParticles(e.x, e.y, "#ffaa00", 15, 4);
              p.credits += e.creditReward;
              p.totalKills++;
              this.giveXp(e.xpReward);
              this.addLog(`Destroyed ${e.name}! +${e.creditReward} CR`);
              for (const m of p.activeMissions) {
                if (m.type === "combat" && !m.complete && m.killsRequired) {
                  m.killCount = (m.killCount || 0) + 1;
                  if (m.killCount >= m.killsRequired) {
                    m.complete = true;
                    p.credits += m.reward;
                    this.giveXp(m.xpReward);
                    this.notify(`Mission complete: ${m.title} (+${m.reward} credits)`);
                  }
                }
              }
              p.activeMissions = p.activeMissions.filter(m => !m.complete);
              sys.enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      if (!b.fromPlayer && p.invincibleTime <= 0) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 16) {
          this.state.bullets.splice(i, 1);
          this.spawnParticles(p.x, p.y, "#ff0000", 8, 4);
          p.invincibleTime = 20;
          p.shieldRegenCooldown = 180;
          const dmg = 8 + Math.random() * 5;
          if (p.shield > 0) {
            const shDmg = Math.min(p.shield, dmg);
            p.shield -= shDmg;
            const hullDmg = dmg - shDmg;
            p.hp -= hullDmg;
          } else {
            p.hp -= dmg;
          }
          this.addLog(`Hull hit! -${dmg.toFixed(0)} HP`);
          if (p.hp <= 0) {
            p.hp = 0;
            this.state.screen = "gameover";
            this.onStateChange();
          }
        }
      }
    }
  }

  private updateParticles() {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const pt = this.state.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.95;
      pt.vy *= 0.95;
      pt.life--;
      if (pt.life <= 0) this.state.particles.splice(i, 1);
    }
  }

  update() {
    if (this.state.screen !== "space" && this.state.screen !== "starmap") return;
    this.state.tick++;
    if (this.state.notification && --this.state.notification.ttl <= 0) {
      this.state.notification = null;
    }
    if (this.state.screen === "space") {
      this.updatePlayer();
      this.updateEnemies();
      this.updateBullets();
      this.updateParticles();
    }
  }

  render() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const { screen, player: p } = this.state;

    if (screen === "title") {
      this.renderTitle(ctx, canvas);
    } else if (screen === "space") {
      this.renderSpace(ctx);
    } else if (screen === "starmap") {
      this.renderStarmap(ctx, canvas);
    } else if (screen === "gameover") {
      this.renderGameOver(ctx, canvas);
    } else {
      ctx.fillStyle = "#000011";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  private renderTitle(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = "#000011";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const sys of Object.values(this.state.systems)) {
      const stars = (sys as any).stars;
      for (const s of stars.slice(0, 20)) {
        const b = Math.floor(s.brightness * 255);
        ctx.fillStyle = `rgb(${b},${b},${b})`;
        ctx.beginPath();
        ctx.arc((s.x / 2400) * WIDTH, (s.y / 1800) * HEIGHT, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#00ffff";
    ctx.font = `bold ${Math.floor(HEIGHT * 0.09)}px Courier New`;
    ctx.textAlign = "center";
    ctx.fillText("STAR WANDERER", WIDTH / 2, HEIGHT * 0.35);
    ctx.restore();
    ctx.fillStyle = "#88ccff";
    ctx.font = `${Math.floor(HEIGHT * 0.025)}px Courier New`;
    ctx.textAlign = "center";
    ctx.fillText("A Solo Space Sandbox Adventure", WIDTH / 2, HEIGHT * 0.44);
    ctx.fillStyle = "#00ff88";
    ctx.font = `${Math.floor(HEIGHT * 0.028)}px Courier New`;
    ctx.fillText("[ PRESS SPACE OR CLICK TO BEGIN ]", WIDTH / 2, HEIGHT * 0.58);
    ctx.fillStyle = "#556677";
    ctx.font = `${Math.floor(HEIGHT * 0.02)}px Courier New`;
    ctx.fillText("WASD/Arrows: Move  |  Mouse: Aim & Fire  |  M: Star Map  |  Fly to station to dock", WIDTH / 2, HEIGHT * 0.92);
  }

  private renderSpace(ctx: CanvasRenderingContext2D) {
    const sys = this.state.systems[this.state.player.currentSystemId];
    if (!sys) return;

    ctx.fillStyle = "#000008";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const s of sys.stars) {
      const b = Math.floor(s.brightness * 200);
      ctx.fillStyle = `rgb(${b},${b},${b + 20})`;
      ctx.beginPath();
      ctx.arc(s.x % WIDTH, s.y % HEIGHT, s.brightness > 0.8 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.shadowColor = sys.color;
    ctx.shadowBlur = 40;
    ctx.fillStyle = sys.color;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, sys.starRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const st of sys.stations) {
      this.renderStation(ctx, st);
    }
    for (const gate of sys.gates) {
      this.renderGate(ctx, gate);
    }

    this.renderParticles(ctx);

    for (const e of sys.enemies) {
      this.renderEnemy(ctx, e);
    }

    this.renderBullets(ctx);
    this.renderPlayerShip(ctx);
    this.renderHUD(ctx, sys);
  }

  private renderStation(ctx: CanvasRenderingContext2D, st: Station) {
    ctx.save();
    ctx.translate(st.x, st.y);
    const angle = (this.state.tick * 0.005) % (Math.PI * 2);
    ctx.rotate(angle);
    ctx.strokeStyle = "#4488ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#4488ff";
    ctx.shadowBlur = 10;
    ctx.strokeRect(-22, -22, 44, 44);
    ctx.strokeStyle = "#88aaff";
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();
    ctx.fillStyle = "#88aaff";
    ctx.font = "13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(st.name, st.x, st.y + 40);
    ctx.fillStyle = "#44ff88";
    ctx.font = "11px Courier New";
    ctx.fillText("[DOCK]", st.x, st.y + 55);
  }

  private renderGate(ctx: CanvasRenderingContext2D, gate: any) {
    const t = this.state.tick;
    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(t * 0.02);
    ctx.strokeStyle = "#ff8800";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff8800";
    ctx.shadowBlur = 15;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i / 3) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(10, 40);
      ctx.lineTo(-10, 40);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    const tSys = this.state.systems[gate.targetSystemId];
    ctx.fillStyle = "#ffaa44";
    ctx.font = "13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(tSys ? `→ ${tSys.name}` : "Gate", gate.x, gate.y + 55);
  }

  private renderPlayerShip(ctx: CanvasRenderingContext2D) {
    const p = this.state.player;
    if (p.invincibleTime > 0 && Math.floor(p.invincibleTime / 3) % 2 === 0) return;

    const s = 18;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#00ffee";
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.65, s * 0.8);
    ctx.lineTo(0, s * 0.4);
    ctx.lineTo(s * 0.65, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.state.keys["w"] || this.state.keys["W"] || this.state.keys["ArrowUp"] ||
      this.state.keys["s"] || this.state.keys["S"] || this.state.keys["ArrowDown"] ||
      this.state.keys["a"] || this.state.keys["A"] || this.state.keys["ArrowLeft"] ||
      this.state.keys["d"] || this.state.keys["D"] || this.state.keys["ArrowRight"]) {
      ctx.fillStyle = `rgba(255, 150, 0, ${0.6 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(-6, s * 0.5);
      ctx.lineTo(6, s * 0.5);
      ctx.lineTo(0, s * (0.9 + Math.random() * 0.4));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private renderEnemy(ctx: CanvasRenderingContext2D, e: EnemyShip) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle + Math.PI / 2);
    ctx.fillStyle = "#ff4400";
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-10, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const bw = 30;
    const bh = 4;
    ctx.fillStyle = "#333";
    ctx.fillRect(e.x - bw / 2, e.y - 26, bw, bh);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(e.x - bw / 2, e.y - 26, (e.hp / e.maxHp) * bw, bh);
    if (e.maxShield > 0) {
      ctx.fillStyle = "#4488ff";
      ctx.fillRect(e.x - bw / 2, e.y - 20, (e.shield / e.maxShield) * bw, 3);
    }
  }

  private renderBullets(ctx: CanvasRenderingContext2D) {
    for (const b of this.state.bullets) {
      ctx.save();
      ctx.shadowColor = b.fromPlayer ? "#00ffff" : "#ff6600";
      ctx.shadowBlur = 8;
      ctx.fillStyle = b.fromPlayer ? "#00ffff" : "#ff8800";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const pt of this.state.particles) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderHUD(ctx: CanvasRenderingContext2D, sys: StarSystem) {
    const p = this.state.player;
    ctx.fillStyle = "rgba(0,0,20,0.7)";
    ctx.fillRect(10, 10, 220, 130);
    ctx.strokeStyle = "#224466";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 220, 130);

    ctx.fillStyle = "#66aacc";
    ctx.font = "12px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`SYSTEM: ${sys.name}`, 20, 30);
    ctx.fillText(`CREDITS: ${Math.floor(p.credits)} CR`, 20, 48);
    ctx.fillText(`LEVEL: ${p.level} | XP: ${p.xp}/${getXpForNextLevel(p.level)}`, 20, 66);

    ctx.fillStyle = "#333";
    ctx.fillRect(20, 74, 190, 10);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(20, 74, Math.max(0, (p.hp / p.maxHp) * 190), 10);
    ctx.fillStyle = "#88ccff";
    ctx.font = "10px Courier New";
    ctx.fillText(`HULL: ${Math.ceil(p.hp)}/${p.maxHp}`, 20, 98);

    ctx.fillStyle = "#333";
    ctx.fillRect(20, 101, 190, 10);
    ctx.fillStyle = "#4466ff";
    ctx.fillRect(20, 101, Math.max(0, (p.shield / p.maxShield) * 190), 10);
    ctx.fillStyle = "#88ccff";
    ctx.fillText(`SHIELD: ${Math.ceil(p.shield)}/${p.maxShield}`, 20, 124);

    const cargo = p.cargo.reduce((a, c) => a + c.amount, 0);
    ctx.fillText(`CARGO: ${cargo}/${p.cargoCapacity}`, 120, 98);

    const enemies = sys.enemies.length;
    if (enemies > 0) {
      ctx.fillStyle = "#ff4444";
      ctx.font = "13px Courier New";
      ctx.textAlign = "right";
      ctx.fillText(`⚠ ${enemies} PIRATE${enemies > 1 ? "S" : ""} NEARBY`, WIDTH - 20, 30);
    }

    if (this.state.combatLog.length > 0) {
      ctx.fillStyle = "rgba(0,0,20,0.7)";
      ctx.fillRect(WIDTH - 280, HEIGHT - 180, 270, 170);
      ctx.strokeStyle = "#224466";
      ctx.strokeRect(WIDTH - 280, HEIGHT - 180, 270, 170);
      ctx.font = "11px Courier New";
      this.state.combatLog.forEach((log, i) => {
        const alpha = 1 - i * 0.12;
        ctx.globalAlpha = Math.max(0.2, alpha);
        ctx.fillStyle = "#88ccff";
        ctx.textAlign = "left";
        ctx.fillText(log, WIDTH - 274, HEIGHT - 160 + i * 18);
      });
      ctx.globalAlpha = 1;
    }

    if (this.state.notification) {
      const alpha = Math.min(1, this.state.notification.ttl / 60);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,20,40,0.85)";
      const tw = ctx.measureText(this.state.notification.text).width;
      ctx.fillRect(WIDTH / 2 - tw / 2 - 16, HEIGHT * 0.15 - 16, tw + 32, 32);
      ctx.fillStyle = "#00ffaa";
      ctx.font = "bold 15px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(this.state.notification.text, WIDTH / 2, HEIGHT * 0.15 + 5);
      ctx.globalAlpha = 1;
    }

    if (p.activeMissions.length > 0) {
      ctx.fillStyle = "rgba(0,0,20,0.7)";
      ctx.fillRect(10, HEIGHT - 140, 250, 130);
      ctx.strokeStyle = "#224466";
      ctx.strokeRect(10, HEIGHT - 140, 250, 130);
      ctx.fillStyle = "#ffdd44";
      ctx.font = "12px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("ACTIVE MISSIONS", 20, HEIGHT - 122);
      p.activeMissions.slice(0, 4).forEach((m, i) => {
        ctx.fillStyle = "#88aacc";
        ctx.font = "10px Courier New";
        let label = m.title;
        if (m.type === "combat" && m.killsRequired) {
          label += ` (${m.killCount || 0}/${m.killsRequired})`;
        }
        ctx.fillText(label.length > 30 ? label.slice(0, 28) + "…" : label, 20, HEIGHT - 104 + i * 20);
      });
    }

    ctx.fillStyle = "#334455";
    ctx.font = "11px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("WASD: Move  |  Mouse: Fire  |  M: Star Map  |  Approach station to dock", WIDTH / 2, HEIGHT - 10);
    ctx.textAlign = "left";
  }

  private renderStarmap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = "#000010";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const systems = Object.values(this.state.systems);
    const drawn = new Set<string>();

    for (const sys of systems) {
      for (const gate of sys.gates) {
        const key = [sys.id, gate.targetSystemId].sort().join("|");
        if (!drawn.has(key)) {
          drawn.add(key);
          const target = this.state.systems[gate.targetSystemId];
          if (!target) continue;
          ctx.strokeStyle = "#223344";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 8]);
          ctx.beginPath();
          ctx.moveTo(sys.mapX, sys.mapY);
          ctx.lineTo(target.mapX, target.mapY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    for (const sys of systems) {
      const visited = this.state.player.systemsVisited.has(sys.id);
      const isCurrent = sys.id === this.state.player.currentSystemId;
      const isSelected = this.state.mapSelectedSystem === sys.id;

      ctx.save();
      ctx.shadowColor = sys.color;
      ctx.shadowBlur = isCurrent ? 30 : isSelected ? 20 : 10;
      ctx.fillStyle = visited ? sys.color : "#334455";
      ctx.beginPath();
      ctx.arc(sys.mapX, sys.mapY, isCurrent ? 14 : 10, 0, Math.PI * 2);
      ctx.fill();
      if (isCurrent) {
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = visited ? "#ccddff" : "#445566";
      ctx.font = "14px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(sys.name, sys.mapX, sys.mapY + 26);
      if (isCurrent) {
        ctx.fillStyle = "#00ffaa";
        ctx.font = "11px Courier New";
        ctx.fillText("◄ YOU ARE HERE", sys.mapX, sys.mapY + 42);
      }
    }

    if (this.state.mapSelectedSystem) {
      const sel = this.state.systems[this.state.mapSelectedSystem];
      if (sel) {
        ctx.fillStyle = "rgba(0,0,30,0.9)";
        ctx.fillRect(WIDTH - 360, HEIGHT - 180, 350, 170);
        ctx.strokeStyle = "#335577";
        ctx.lineWidth = 1;
        ctx.strokeRect(WIDTH - 360, HEIGHT - 180, 350, 170);
        ctx.fillStyle = "#88ccff";
        ctx.font = "bold 15px Courier New";
        ctx.textAlign = "left";
        ctx.fillText(sel.name.toUpperCase(), WIDTH - 344, HEIGHT - 156);
        ctx.font = "13px Courier New";
        ctx.fillStyle = "#66aacc";
        ctx.fillText(`Stations: ${sel.stations.length}`, WIDTH - 344, HEIGHT - 132);
        ctx.fillText(`Jump Gates: ${sel.gates.length}`, WIDTH - 344, HEIGHT - 112);
        ctx.fillStyle = this.state.player.systemsVisited.has(sel.id) ? "#44ff88" : "#ff8844";
        ctx.fillText(this.state.player.systemsVisited.has(sel.id) ? "Status: Visited" : "Status: Unknown", WIDTH - 344, HEIGHT - 92);
        sel.stations.forEach((st, i) => {
          ctx.fillStyle = "#88aacc";
          ctx.font = "12px Courier New";
          ctx.fillText(`• ${st.name}`, WIDTH - 344, HEIGHT - 68 + i * 18);
        });
      }
    }

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 18px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("STAR MAP", WIDTH / 2, 40);
    ctx.fillStyle = "#445566";
    ctx.font = "13px Courier New";
    ctx.fillText("Click a system to view details  |  Press M to close", WIDTH / 2, HEIGHT - 20);
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = "#000008";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#ff4422";
    ctx.font = `bold ${Math.floor(HEIGHT * 0.1)}px Courier New`;
    ctx.textAlign = "center";
    ctx.fillText("SHIP DESTROYED", WIDTH / 2, HEIGHT * 0.38);
    ctx.restore();
    ctx.fillStyle = "#88aacc";
    ctx.font = `${Math.floor(HEIGHT * 0.03)}px Courier New`;
    ctx.fillText(`Total Kills: ${this.state.player.totalKills}`, WIDTH / 2, HEIGHT * 0.52);
    ctx.fillText(`Credits Earned: ${Math.floor(this.state.player.credits)} CR`, WIDTH / 2, HEIGHT * 0.58);
    ctx.fillText(`Level Reached: ${this.state.player.level}`, WIDTH / 2, HEIGHT * 0.64);
    ctx.fillStyle = "#00ff88";
    ctx.font = `${Math.floor(HEIGHT * 0.03)}px Courier New`;
    ctx.fillText("[ PRESS SPACE OR CLICK TO RESTART ]", WIDTH / 2, HEIGHT * 0.76);
  }

  handleKeyDown(key: string) {
    this.state.keys[key] = true;
    if (key === "m" || key === "M") {
      if (this.state.screen === "space") {
        this.state.screen = "starmap";
        this.state.mapSelectedSystem = this.state.player.currentSystemId;
        this.onStateChange();
      } else if (this.state.screen === "starmap") {
        this.state.screen = "space";
        this.onStateChange();
      }
    }
    if (key === " " || key === "Escape") {
      if (this.state.screen === "title") {
        this.state.screen = "space";
        this.onStateChange();
      } else if (this.state.screen === "gameover") {
        this.restartGame();
      } else if (this.state.screen === "starmap") {
        this.state.screen = "space";
        this.onStateChange();
      }
    }
  }

  handleKeyUp(key: string) {
    this.state.keys[key] = false;
  }

  handleMouseMove(x: number, y: number) {
    this.state.mouseX = x;
    this.state.mouseY = y;
  }

  handleMouseDown(x: number, y: number) {
    this.state.mouseDown = true;
    this.state.mouseX = x;
    this.state.mouseY = y;
    if (this.state.screen === "title") {
      this.state.screen = "space";
      this.onStateChange();
    } else if (this.state.screen === "gameover") {
      this.restartGame();
    } else if (this.state.screen === "starmap" && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const cx = x * scaleX;
      const cy = y * scaleY;
      for (const sys of Object.values(this.state.systems)) {
        const dx = cx - sys.mapX;
        const dy = cy - sys.mapY;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          this.state.mapSelectedSystem = sys.id;
          this.onStateChange();
          break;
        }
      }
    }
  }

  handleMouseUp() {
    this.state.mouseDown = false;
  }

  undock() {
    const p = this.state.player;
    const sys = this.state.systems[p.currentSystemId];
    if (!sys) return;
    const station = sys.stations.find(s => s.id === p.dockedStationId);
    if (station) {
      p.x = station.x + 90;
      p.y = station.y;
    }
    p.dockedStationId = null;
    this.state.screen = "space";
    this.onStateChange();
  }

  buyItem(stationId: string, commodity: string, amount: number) {
    const p = this.state.player;
    const sys = this.state.systems[p.currentSystemId];
    const station = sys?.stations.find(s => s.id === stationId);
    if (!station) return;
    const price = Math.floor(station.prices[commodity] * amount);
    const cargoUsed = p.cargo.reduce((a, c) => a + c.amount, 0);
    if (cargoUsed + amount > p.cargoCapacity) {
      this.notify("Not enough cargo space!");
      return;
    }
    if (p.credits < price) {
      this.notify("Not enough credits!");
      return;
    }
    p.credits -= price;
    const existing = p.cargo.find(c => c.commodity === commodity);
    if (existing) {
      const totalCost = existing.buyPrice * existing.amount + price;
      existing.amount += amount;
      existing.buyPrice = totalCost / existing.amount;
    } else {
      p.cargo.push({ commodity, amount, buyPrice: station.prices[commodity] });
    }
    this.notify(`Purchased ${amount}x ${commodity} for ${price} CR`);
    this.onStateChange();
  }

  sellItem(stationId: string, commodity: string, amount: number) {
    const p = this.state.player;
    const sys = this.state.systems[p.currentSystemId];
    const station = sys?.stations.find(s => s.id === stationId);
    if (!station) return;
    const cargoItem = p.cargo.find(c => c.commodity === commodity);
    if (!cargoItem || cargoItem.amount < amount) {
      this.notify("Not enough cargo!");
      return;
    }
    const salePrice = Math.floor(station.prices[commodity] * amount);
    p.credits += salePrice;
    const profit = salePrice - Math.floor(cargoItem.buyPrice * amount);
    cargoItem.amount -= amount;
    if (cargoItem.amount <= 0) p.cargo = p.cargo.filter(c => c.commodity !== commodity);
    this.notify(`Sold ${amount}x ${commodity} for ${salePrice} CR (profit: ${profit >= 0 ? "+" : ""}${profit} CR)`);
    this.onStateChange();
  }

  acceptMission(stationId: string, missionId: string) {
    const p = this.state.player;
    if (p.activeMissions.length >= 4) {
      this.notify("Mission log full (max 4 active)");
      return;
    }
    const sys = this.state.systems[p.currentSystemId];
    const station = sys?.stations.find(s => s.id === stationId);
    if (!station) return;
    const mission = station.missions.find(m => m.id === missionId);
    if (!mission) return;
    mission.accepted = true;
    p.activeMissions.push({ ...mission });
    station.missions = station.missions.filter(m => m.id !== missionId);
    this.notify(`Mission accepted: ${mission.title}`);
    this.onStateChange();
  }

  buyUpgrade(upgradeId: string) {
    const p = this.state.player;
    const upg = UPGRADES_LIST.find((u: any) => u.id === upgradeId);
    if (!upg) return;
    if (p.credits < upg.cost) {
      this.notify("Not enough credits!");
      return;
    }
    p.credits -= upg.cost;
    const stats = p.shipStats as any;
    stats[upg.stat] = +(stats[upg.stat] + upg.delta).toFixed(2);
    if (upg.stat === "maxShield") p.shield = Math.min(p.shield + upg.delta, stats.maxShield);
    if (upg.stat === "maxHull") p.hp = Math.min(p.hp + upg.delta * 0.5, stats.maxHull);
    this.notify(`Installed: ${upg.name}`);
    this.onStateChange();
  }

  buyShip(shipType: string) {
    const p = this.state.player;
    const newStats = SHIP_STATS[shipType];
    if (!newStats) return;
    if (p.credits < newStats.cost) {
      this.notify("Not enough credits!");
      return;
    }
    p.credits -= newStats.cost;
    p.shipStats = { ...newStats };
    p.maxHp = newStats.maxHull;
    p.hp = newStats.maxHull;
    p.maxShield = newStats.maxShield;
    p.shield = newStats.maxShield;
    p.cargoCapacity = newStats.cargoCapacity;
    p.cargo = [];
    this.notify(`Purchased ${newStats.name}!`);
    this.onStateChange();
  }

  restartGame() {
    const systems = buildInitialSystems();
    Object.values(systems).forEach(sys => {
      sys.stations.forEach(st => {
        st.missions = generateMissions(st.id, systems);
      });
    });
    const scout = SHIP_STATS["scout"];
    this.state = {
      screen: "space",
      player: {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        vx: 0, vy: 0,
        angle: 0,
        hp: scout.maxHull, maxHp: scout.maxHull,
        shield: scout.maxShield, maxShield: scout.maxShield,
        cargoCapacity: scout.cargoCapacity,
        cargo: [],
        credits: 1000,
        xp: 0,
        level: 1,
        currentSystemId: "sol",
        shipStats: { ...scout },
        activeMissions: [],
        skills: {},
        totalKills: 0,
        systemsVisited: new Set(["sol"]),
        dockedStationId: null,
        shieldRegenCooldown: 0,
        shootCooldown: 0,
        invincibleTime: 0,
      },
      systems,
      bullets: [],
      particles: [],
      keys: {},
      mouseX: 0,
      mouseY: 0,
      mouseDown: false,
      tick: 0,
      combatLog: [],
      notification: null,
      selectedStationId: null,
      stationTab: "trade",
      mapSelectedSystem: null,
      enemyIdCounter: 0,
    };
    this.onStateChange();
  }
}
