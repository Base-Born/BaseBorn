import { TUNING } from "../config";
import { getBaseShipFrame, type BaseFrameType } from "../data/baseShipFrames";
import { getHullTier } from "../data/hullTiers";
import { MAP_CONFIG, clampToWorld } from "../data/mapConfig";
import { combineModuleBonuses } from "../data/shipModules";
import { getBehaviorProfileForNode } from "../data/shipBehaviorProfiles";
import { getShipNode } from "../data/shipUpgradeTree";
import { emptyStats, type StatKey } from "../data/stats";
import { clamp, fromAngle, length, normalize } from "../math";
import { getEffectivePlayerStats } from "../systems/StatScalingSystem";
import { createCargoStorage, getTotalCargoUsed } from "../systems/CargoSystem";
import { getRandomCornerSpawnPoint } from "../systems/SpawnSystem";
import { calculateDroneModuleStats, calculateProjectileModuleStats, calculateReloadDelay } from "../systems/ModuleStatApplicationSystem";
import { getAvailableUpgradePoints, spendShipUpgradePoint } from "../systems/ShipUpgradeSystem";
import { calculateBuildIdentity } from "../systems/BuildIdentitySystem";
import { getMassMovementModifiers } from "../systems/MassSystem";
import { getHeatModifiers } from "../systems/HeatSystem";
import { getDamageState } from "../systems/DamageVisualizationSystem";
import type { BuildIdentitySnapshot } from "../data/buildIdentity";
import type { Customization, Vec2 } from "../types";
import type { CargoStorage } from "../data/etherTypes";
import type { PlayerLoadout } from "../data/stationTypes";
import { Drone } from "./Drone";
import { Projectile } from "./Projectile";

export class Player {
  id = "player";
  name: string;
  pos: Vec2 = getRandomCornerSpawnPoint(MAP_CONFIG);
  vel: Vec2 = { x: 0, y: 0 };
  radius = 24;
  angle = -Math.PI / 2;
  health = TUNING.playerBaseHealth;
  maxHealth = TUNING.playerBaseHealth;
  shieldHealth = 0;
  maxShield = 0;
  level = 1;
  xp = 0;
  score = 0;
  statPoints = 0;
  stats = emptyStats();
  baseFrameId: BaseFrameType = "balanced";
  frameLevel = 1;
  upgradePointsSpent = 0;
  hyperUpgradeUnlocked = false;
  currentShipId = "space_pod";
  currentBranch = "Core";
  upgradeHistory: string[] = ["space_pod"];
  fireCooldown = 0;
  heat = 0;
  private buildIdentityCache: { signature: string; value: BuildIdentitySnapshot } | null = null;
  lastDamageAt = 0;
  spawnProtectedUntil = performance.now() + 9000;
  destroyedAt = 0;
  thrustWorld: Vec2 = { x: 0, y: 0 };
  thrustLocal = { forward: 0, strafe: 0 };
  customization: Customization;
  drones: Drone[] = [];
  private droneRespawnQueue: number[] = [];
  cargo: CargoStorage = createCargoStorage(100);
  cargoFullUntil = 0;
  cargoPickupEnabled = true;
  dockedStationId: string | null = null;
  dockingState: "free" | "docking" | "docked" | "undocking" = "free";
  dockingAnimationStartedAt = 0;
  dockingAnimationDurationMs = 950;
  dockingFrom = { x: 0, y: 0 };
  dockingTo = { x: 0, y: 0 };
  miningLaserActive = false;
  miningLaserAngle = this.angle;
  miningLaserTarget: { id: string; pos: Vec2; radius: number } | null = null;
  loadout: PlayerLoadout = {
    hullTier: 1,
    craftedModuleIds: [],
    installedModules: [],
  };

  constructor(customization: Customization) {
    this.customization = customization;
    this.name = customization.name || "Nova Pilot";
    this.recalculate();
  }

  resetSpawnProtection(durationMs = 9000) {
    this.spawnProtectedUntil = performance.now() + durationMs;
  }

  get ship() {
    const node = getShipNode(this.currentShipId);
    return {
      id: node.id,
      name: node.name,
      behavior: getBehaviorProfileForNode(node),
      node,
    };
  }

  setClass(id: string) {
    const node = getShipNode(id);
    this.currentShipId = node.id;
    this.currentBranch = node.branch;
    this.upgradeHistory = Array.from(new Set(this.upgradeHistory.concat(node.id)));
    this.syncDrones();
    this.recalculate();
  }

  selectBaseFrame(frameId: BaseFrameType) {
    this.baseFrameId = getBaseShipFrame(frameId).id;
    const frame = getBaseShipFrame(this.baseFrameId);
    this.customization.shipColor = frame.visualTheme.primary;
    this.customization.glowColor = frame.visualTheme.glow;
    this.customization.trailColor = "#4cc9f0";
    this.recalculate();
    this.syncDrones();
  }

  upgrade(key: StatKey) {
    return spendShipUpgradePoint(this, key);
  }

  recalculate() {
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    const frame = getBaseShipFrame(this.baseFrameId);
    const hull = getHullTier(this.loadout.hullTier);
    const moduleBonuses = this.moduleBonuses;
    this.maxHealth = TUNING.playerBaseHealth * effective.maxHealth.multiplier * this.ship.behavior.healthScale * hull.healthMultiplier * moduleBonuses.healthMultiplier;
    this.health = Math.min(this.health, this.maxHealth);
    this.maxShield = TUNING.playerBaseHealth * 0.42 * effective.maxShield.multiplier * moduleBonuses.shieldMultiplier;
    this.shieldHealth = Math.min(this.shieldHealth, this.maxShield);
    this.radius = 24 * this.ship.behavior.radiusScale;
    this.cargo.capacity = Math.round(hull.cargoCapacity + this.ship.behavior.mining.cargoCapacityBonus + (frame.slotBias.flex ?? 0) * 50 + moduleBonuses.cargoBonus);
    this.cargo.used = getTotalCargoUsed(this.cargo);
    this.frameLevel = this.loadout.hullTier;
    this.upgradePointsSpent = Object.values(this.stats).reduce((sum, value) => sum + value, 0);
    this.statPoints = getAvailableUpgradePoints(this);
    this.hyperUpgradeUnlocked = this.level >= 50;
  }

  update(
    dt: number,
    move: Vec2,
    aimWorld: Vec2,
    firing: boolean,
    projectiles: Projectile[],
    miningTarget: { id: string; pos: Vec2; radius: number } | null = null,
  ) {
    const activeMiningTarget = this.currentShipId === "space_pod" && firing ? miningTarget : null;
    const resolvedAim = activeMiningTarget?.pos ?? aimWorld;
    this.angle = Math.atan2(resolvedAim.y - this.pos.y, resolvedAim.x - this.pos.x);
    const forwardAmount = -move.y;
    const strafeAmount = move.x;
    const inputPower = Math.min(1, Math.hypot(forwardAmount, strafeAmount));
    const localForward = inputPower > 0 ? forwardAmount / Math.max(1, Math.hypot(forwardAmount, strafeAmount)) : 0;
    const localStrafe = inputPower > 0 ? strafeAmount / Math.max(1, Math.hypot(forwardAmount, strafeAmount)) : 0;
    const forward = fromAngle(this.angle, 1);
    const right = fromAngle(this.angle + Math.PI / 2, 1);
    const thrust = normalize({
      x: forward.x * forwardAmount + right.x * strafeAmount,
      y: forward.y * forwardAmount + right.y * strafeAmount,
    });
    this.thrustWorld = inputPower > 0 ? thrust : { x: 0, y: 0 };
    this.thrustLocal = { forward: localForward, strafe: localStrafe };
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    const hull = getHullTier(this.loadout.hullTier);
    const moduleBonuses = this.moduleBonuses;
    const buildIdentity = this.buildIdentity;
    const massModifiers = getMassMovementModifiers(buildIdentity.budgets.mass);
    const heatModifiers = getHeatModifiers(this.heat, buildIdentity.budgets.heatCapacity);
    this.heat = Math.max(0, this.heat - (18 + buildIdentity.budgets.heatCapacity * 0.04) * dt);
    const speedScale = effective.movementSpeed.movementMultiplier * this.ship.behavior.speed * hull.speedMultiplier * moduleBonuses.speedMultiplier;
    const reversePenalty = localForward < -0.1 ? 0.72 : 1;
    const strafePenalty = Math.abs(localStrafe) > Math.abs(localForward) ? 0.86 : 1;
    const acceleration = TUNING.playerBaseSpeed * 2.65 * speedScale * effective.movementSpeed.accelerationMultiplier * massModifiers.acceleration * heatModifiers.engine * reversePenalty * strafePenalty;
    this.vel.x += thrust.x * acceleration * inputPower * dt;
    this.vel.y += thrust.y * acceleration * inputPower * dt;
    const damping = inputPower > 0 ? Math.pow(0.42, dt) : Math.pow(0.16, dt);
    this.vel.x *= damping;
    this.vel.y *= damping;
    const maxSpeed = TUNING.playerBaseSpeed * 1.45 * speedScale * massModifiers.maxSpeed * heatModifiers.engine;
    const currentSpeed = length(this.vel);
    if (currentSpeed > maxSpeed) {
      this.vel.x = (this.vel.x / currentSpeed) * maxSpeed;
      this.vel.y = (this.vel.y / currentSpeed) * maxSpeed;
    }
    this.pos = clampToWorld({ x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt }, 80);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    const now = performance.now();
    if (now - this.lastDamageAt > effective.maxShield.regenDelayMs && this.maxShield > 0) {
      this.shieldHealth = Math.min(this.maxShield, this.shieldHealth + effective.maxShield.regenPerSecond * dt);
    }
    if (now - this.lastDamageAt > effective.autonomousRepair.delayMs) {
      this.health = Math.min(this.maxHealth, this.health + (effective.autonomousRepair.regenFlat + moduleBonuses.regenPerSecond) * dt);
    }
    this.miningLaserAngle = this.angle;
    this.miningLaserTarget = activeMiningTarget
      ? { id: activeMiningTarget.id, pos: { ...activeMiningTarget.pos }, radius: activeMiningTarget.radius }
      : null;
    this.miningLaserActive = Boolean(activeMiningTarget);
    if (firing && this.currentShipId !== "space_pod") this.fire(projectiles, this.angle);
  }

  fire(projectiles: Projectile[], angle = this.angle) {
    const ship = this.ship;
    if (ship.behavior.cannons <= 0 && !ship.behavior.rearCannon && !ship.behavior.orbitCannons) return;
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    const moduleBonuses = this.moduleBonuses;
    const heatModifiers = getHeatModifiers(this.heat, this.buildIdentity.budgets.heatCapacity);
    const fireDelay = calculateReloadDelay(TUNING.baseFireDelay, effective.reloadSpeed.reloadMultiplier * ship.behavior.fireRate * moduleBonuses.fireRateMultiplier * heatModifiers.reload);
    if (this.fireCooldown > 0) return;
    this.fireCooldown = fireDelay;
    this.heat = Math.min(this.buildIdentity.budgets.heatCapacity * 1.35, this.heat + 3.5 + this.stats.bulletDamage * 0.22 + this.stats.reloadSpeed * 0.18);
    const count = ship.behavior.cannons;
    const start = count === 1 ? 0 : -ship.behavior.spread / 2;
    const step = count === 1 ? 0 : ship.behavior.spread / (count - 1);
    for (let i = 0; i < count; i += 1) {
      this.spawnProjectile(projectiles, angle + start + step * i, 1);
    }
    if (ship.behavior.rearCannon) this.spawnProjectile(projectiles, angle + Math.PI, 0.82);
    if (ship.behavior.orbitCannons) {
      for (let i = 0; i < ship.behavior.orbitCannons; i += 1) this.spawnProjectile(projectiles, angle + (Math.PI * 2 * i) / ship.behavior.orbitCannons, 0.62);
    }
  }

  fireMountedWeapon(projectiles: Projectile[], angle: number, origin: Vec2) {
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    const moduleBonuses = this.moduleBonuses;
    const heatModifiers = getHeatModifiers(this.heat, this.buildIdentity.budgets.heatCapacity);
    const fireDelay = calculateReloadDelay(TUNING.baseFireDelay, effective.reloadSpeed.reloadMultiplier * moduleBonuses.fireRateMultiplier * heatModifiers.reload);
    if (this.fireCooldown > 0) return false;
    this.fireCooldown = fireDelay;
    this.heat = Math.min(this.buildIdentity.budgets.heatCapacity * 1.35, this.heat + 3.5 + this.stats.bulletDamage * 0.22 + this.stats.reloadSpeed * 0.18);
    this.spawnProjectile(projectiles, angle, 1, origin);
    return true;
  }

  updateMountedWeapon(dt: number) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.heat = Math.max(0, this.heat - (18 + this.buildIdentity.budgets.heatCapacity * 0.04) * dt);
  }

  spawnProjectile(projectiles: Projectile[], angle: number, multiplier: number, origin?: Vec2) {
    const b = this.ship.behavior;
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    const moduleBonuses = this.moduleBonuses;
    const activeModules = this.buildIdentity.installedModules.filter((module) => module.enabled).map((module) => module.id);
    const projectileKind = activeModules.includes("missile_rack_mk2") ? "missile" : activeModules.some((id) => id.includes("railgun")) ? "rail" : b.projectile;
    const projectileStats = calculateProjectileModuleStats(this, {
      speed: TUNING.baseProjectileSpeed * moduleBonuses.projectileSpeedMultiplier * (projectileKind === "rail" ? 1.55 : projectileKind === "missile" ? 0.72 : 1),
      damage: TUNING.baseDamage * moduleBonuses.damageMultiplier * b.damage * multiplier,
      delay: TUNING.baseFireDelay,
    });
    const speed = projectileStats.speed;
    projectiles.push(new Projectile({
      pos: {
        x: (origin?.x ?? this.pos.x) + Math.cos(angle) * (origin ? 4 : 34),
        y: (origin?.y ?? this.pos.y) + Math.sin(angle) * (origin ? 4 : 34),
      },
      angle,
      speed,
      radius: projectileKind === "rail" ? 5 : projectileKind === "mine" ? 18 : projectileKind === "gravity" ? 24 : 7,
      damage: projectileStats.damage,
      lifetime: TUNING.projectileLifetime * effective.bulletSpeed.projectileMultiplier * (projectileKind === "mine" ? 4 : projectileKind === "rail" ? 1.35 : 1),
      penetration: effective.bulletPenetration.projectileDurability,
      owner: "player",
      ownerId: this.id,
      kind: projectileKind,
      color: this.customization.projectileColor,
    }));
  }

  damage(amount: number, bypassProtection = false) {
    if (this.dockedStationId && this.dockingState === "docked") return;
    if (!bypassProtection && this.spawnProtected) return;
    let remaining = amount;
    if (this.shieldHealth > 0) {
      const shieldHit = Math.min(this.shieldHealth, remaining);
      this.shieldHealth -= shieldHit;
      remaining -= shieldHit;
    }
    this.health -= remaining;
    if (this.health <= 0 && this.destroyedAt === 0) this.destroyedAt = performance.now();
    this.lastDamageAt = performance.now();
  }

  get spawnProtected() {
    return this.health > 0 && performance.now() < this.spawnProtectedUntil;
  }

  get destroyed() {
    return this.health <= 0;
  }

  get isInsideStation() {
    return Boolean(this.dockedStationId) && (this.dockingState === "docking" || this.dockingState === "docked");
  }

  get usesDroneControls() {
    return this.ship.node.weaponType === "drones";
  }

  get installedModuleIds() {
    return this.loadout.installedModules.map((entry) => entry.moduleId);
  }

  get buildIdentity() {
    const signature = [
      this.baseFrameId,
      this.loadout.hullTier,
      ...Object.values(this.stats),
      ...this.loadout.installedModules.map((module) => module.slotType + ":" + module.slotIndex + ":" + module.moduleId),
    ].join("|");
    if (!this.buildIdentityCache || this.buildIdentityCache.signature !== signature) {
      this.buildIdentityCache = {
        signature,
        value: calculateBuildIdentity({ vehicleId: this.id, frameId: this.baseFrameId, hullTier: this.loadout.hullTier, stats: this.stats, loadout: this.loadout, health: this.maxHealth, maxHealth: this.maxHealth, currentHeat: 0 }),
      };
    }
    const cached = this.buildIdentityCache.value;
    return {
      ...cached,
      damageState: getDamageState(this.health, this.maxHealth),
      budgets: {
        ...cached.budgets,
        currentHeat: this.heat,
        overheated: this.heat >= cached.budgets.heatCapacity,
      },
    };
  }

  get moduleBonuses() {
    return combineModuleBonuses(this.buildIdentity.installedModules.filter((module) => module.enabled).map((module) => module.id));
  }

  showCargoFull(now = performance.now()) {
    this.cargoFullUntil = now + 1200;
  }

  toggleCargoPickup() {
    this.cargoPickupEnabled = !this.cargoPickupEnabled;
  }

  updateDroneRespawns(dt: number) {
    if (!this.usesDroneControls) {
      this.droneRespawnQueue.length = 0;
      return;
    }
    for (let i = this.droneRespawnQueue.length - 1; i >= 0; i -= 1) {
      this.droneRespawnQueue[i] -= dt;
      if (this.droneRespawnQueue[i] > 0) continue;
      this.spawnDrone();
      this.droneRespawnQueue.splice(i, 1);
    }
    const wanted = this.ship.behavior.droneCount ?? 0;
    while (this.drones.length + this.droneRespawnQueue.length < wanted) this.droneRespawnQueue.push(this.getDroneRespawnDelay());
  }

  destroyDrone(drone: Drone) {
    const index = this.drones.indexOf(drone);
    if (index === -1) return;
    this.drones.splice(index, 1);
    this.droneRespawnQueue.push(this.getDroneRespawnDelay());
    this.reindexDrones();
  }

  syncDrones() {
    const wanted = this.ship.behavior.droneCount ?? 0;
    while (this.drones.length < wanted) this.spawnDrone();
    this.drones.length = wanted;
    this.droneRespawnQueue.length = Math.min(this.droneRespawnQueue.length, Math.max(0, wanted - this.drones.length));
    this.reindexDrones();
    this.applyDroneStats();
  }

  private spawnDrone() {
    const wanted = Math.max(1, this.ship.behavior.droneCount ?? 1);
    const index = this.drones.length;
    const drone = new Drone("player", this.id, this.pos, (Math.PI * 2 * index) / wanted, index);
    this.drones.push(drone);
    this.reindexDrones();
    this.applyDroneStats();
  }

  private reindexDrones() {
    const count = Math.max(1, this.drones.length);
    this.drones.forEach((drone, index) => {
      drone.orbitIndex = index;
      drone.angleOffset = (Math.PI * 2 * index) / count;
    });
  }

  private applyDroneStats() {
    const droneStats = calculateDroneModuleStats(this, { speed: 360, maxSpeed: 560, damage: 10, respawnDelay: 2.8 });
    const effective = getEffectivePlayerStats(this.stats, this.baseFrameId);
    this.drones.forEach((drone) => {
      const previousMaxHealth = Math.max(1, drone.maxHealth);
      drone.speed = droneStats.speed;
      drone.maxSpeed = droneStats.maxSpeed;
      drone.maxHealth = 36 * effective.bulletPenetration.droneHealthMultiplier * (1 + this.stats.maxHealth * 0.03);
      drone.health = Math.min(drone.maxHealth, Math.max(drone.health, drone.maxHealth * (drone.health / previousMaxHealth)));
      drone.damage = droneStats.damage;
    });
  }

  private getDroneRespawnDelay() {
    const droneStats = calculateDroneModuleStats(this, { speed: 360, maxSpeed: 560, damage: 10, respawnDelay: 2.8 });
    return Math.max(0.45, droneStats.respawnDelay / this.ship.behavior.fireRate);
  }
}
