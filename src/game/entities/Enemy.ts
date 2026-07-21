import { STAT_SCALING, TUNING } from "../config";
import { MAP_CONFIG, clampToWorld } from "../data/mapConfig";
import { getShipClass, shipClasses, type ShipClassId } from "../data/shipClasses";
import { emptyStats } from "../data/stats";
import { createId } from "../id";
import { angleTo, clamp, distance, fromAngle, normalize, randomRange } from "../math";
import type { AlienDefenderType, BotRole, Vec2 } from "../types";
import { Projectile } from "./Projectile";

const names = ["Vega", "Kite", "IonFox", "Pulse", "Kepler", "Mintaka", "Umbra", "Quasar", "Sable", "Lumen", "Arc", "Rook"];
const roles: BotRole[] = ["farmer", "aggressor", "sniper", "rammer", "carrier", "coward"];

export class Enemy {
  id = createId("enemy");
  name = names[Math.floor(Math.random() * names.length)];
  role: BotRole = roles[Math.floor(Math.random() * roles.length)];
  alienType: AlienDefenderType = "sentinel";
  pos: Vec2 = { x: randomRange(-MAP_CONFIG.halfWidth + 140, MAP_CONFIG.halfWidth - 140), y: randomRange(-MAP_CONFIG.halfHeight + 140, MAP_CONFIG.halfHeight - 140) };
  vel: Vec2 = { x: 0, y: 0 };
  radius = 24;
  angle = 0;
  health = 100;
  maxHealth = 100;
  level = Math.floor(randomRange(3, 24));
  score = Math.floor(randomRange(150, 3200));
  shipClassId: ShipClassId;
  stats = emptyStats();
  fireCooldown = randomRange(0, 0.6);
  color = ["#c7747a", "#bd8b45", "#8e80b8", "#5aa6c8", "#b65c58"][Math.floor(Math.random() * 5)];
  private decisionTimer = 0;
  private aggroTimer = 0;
  home: Vec2 = { x: 0, y: 0 };
  patrolRadius = 900;
  aggroRadius = 1250;
  leashRadius = 2600;
  currentTargetPlayerId: string | null = null;
  reactionTimer = randomRange(0.3, 1.2);
  retargetCooldown = 0;
  state: "patrol" | "warning" | "attacking" | "returning" = "patrol";
  threatTable: Record<string, number> = {};
  attackerSlotCost = 1;
  private patrolTarget: Vec2 = { x: randomRange(-MAP_CONFIG.halfWidth + 220, MAP_CONFIG.halfWidth - 220), y: randomRange(-MAP_CONFIG.halfHeight + 220, MAP_CONFIG.halfHeight - 220) };
  private strafeSide = Math.random() > 0.5 ? 1 : -1;

  constructor() {
    this.shipClassId = this.role === "carrier" ? "drone-carrier" : this.role === "sniper" ? "longshot-vessel" : this.role === "rammer" ? "scatter-raider" : "scout-frigate";
    for (let i = 0; i < Math.min(18, this.level); i += 1) {
      const priorities = this.role === "rammer" ? ["maxHealth", "bodyDamage", "movementSpeed"] : this.role === "sniper" ? ["bulletSpeed", "bulletPenetration", "bulletDamage"] : ["bulletDamage", "reloadSpeed", "movementSpeed"];
      const key = priorities[Math.floor(Math.random() * priorities.length)] as keyof typeof this.stats;
      this.stats[key] = Math.min(7, this.stats[key] + 1);
    }
    if (this.level >= 30) {
      const options = shipClasses.filter((ship) => ship.tier === 3);
      this.shipClassId = options[Math.floor(Math.random() * options.length)].id;
    }
    this.maxHealth = 96 + this.stats.maxHealth * 11;
    this.health = this.maxHealth;
  }

  static createAlienDefender(index: number) {
    const enemy = new Enemy();
    const types: AlienDefenderType[] = ["sentinel", "interceptor", "beam_guard", "mine_warden", "carrier"];
    enemy.alienType = index === 0 ? "core_guardian" : types[index % types.length];
    enemy.role = enemy.alienType === "interceptor" ? "aggressor" : enemy.alienType === "carrier" ? "carrier" : enemy.alienType === "core_guardian" ? "sniper" : "farmer";
    const ring = enemy.alienType === "core_guardian" ? 1200 : randomRange(MAP_CONFIG.asteroidBeltInnerRadius, MAP_CONFIG.centerZoneRadius * 0.88);
    const angle = (Math.PI * 2 * index) / TUNING.botCount + randomRange(-0.18, 0.18);
    enemy.home = { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring };
    enemy.pos = { ...enemy.home };
    enemy.patrolTarget = { ...enemy.home };
    enemy.patrolRadius = enemy.alienType === "core_guardian" ? 1200 : randomRange(650, 1400);
    enemy.aggroRadius = enemy.alienType === "core_guardian" ? 2200 : enemy.alienType === "carrier" ? 1700 : 1450;
    enemy.leashRadius = enemy.alienType === "core_guardian" ? 3600 : 2800;
    enemy.attackerSlotCost = enemy.alienType === "core_guardian" ? 3 : enemy.alienType === "carrier" ? 2 : 1;
    enemy.color = enemy.alienType === "core_guardian" ? "#b65c58" : enemy.alienType === "beam_guard" ? "#b7c8dc" : "#8e80b8";
    enemy.level = enemy.alienType === "core_guardian" ? 45 : Math.floor(randomRange(12, 30));
    enemy.maxHealth = enemy.alienType === "core_guardian" ? 540 : enemy.alienType === "carrier" ? 220 : 145;
    enemy.health = enemy.maxHealth;
    return enemy;
  }

  get ship() {
    return getShipClass(this.shipClassId);
  }

  update(dt: number, playerPos: Vec2, asteroids: Vec2[], projectiles: Projectile[]) {
    const playerDistance = distance(this.pos, playerPos);
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0 || distance(this.pos, this.patrolTarget) < 80) {
      this.decisionTimer = randomRange(1.1, 2.9);
      this.patrolTarget = { x: randomRange(-MAP_CONFIG.halfWidth + 220, MAP_CONFIG.halfWidth - 220), y: randomRange(-MAP_CONFIG.halfHeight + 220, MAP_CONFIG.halfHeight - 220) };
      if (Math.random() > 0.62) this.strafeSide *= -1;
    }

    const aggroRange = this.role === "sniper" ? 980 : this.role === "aggressor" ? 760 : this.role === "rammer" ? 620 : this.role === "carrier" ? 640 : 470;
    if (playerDistance < aggroRange && this.health > this.maxHealth * 0.26) this.aggroTimer = this.role === "coward" ? 1.2 : randomRange(2.4, 4.8);
    else this.aggroTimer = Math.max(0, this.aggroTimer - dt);

    const shouldFight = this.aggroTimer > 0 && this.role !== "farmer";
    let target = shouldFight ? playerPos : this.patrolTarget;
    let desiredRange = this.role === "sniper" ? 760 : this.role === "rammer" ? 36 : this.role === "carrier" ? 520 : 430;

    if (!shouldFight && asteroids.length && (this.role === "farmer" || this.role === "carrier" || this.role === "coward")) {
      target = asteroids.reduce((best, asteroid) => (distance(this.pos, asteroid) < distance(this.pos, best) ? asteroid : best), asteroids[0]);
      desiredRange = 40;
    }
    if (this.role === "coward" && this.health < this.maxHealth * 0.55) {
      target = playerPos;
      desiredRange = 980;
    }

    const toTarget = angleTo(this.pos, target);
    this.angle = shouldFight ? angleTo(this.pos, playerPos) : toTarget;
    const d = distance(this.pos, target);
    const sign = d > desiredRange + 80 ? 1 : d < desiredRange - 70 ? -1 : 0;
    const approach = fromAngle(toTarget, sign);
    const orbit = shouldFight && this.role !== "rammer" ? fromAngle(toTarget + Math.PI / 2, this.strafeSide * 0.42) : { x: 0, y: 0 };
    const dir = normalize({ x: approach.x + orbit.x, y: approach.y + orbit.y });
    const speed = TUNING.playerBaseSpeed * 0.72 * (1 + this.stats.movementSpeed * STAT_SCALING.movementSpeed) * this.ship.behavior.speed;
    this.vel = { x: dir.x * speed, y: dir.y * speed };
    this.pos = clampToWorld({ x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt }, 70);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (shouldFight && playerDistance < (this.role === "sniper" ? 1100 : 700)) this.fire(projectiles, angleTo(this.pos, playerPos));
    else if (!shouldFight && target !== this.patrolTarget && d < 520 && this.role !== "coward") this.fire(projectiles, toTarget, "enemy");
  }

  fire(projectiles: Projectile[], angle: number, owner: "enemy" | "player" = "enemy") {
    const b = this.ship.behavior;
    const fireDelay = TUNING.baseFireDelay / ((1 + this.stats.reloadSpeed * STAT_SCALING.reloadSpeed) * b.fireRate);
    if (this.fireCooldown > 0) return;
    this.fireCooldown = fireDelay * randomRange(0.9, 1.35);
    const count = Math.min(4, b.cannons);
    const start = count === 1 ? 0 : -b.spread / 2;
    const step = count === 1 ? 0 : b.spread / (count - 1);
    for (let i = 0; i < count; i += 1) {
      projectiles.push(new Projectile({
        pos: { x: this.pos.x + Math.cos(angle) * 30, y: this.pos.y + Math.sin(angle) * 30 },
        angle: angle + start + step * i,
        speed: TUNING.baseProjectileSpeed * 0.82 * (b.projectile === "rail" ? 1.35 : 1),
        radius: b.projectile === "rail" ? 5 : 7,
        damage: TUNING.baseDamage * 0.72 * b.damage,
        lifetime: TUNING.projectileLifetime,
        penetration: 1,
        owner,
        ownerId: this.id,
        kind: b.projectile,
        color: this.color,
      }));
    }
  }
}
