import { TUNING, XP_BY_LEVEL } from "./config";
import { getHullTier, getNextHullTier } from "./data/hullTiers";
import type { EtherType } from "./data/etherTypes";
import { ASTEROID_BELTS } from "./data/asteroidBelts";
import { STATION_CONFIG } from "./data/stationConfig";
import { getBaseShipFrame, type BaseFrameType } from "./data/baseShipFrames";
import { MAP_CONFIG, clampToWorld } from "./data/mapConfig";
import { statKeys, type StatKey } from "./data/stats";
import type { Asteroid } from "./entities/Asteroid";
import type { Drone } from "./entities/Drone";
import { Enemy } from "./entities/Enemy";
import { Player } from "./entities/Player";
import { Projectile } from "./entities/Projectile";
import type { DroneCommand } from "./entities/Drone";
import { clamp, distance, lerp, randomRange } from "./math";
import { CollisionSystem } from "./systems/CollisionSystem";
import { AlienAggroSystem } from "./systems/AlienAggroSystem";
import { InputSystem } from "./systems/InputSystem";
import { LevelSystem } from "./systems/LevelSystem";
import { RenderSystem, type Camera } from "./systems/RenderSystem";
import { UpgradeSystem } from "./systems/UpgradeSystem";
import { buildLeaderboard } from "./systems/LeaderboardSystem";
import { AsteroidSystem } from "./systems/AsteroidSystem";
import { EtherDropSystem } from "./systems/EtherDropSystem";
import { StationSystem } from "./systems/StationSystem";
import { ShipOwnershipSystem } from "./systems/ShipOwnershipSystem";
import { spendStationFuel } from "./systems/StationFuelSystem";
import { addEtherToCombinedCargo, dropLowestQualityCargoFromStorage, getNextCargoDropPreview } from "./systems/CargoSystem";
import { ObjectiveSystem } from "./systems/ObjectiveSystem";
import { completeRespawn, startRespawnCountdown, type PlayerDeathState } from "./systems/RespawnSystem";
import { clearPlayerCargo, getDeathCargoDropSummary } from "./systems/DeathDropSystem";
import { getStationDirectionIndicator, getStationHealthWarning, shouldShowStationFinder } from "./systems/StationSystem";
import { createStationInteractionSnapshot } from "./systems/StationInteractionSystem";
import { getEffectiveModuleStats } from "./systems/ModuleStatApplicationSystem";
import { getAvailableUpgradePoints, getShipUpgradeLockReason } from "./systems/ShipUpgradeSystem";
import { getEffectivePlayerStats, getHyperStatLevel, getNormalStatLevel, HYPER_STAT_MAX, isStatHyperUnlockedForLevel, NORMAL_STAT_MAX } from "./systems/StatScalingSystem";
import { findSafeCornerSpawnPoint, isValidSpawnPoint } from "./systems/SpawnSystem";
import { getCurrentZoneStatusText, getLootRegionByDistance, getZoneNotificationText } from "./systems/LootDistributionSystem";
import { LOOT_REGION_CONFIG, type LootRegionId } from "./data/lootRegionConfig";
import type { Customization, GameSnapshot, Planet, Vec2 } from "./types";
import { getUpgradeImpactProfile } from "./data/upgradeImpactProfiles";
import { GameEventSystem } from "./systems/GameEventSystem";
import { MultiplayerClient } from "./network/MultiplayerClient";

const DRONE_IDLE_FARM_RADIUS = 1150;
const DRONE_IDLE_FARM_PADDING = 220;

export type RespawnProgress = {
  level: number;
  xp: number;
  statPoints: number;
};

export class Game {
  player: Player;
  enemies: Enemy[] = [];
  asteroids: Asteroid[] = [];
  planets: Planet[] = [];
  projectiles: Projectile[] = [];
  input: InputSystem;
  renderer: RenderSystem;
  collision = new CollisionSystem();
  alienAggro = new AlienAggroSystem();
  asteroidSystem = new AsteroidSystem();
  etherDrops = new EtherDropSystem();
  stations: StationSystem;
  fleet: ShipOwnershipSystem;
  objectives = new ObjectiveSystem();
  events = new GameEventSystem();
  multiplayer: MultiplayerClient;
  private recentUpgradeFeedback: GameSnapshot["upgradeFeedback"] = null;
  private upgradeFeedbackUntil = 0;
  levels = new LevelSystem();
  upgrades = new UpgradeSystem();
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  autoFire = false;
  autoThrottle = false;

  toggleAutoFire() {
    this.autoFire = !this.autoFire;
    this.emitSnapshot();
  }

  toggleAutoThrottle() {
    this.autoThrottle = !this.autoThrottle;
    this.emitSnapshot();
  }

  pausedByTree = false;
  mode: "playing" | "respawning" | "gameover" = "playing";
  deathState: PlayerDeathState | null = null;
  private raf = 0;
  private last = performance.now();
  private snapshotTimer = 0;
  private enemyRespawnQueue: number[] = [];
  private currentZone: LootRegionId = "outer";
  private zoneNotificationText = "";
  private zoneNotificationUntil = 0;
  private stationScannerActiveUntil = 0;
  private stationScannerCooldownUntil = 0;
  onUiShortcut: ((key: "u" | "y") => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, customization: Customization, private onSnapshot: (snapshot: GameSnapshot) => void, respawnProgress?: RespawnProgress) {
    this.player = new Player(customization);
    this.multiplayer = new MultiplayerClient(customization, (world) => this.joinSharedWorld(world.spawn));
    this.fleet = new ShipOwnershipSystem(this.player);
    this.player.pos = findSafeCornerSpawnPoint({}, MAP_CONFIG);
    this.stations = new StationSystem(this.player);
    this.player.resetSpawnProtection();
    if (respawnProgress) this.applyRespawnProgress(respawnProgress);
    this.input = new InputSystem(canvas);
    this.renderer = new RenderSystem(canvas);
    this.seed();
    this.ensureSafePlayerSpawn();
    this.stations.placeStarterStationNearPlayer(this.player);
    this.camera.x = this.player.pos.x;
    this.camera.y = this.player.pos.y;
    this.resize();
    window.addEventListener("resize", this.resize);
    if (import.meta.env.DEV) {
      (globalThis as typeof globalThis & { __basebornGame?: Game }).__basebornGame = this;
    }
  }

  private applyRespawnProgress(progress: RespawnProgress) {
    this.player.level = progress.level;
    this.player.xp = progress.xp;
    this.player.statPoints = progress.statPoints;
    this.player.score = 0;
    this.player.health = this.player.maxHealth;
    this.player.resetSpawnProtection();
  }

  start() {
    this.multiplayer.connect();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private joinSharedWorld(spawn: Vec2) {
    const networkPlayerId = this.multiplayer.getSnapshot().playerId;
    if (networkPlayerId) this.player.id = networkPlayerId;
    this.player.pos = clampToWorld({ ...spawn }, 500);
    this.player.vel = { x: 0, y: 0 };
    this.player.resetSpawnProtection();
    this.asteroids = this.asteroidSystem.update(0, this.player.pos, performance.now());
    this.stations.placeStarterStationNearPlayer(this.player);
    this.camera.x = this.player.pos.x;
    this.camera.y = this.player.pos.y;
    this.emitSnapshot();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.input.destroy();
    this.multiplayer.destroy();
    window.removeEventListener("resize", this.resize);
    if ((globalThis as typeof globalThis & { __basebornGame?: Game }).__basebornGame === this) {
      delete (globalThis as typeof globalThis & { __basebornGame?: Game }).__basebornGame;
    }
  }

  forceDestroyPlayer() {
    this.player.damage(this.player.maxHealth + 999, true);
    this.beginRespawnCountdown();
    this.autoFire = false;
    this.emitSnapshot();
  }

  upgradeStat(key: StatKey) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.upgradeShipStat(this.player, key, station);
    this.emitSnapshot();
  }

  selectBaseFrame(frameId: BaseFrameType) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station && station.repairStageIndex > station.repairStages.findIndex((stage) => stage.id === "shipUpgradeBay")) {
      this.player.selectBaseFrame(frameId);
    }
    this.emitSnapshot();
  }

  evolve(id: string) {
    const station = this.stations.requireDockedPlayer(this.player);
    const upgradeBayOnline = Boolean(station && station.repairStageIndex > station.repairStages.findIndex((stage) => stage.id === "shipUpgradeBay"));
    if (upgradeBayOnline) this.upgrades.evolve(this.player, id);
    this.emitSnapshot();
  }

  acquireShip(frameId: BaseFrameType) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (!station || !this.fleet.canAcquire(frameId)) return;
    const bayIndex = station.repairStages.findIndex((stage) => stage.id === "shipUpgradeBay");
    if (station.repairStageIndex <= bayIndex || this.player.level < 10) return;
    const cost = frameId === "balanced" ? 900 : frameId === "tech" ? 1600 : 1200;
    if (!spendStationFuel(station, cost, "acquire-ship:" + frameId)) return;
    this.fleet.acquire(frameId);
    this.emitSnapshot();
  }

  switchOwnedShip(shipId: string) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (!station) return;
    this.fleet.switchTo(shipId);
    this.emitSnapshot();
  }
  getEvolutionChoices() {
    return this.upgrades.choices(this.player);
  }

  interactWithStation() {
    const interaction = this.stations.getNearestInteraction(this.player);
    if (interaction.kind === "claim" && interaction.station && this.multiplayer.isOnline()) this.multiplayer.claimStation(interaction.station.id);
    else this.stations.interact(this.player);
    this.emitSnapshot();
  }

  renameStation(name: string) {
    const station = this.stations.claimedStation;
    if (station) this.multiplayer.renameStation(station.id, name);
  }

  joinTeam(teamId: string) { this.multiplayer.joinTeam(teamId); }
  invitePlayer(playerId: string) { this.multiplayer.invitePlayer(playerId); }
  acceptTeamInvite(inviteId: string) { this.multiplayer.acceptInvite(inviteId); }
  declineTeamInvite(inviteId: string) { this.multiplayer.declineInvite(inviteId); }

  performStationPrimaryAction() {
    const interaction = this.stations.getNearestInteraction(this.player);
    const snapshot = createStationInteractionSnapshot({
      station: interaction.station,
      claimedStation: this.stations.claimedStation,
      teamId: this.stations.team.id,
      playerCargo: this.player.cargo,
      playerPosition: this.player.pos,
      playerDockedStationId: this.player.dockedStationId,
      playerDockingState: this.player.dockingState,
      prompt: interaction.prompt,
    });
    if (snapshot.primaryAction) this.performStationAction(snapshot.primaryAction.id);
  }

  performStationAction(actionId: string) {
    if (actionId === "claim") { const interaction = this.stations.getNearestInteraction(this.player); if (interaction.station) this.multiplayer.claimStation(interaction.station.id); }
    if (actionId === "dock") this.stations.interact(this.player);
    if (actionId === "deposit") {
      const station = this.stations.requireDockedPlayer(this.player);
      if (station) this.stations.depositAllEther(this.player, station);
    }
    if (actionId === "launch") this.stations.launchPlayerFromStation(this.player);
    if (actionId === "repair") this.repairStation();
    if (actionId === "move_base") this.relocateBaseToPlayer();
    if (actionId === "scan") this.scanStationWreck();
    this.emitSnapshot();
  }

  scanStationWreck() {
    this.scanForStations();
  }

  repairStation() {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.repairNextStage(station);
    this.emitSnapshot();
  }

  upgradeHull() {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.upgradeHull(this.player, station);
    this.emitSnapshot();
  }

  craftModule(moduleId: string) {
    const station = this.stations.requireDockedPlayer(this.player);
    const crafted = station ? this.stations.craftModule(this.player, moduleId, station) : false;
    if (crafted && station) this.stations.installFirstAvailableModule(this.player, moduleId);
    this.emitSnapshot();
  }

  installModule(moduleId: string) {
    this.stations.installFirstAvailableModule(this.player, moduleId);
    this.emitSnapshot();
  }

  upgradeStationDefense(category: Parameters<StationSystem["upgradeStationDefense"]>[0]) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.upgradeStationDefense(category, station);
    this.emitSnapshot();
  }

  convertStationEtherToFuel(type: EtherType, amount = 100) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.convertEtherToFuel(station, type, amount);
    this.emitSnapshot();
  }

  repairStationSubsystem(subsystemId: Parameters<StationSystem["repairStationSubsystem"]>[0]) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station) this.stations.repairStationSubsystem(subsystemId, station);
    this.emitSnapshot();
  }

  transformStationToMothership() {
    const station = this.stations.requireDockedPlayer(this.player);
    if (station && this.stations.transformStationToMothership(this.player, station)) this.fleet.transformActiveToMothership();
    this.emitSnapshot();
  }

  startStationHyperdrive(destination: Vec2) {
    const station = this.stations.requireDockedPlayer(this.player);
    if (!station) return;
    this.stations.startHyperdriveWarp(this.player, station, destination, performance.now());
    this.emitSnapshot();
  }

  startStationHyperdriveToPlayer() {
    this.startStationHyperdrive({ ...this.player.pos });
  }

  relocateBaseToPlayer() {
    if (this.stations.requireDockedPlayer(this.player)) this.stations.relocateClaimedStationNearPlayer(this.player);
    this.emitSnapshot();
  }

  toggleCargoPickup() {
    this.player.toggleCargoPickup();
    this.emitSnapshot();
  }

  dropLowestCargo() {
    const dropped = dropLowestQualityCargoFromStorage(this.player.cargo);
    if (dropped) {
      if (this.multiplayer.isOnline()) this.multiplayer.dropCargo(dropped.type, dropped.amount);
      else this.etherDrops.spawnCargoDrop(this.player.pos, dropped.type, dropped.amount, this.player.id, performance.now());
    }
    this.emitSnapshot();
  }

  private seed() {
    this.planets = [];
    this.asteroids = this.asteroidSystem.update(0, this.player.pos, performance.now());
    for (let i = 0; i < TUNING.botCount; i += 1) this.enemies.push(Enemy.createAlienDefender(i));
  }

  private ensureSafePlayerSpawn() {
    if (isValidSpawnPoint(this.player.pos.x, this.player.pos.y, { asteroids: this.asteroids, enemies: this.enemies }, MAP_CONFIG)) return;
    this.player.pos = findSafeCornerSpawnPoint({ asteroids: this.asteroids, enemies: this.enemies }, MAP_CONFIG);
    this.player.vel = { x: 0, y: 0 };
    this.player.resetSpawnProtection();
    this.asteroids = this.asteroidSystem.update(0, this.player.pos, performance.now());
  }

  private frame = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.syncMultiplayer(now, dt);
    this.renderer.render(this.player, this.enemies, this.asteroids, this.projectiles, this.camera, this.planets, this.etherDrops.drops, this.stations.stations, this.multiplayer.getRemotePlayers());
    this.raf = requestAnimationFrame(this.frame);
  };

  private syncMultiplayer(now: number, dt: number) {
    this.multiplayer.updateLocalState({
      x: this.player.pos.x,
      y: this.player.pos.y,
      vx: this.player.vel.x,
      vy: this.player.vel.y,
      angle: this.player.angle,
      healthRatio: this.player.maxHealth > 0 ? Math.max(0, this.player.health / this.player.maxHealth) : 0,
      level: this.player.level,
      score: this.player.score,
      shipClassId: this.player.currentShipId,
      shipClass: this.player.ship.name,
      docked: this.player.dockingState === "docked",
    }, now);
    this.multiplayer.updateInterpolation(dt);

    const multiplayerSnapshot = this.multiplayer.getSnapshot();
    if (multiplayerSnapshot.playerId && this.player.id !== multiplayerSnapshot.playerId) this.player.id = multiplayerSnapshot.playerId;
    this.stations.syncSharedStations(this.multiplayer.getSharedStations());
    const networkTeam = this.multiplayer.getTeams().find((team) => team.id === this.multiplayer.getTeamId()) ?? null;
    this.stations.syncNetworkTeam(networkTeam, this.player);
    this.asteroidSystem.syncSharedDestroyed(this.multiplayer.getDestroyedAsteroids());
    if (this.multiplayer.isOnline()) this.etherDrops.syncSharedDrops(this.multiplayer.getSharedDrops());
    for (const award of this.multiplayer.consumeLootAwards()) addEtherToCombinedCargo(this.player.cargo, award.etherType, award.amount);
    const respawnSpawn = this.multiplayer.consumeRespawnSpawn();
    if (respawnSpawn && this.mode === "playing") {
      this.player.pos = clampToWorld(respawnSpawn, 500);
      this.player.vel = { x: 0, y: 0 };
      this.player.resetSpawnProtection();
      this.camera.x = this.player.pos.x;
      this.camera.y = this.player.pos.y;
    }
  }
  private update(dt: number) {
    if (this.mode === "playing") this.handleHotkeys();
    if (this.pausedByTree && this.mode === "playing") {
      this.emitSnapshot();
      return;
    }
    if (this.mode === "respawning") this.updateRespawnCountdown();
    const canvasRect = this.canvas.getBoundingClientRect();
    this.input.pointerWorld = {
      x: this.camera.x + (this.input.pointer.x - canvasRect.width / 2) / this.camera.zoom,
      y: this.camera.y + (this.input.pointer.y - canvasRect.height / 2) / this.camera.zoom,
    };
    const closestTarget = this.closestEnemyOrAsteroid();
    const aimWorld = this.input.pointerWorld;
    const now = performance.now();
    this.stations.updateDockingAnimation(this.player, now);
    this.handleStationDockingFailure();
    if (this.mode === "playing" && this.player.dockingState === "docked") {
      const piloted = this.stations.pilotClaimedStation(this.player, this.input.movement(), dt);
      if (piloted) this.updateZoneState();
    }
    const playerActive = this.mode === "playing" && !this.player.isInsideStation;
    if (playerActive) {
      const move = this.input.movement();
      const throttleMove = this.autoThrottle && move.y === 0 ? { ...move, y: -1 } : move;
      const directFire = !this.player.usesDroneControls && (this.input.firing || this.autoFire);
      this.player.update(dt, throttleMove, aimWorld, directFire, this.projectiles);
      const droneCommands = this.getDroneCommands(aimWorld);
      this.player.updateDroneRespawns(dt);
      this.player.drones.forEach((drone) => drone.update(dt, this.player.pos, droneCommands.get(drone.id) ?? { mode: "orbit", droneCount: this.player.drones.length }, this.player.drones, { now }));
      if (this.player.spawnProtected) this.keepSpawnSafe();
      this.updateZoneState();
    }
    const claimed = this.stations.claimedStation;
    const raidWarningActive = Boolean(claimed && typeof claimed.raidWarningUntil === "number" && performance.now() < claimed.raidWarningUntil);
    const stationTarget = claimed && claimed.lifecycleState === "under_attack" && !raidWarningActive ? { id: claimed.id, pos: claimed.pos } : null;
    this.alienAggro.update(dt, this.enemies, this.player, this.projectiles, stationTarget);
    this.stations.update(dt, this.enemies, now, this.etherDrops);
    const enemyTargets = this.enemies.map((enemy) => enemy.pos);
    const playerTarget = [this.player.pos];
    this.projectiles.forEach((p) => p.update(dt, p.owner === "player" ? enemyTargets : playerTarget));
    this.asteroids = this.asteroidSystem.update(dt, this.player.pos, performance.now());
    this.stations.resolveStationPhysicalCollisions(this.asteroids, this.enemies);
    if (this.player.dockingState === "docked") {
      const dockedStation = this.stations.stations.find((station) => station.id === this.player.dockedStationId);
      if (dockedStation) this.player.pos = { ...dockedStation.pos };
    }
    if (playerActive) {
      this.etherDrops.update(
        dt,
        this.player,
        performance.now(),
        this.multiplayer.isOnline()
          ? (dropId, amount) => this.multiplayer.requestLootPickup(dropId, amount)
          : undefined,
      );
    }
    if (playerActive) this.applyHazards(dt);
    const enemyCountBeforeCollision = this.enemies.length;
    this.collision.resolve(dt, this.player, this.enemies, this.asteroids, this.projectiles, this.levels, playerActive, (asteroid) => {
      const now = performance.now();
      this.asteroidSystem.markDestroyed(asteroid, now);
      if (!playerActive) return;
      const amount = Math.max(1, Math.round(asteroid.etherReward * this.player.ship.behavior.mining.etherYieldMultiplier));
      if (this.multiplayer.isOnline()) {
        this.multiplayer.reportAsteroidDestroyed({
          asteroidId: asteroid.id,
          x: asteroid.pos.x,
          y: asteroid.pos.y,
          etherType: asteroid.etherType,
          amount,
          respawnMs: asteroid.respawnSeconds * 1000,
        });
      } else {
        this.etherDrops.spawnFromAsteroid(asteroid, now, this.player.ship.behavior.mining.etherYieldMultiplier);
      }
    }, () => {
      this.zoneNotificationText = "Mining inefficient: upgrade mining modules.";
      this.zoneNotificationUntil = performance.now() + 2800;
    });
    this.queueEnemyRespawns(Math.max(0, enemyCountBeforeCollision - this.enemies.length));
    this.repopulateEnemies(dt);
    this.camera.x = lerp(this.camera.x, this.player.pos.x, TUNING.cameraLerp);
    this.camera.y = lerp(this.camera.y, this.player.pos.y, TUNING.cameraLerp);
    this.camera.zoom = lerp(this.camera.zoom, this.player.currentBranch === "Sniper" ? 0.82 : 1, 0.02);
    if (this.player.health <= 0 && this.mode === "playing") this.beginRespawnCountdown();
    this.snapshotTimer += dt;
    if (this.snapshotTimer > 0.12) {
      this.snapshotTimer = 0;
      this.emitSnapshot();
    }
  }

  private handleHotkeys() {
    if (this.input.consume("e")) this.autoFire = !this.autoFire;
    if (this.input.consume("q")) this.autoThrottle = !this.autoThrottle;
    if (this.input.consume("f")) this.performStationPrimaryAction();
    if (this.input.consume("r")) {
      if (this.player.dockingState === "docked") this.repairStation();
      else this.scanForStations();
    }
    if (this.input.consume("g")) this.dropLowestCargo();
    if (this.input.consume("h")) this.toggleCargoPickup();
    if (this.input.consume("u")) {
      this.onUiShortcut?.("u");
      this.emitSnapshot();
    }
    if (this.input.consume("y")) {
      this.onUiShortcut?.("y");
      this.emitSnapshot();
    }
    for (let i = 0; i < statKeys.length; i += 1) {
      if (this.input.consume(String(i + 1))) this.upgradeStat(statKeys[i]);
    }
  }

  private handleStationDockingFailure() {
    if (!this.player.dockedStationId) return;
    const station = this.stations.stations.find((entry) => entry.id === this.player.dockedStationId);
    if (station && station.lifecycleState !== "destroyed" && station.health > 0) return;
    this.player.dockedStationId = null;
    this.player.dockingState = "free";
    this.player.damage(this.player.maxHealth + 999, true);
  }

  private scanForStations() {
    const now = performance.now();
    if (now < this.stationScannerCooldownUntil) {
      const seconds = Math.ceil((this.stationScannerCooldownUntil - now) / 1000);
      this.zoneNotificationText = `Scanner recharging: ${seconds}s`;
      this.zoneNotificationUntil = now + 1500;
      this.emitSnapshot();
      return;
    }
    this.stationScannerActiveUntil = now + STATION_CONFIG.stationScannerPulseDurationMs;
    this.stationScannerCooldownUntil = now + STATION_CONFIG.stationScannerCooldownMs;
    const nearest = this.stations.getNearestUnclaimedStation(this.player);
    this.zoneNotificationText = nearest
      ? `Scanner ping: ${nearest.station.name} ${Math.round(nearest.distance).toLocaleString()}m`
      : "Scanner ping: no unclaimed stations detected";
    this.zoneNotificationUntil = now + 2800;
    this.emitSnapshot();
  }

  private getEffectiveStationScannerRadius() {
    const baseRadius = STATION_CONFIG.stationScannerPulseRadius;
    const station = this.stations.claimedStation;
    const scanner = station?.subsystemStates?.scanner_array;
    if (!scanner || station.lifecycleState === "destroyed") return baseRadius;
    if (scanner.state === "disabled" || scanner.state === "offline") return baseRadius * 0.25;
    const ratio = scanner.maxHealth > 0 ? Math.max(0, Math.min(1, scanner.health / scanner.maxHealth)) : 0.5;
    const mult = 0.85 + ratio * 0.9;
    return baseRadius * mult;
  }

  private applyHazards(dt: number) {
    const center: Vec2 = { x: MAP_CONFIG.centerX, y: MAP_CONFIG.centerY };
    const d = distance(this.player.pos, center);
    if (d < 850) this.player.damage(2.8 * dt, true);
    if (d < MAP_CONFIG.centerZoneRadius) {
      const pull = Math.max(0, (MAP_CONFIG.centerZoneRadius - d) / MAP_CONFIG.centerZoneRadius) * 12 * dt;
      this.player.pos.x += ((center.x - this.player.pos.x) / Math.max(1, d)) * pull;
      this.player.pos.y += ((center.y - this.player.pos.y) / Math.max(1, d)) * pull;
    }
  }

  private updateZoneState() {
    const nextZone = getLootRegionByDistance(this.player.pos.x, this.player.pos.y, MAP_CONFIG) as LootRegionId;
    if (nextZone === this.currentZone) return;
    this.currentZone = nextZone;
    this.zoneNotificationText = getZoneNotificationText(nextZone);
    this.zoneNotificationUntil = performance.now() + 2800;
  }

  private beginRespawnCountdown() {
    if (this.deathState) return;
    const cargoSummary = getDeathCargoDropSummary(this.player);
    const now = performance.now();
    for (const stack of cargoSummary.stacks) {
      if (this.multiplayer.isOnline()) this.multiplayer.dropCargo(stack.type, stack.amount);
      else this.etherDrops.spawnCargoDrop(this.player.pos, stack.type, stack.amount, this.player.id, now);
    }
    clearPlayerCargo(this.player);
    this.deathState = startRespawnCountdown(this.player, this.stations.claimedStation, cargoSummary.totalDropped, performance.now());
    this.mode = "respawning";
    this.autoFire = false;
    this.autoThrottle = false;
  }

  private updateRespawnCountdown() {
    if (!this.deathState) return;
    const station = this.stations.claimedStation;
    if (this.deathState.stationRespawnAvailable && !station) {
      this.deathState.stationRespawnAvailable = false;
      this.deathState.respawnLocation = "outer_safe_zone";
      this.deathState.reasonIfRespawnBlocked = "Respawn point destroyed.";
    }
    if (performance.now() < this.deathState.respawnAvailableAt) return;
    completeRespawn(this.player, station, this.deathState);
    if (!station && this.multiplayer.isOnline()) this.multiplayer.requestRespawn();
    this.deathState = null;
    this.mode = "playing";
  }

  private closestEnemyOrAsteroid() {
    const candidates = [...this.enemies.map((e) => e.pos), ...this.asteroids.map((a) => a.pos)];
    let best: Vec2 | undefined;
    let bestDistance = Infinity;
    for (const candidate of candidates) {
      const d = distance(this.player.pos, candidate);
      if (d < bestDistance && d < 900) {
        bestDistance = d;
        best = candidate;
      }
    }
    return best;
  }

  private getDroneCommands(aimWorld: Vec2) {
    const commands = new Map<string, DroneCommand>();
    const droneCount = this.player.drones.length;
    if (!droneCount) return commands;
    if (this.input.rightFiring) {
      this.player.drones.forEach((drone) => commands.set(drone.id, { mode: "repel_from_cursor", target: aimWorld, droneCount }));
      return commands;
    }
    if (this.input.firing) {
      this.player.drones.forEach((drone) => commands.set(drone.id, { mode: "move_to_cursor", target: aimWorld, droneCount }));
      return commands;
    }
    if (this.player.usesDroneControls) {
      this.assignDroneAutoFarmTargets(this.player.drones, this.getAsteroidsNearPlayer(this.asteroids), commands);
    }
    this.player.drones.forEach((drone) => {
      if (!commands.has(drone.id)) commands.set(drone.id, { mode: "orbit", droneCount });
    });
    return commands;
  }

  private getDroneCommand(aimWorld: Vec2, closestTarget?: Vec2): DroneCommand {
    const droneCount = this.player.drones.length;
    if (this.input.rightFiring) {
      return { mode: "repel_from_cursor", target: aimWorld, droneCount };
    }
    if (this.input.firing) {
      return { mode: "move_to_cursor", target: aimWorld, droneCount };
    }
    if (this.autoFire) {
      const target = this.closestDroneAutoTarget(aimWorld) ?? closestTarget;
      if (target) return { mode: "auto_farm", target, targetEntityId: "id" in target ? String(target.id) : null, droneCount };
    }
    return { mode: "orbit", droneCount };
  }

  private getAsteroidsInViewport(camera: Camera, asteroids: Asteroid[], padding: number) {
    const rect = this.canvas.getBoundingClientRect();
    const halfWidth = rect.width / 2 / camera.zoom + padding;
    const halfHeight = rect.height / 2 / camera.zoom + padding;
    return asteroids.filter((asteroid) => (
      Math.abs(asteroid.pos.x - camera.x) <= halfWidth + asteroid.radius
      && Math.abs(asteroid.pos.y - camera.y) <= halfHeight + asteroid.radius
    ));
  }

  private getAsteroidsNearPlayer(asteroids: Asteroid[]) {
    return asteroids.filter((asteroid) => distance(asteroid.pos, this.player.pos) <= DRONE_IDLE_FARM_RADIUS + DRONE_IDLE_FARM_PADDING + asteroid.radius);
  }

  private assignDroneAutoFarmTargets(drones: Drone[], visibleAsteroids: Asteroid[], commands: Map<string, DroneCommand>) {
    if (!visibleAsteroids.length) return;
    const assignments = new Map<string, number>();
    const droneCount = drones.length;
    for (const drone of drones) {
      const target = this.selectBestDroneTarget(drone, visibleAsteroids, assignments);
      if (!target) continue;
      assignments.set(target.id, (assignments.get(target.id) ?? 0) + 1);
      commands.set(drone.id, { mode: "auto_farm", target: target.pos, targetEntityId: target.id, droneCount });
    }
  }

  private selectBestDroneTarget(drone: Drone, visibleAsteroids: Asteroid[], assignments: Map<string, number>) {
    let best: Asteroid | undefined;
    let bestScore = -Infinity;
    for (const asteroid of visibleAsteroids) {
      const assignedCount = assignments.get(asteroid.id) ?? 0;
      const distanceToDrone = distance(drone.pos, asteroid.pos);
      const distanceToPlayer = distance(this.player.pos, asteroid.pos);
      const oversizedPenalty = this.player.level < 30 && asteroid.maxHealth > 180 ? 160 : this.player.level < 45 && asteroid.maxHealth > 260 ? 120 : 0;
      const leashPenalty = Math.max(0, distanceToPlayer - DRONE_IDLE_FARM_RADIUS) * 0.75;
      const score = asteroid.xp * 1.4 - distanceToDrone * 0.035 - distanceToPlayer * 0.045 - asteroid.health * 0.04 - assignedCount * 80 - oversizedPenalty - leashPenalty;
      if (score <= bestScore) continue;
      bestScore = score;
      best = asteroid;
    }
    return best;
  }

  private closestDroneAutoTarget(aimWorld: Vec2) {
    const candidates = [
      ...this.enemies.map((enemy) => ({ id: enemy.id, pos: enemy.pos, cursorDistance: distance(enemy.pos, aimWorld), playerDistance: distance(enemy.pos, this.player.pos) })),
      ...this.asteroids.map((asteroid) => ({ id: asteroid.id, pos: asteroid.pos, cursorDistance: distance(asteroid.pos, aimWorld), playerDistance: distance(asteroid.pos, this.player.pos) })),
    ];
    const nearCursor = candidates.filter((candidate) => candidate.cursorDistance < 720).sort((a, b) => a.cursorDistance - b.cursorDistance)[0];
    const target = nearCursor ?? candidates.filter((candidate) => candidate.playerDistance < 1400).sort((a, b) => a.playerDistance - b.playerDistance)[0];
    return target ? { ...target.pos, id: target.id } : undefined;
  }

  private queueEnemyRespawns(count: number) {
    for (let i = 0; i < count; i += 1) {
      this.enemyRespawnQueue.push(randomRange(TUNING.botRespawnMinDelay, TUNING.botRespawnMaxDelay));
    }
  }

  private repopulateEnemies(dt: number) {
    while (this.enemies.length + this.enemyRespawnQueue.length < TUNING.botCount) {
      this.enemyRespawnQueue.push(randomRange(TUNING.botRespawnMinDelay, TUNING.botRespawnMaxDelay));
    }
    for (let i = this.enemyRespawnQueue.length - 1; i >= 0; i -= 1) {
      this.enemyRespawnQueue[i] -= dt;
      if (this.enemyRespawnQueue[i] > 0 || this.enemies.length >= TUNING.botCount) continue;
      this.enemies.push(Enemy.createAlienDefender(Math.floor(randomRange(1, 1000))));
      this.enemyRespawnQueue.splice(i, 1);
    }
  }

  private keepSpawnSafe() {
    for (const enemy of this.enemies) {
      const d = distance(enemy.pos, this.player.pos);
      if (d >= 900) continue;
      const angle = Math.atan2(enemy.pos.y - this.player.pos.y, enemy.pos.x - this.player.pos.x);
      const push = (900 - d) * 0.08 + 4;
      enemy.pos = clampToWorld({ x: enemy.pos.x + Math.cos(angle) * push, y: enemy.pos.y + Math.sin(angle) * push }, 120);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      if (projectile.owner === "enemy" && distance(projectile.pos, this.player.pos) < 980) this.projectiles.splice(i, 1);
    }
  }

  private createSafeEnemy() {
    const enemy = new Enemy();
    let tries = 0;
    while (distance(enemy.pos, this.player.pos) < 1100 && tries < 25) {
      enemy.pos = { x: randomRange(-MAP_CONFIG.halfWidth + 140, MAP_CONFIG.halfWidth - 140), y: randomRange(-MAP_CONFIG.halfHeight + 140, MAP_CONFIG.halfHeight - 140) };
      tries += 1;
    }
    return enemy;
  }

  private createRespawnEnemy() {
    const enemy = new Enemy();
    let tries = 0;
    do {
      const angle = randomRange(0, Math.PI * 2);
      const range = randomRange(1400, 2300);
      enemy.pos = {
        x: clamp(this.player.pos.x + Math.cos(angle) * range, -MAP_CONFIG.halfWidth + 160, MAP_CONFIG.halfWidth - 160),
        y: clamp(this.player.pos.y + Math.sin(angle) * range, -MAP_CONFIG.halfHeight + 160, MAP_CONFIG.halfHeight - 160),
      };
      tries += 1;
    } while (distance(enemy.pos, this.player.pos) < 1250 && tries < 18);
    enemy.fireCooldown = randomRange(1.2, 2.4);
    return enemy;
  }

  private resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
  };

  private emitSnapshot() {
    const snapshotNow = performance.now();
    const scannerActive = snapshotNow < this.stationScannerActiveUntil;
    const evolutionChoices = this.getEvolutionChoices();
    const availableEvolutionChoices = evolutionChoices.filter((choice) => choice.state === "available");
    const zone = LOOT_REGION_CONFIG[this.currentZone];
    const stationSnapshot = this.stations.getStationSnapshot(this.player);
    const nearestStationInteraction = this.stations.getNearestInteraction(this.player);
    const stationFinder = this.getStationFinderSnapshot();
    const stationInteraction = createStationInteractionSnapshot({
      station: nearestStationInteraction.station,
      claimedStation: this.stations.claimedStation,
      teamId: this.stations.team.id,
      playerCargo: this.player.cargo,
      playerPosition: this.player.pos,
      playerDockedStationId: this.player.dockedStationId,
      playerDockingState: this.player.dockingState,
      prompt: nearestStationInteraction.prompt,
    });
    const currentObjective = this.objectives.getCurrentObjective(this.player, this.stations);
    const nextHull = getNextHullTier(this.player.loadout.hullTier) ?? null;
    const claimedStation = this.stations.claimedStation;
    this.onSnapshot({
      level: this.player.level,
      xp: this.player.xp,
      nextXp: XP_BY_LEVEL[Math.min(this.player.level + 1, XP_BY_LEVEL.length - 1)],
      score: this.player.score,
      statPoints: this.player.statPoints,
      health: Math.max(0, this.player.health),
      maxHealth: this.player.maxHealth,
      shieldHealth: Math.max(0, this.player.shieldHealth),
      maxShield: this.player.maxShield,
      shipClass: this.player.ship.name,
      shipClassId: this.player.currentShipId,
      currentBranch: this.player.currentBranch,
      availableUpgradeIds: availableEvolutionChoices.map((choice) => choice.node.id),
      evolutionChoices,
      upgradeHistory: [...this.player.upgradeHistory],
      stats: { ...this.player.stats },
      upgradePoints: getAvailableUpgradePoints(this.player),
      baseFrame: getBaseShipFrame(this.player.baseFrameId),
      shipUpgradeStats: statKeys.map((statKey) => {
        const normalLevel = getNormalStatLevel(this.player.stats, statKey);
        const hyperLevel = getHyperStatLevel(this.player.stats, statKey);
        return {
          statKey,
          normalLevel,
          hyperLevel,
          maxNormalLevel: NORMAL_STAT_MAX,
          maxHyperLevel: HYPER_STAT_MAX,
          totalLevel: normalLevel + hyperLevel,
          isHyperUnlocked: isStatHyperUnlockedForLevel(this.player.stats, statKey, this.player.level),
          fuelCost: this.stations.getShipStatUpgradeCost(this.player, statKey),
          lockReason: getShipUpgradeLockReason(this.player, statKey) || this.stations.getShipStatUpgradeLockReason(this.player, statKey),
        };
      }),
      effectiveShipStats: (() => {
        const effective = getEffectivePlayerStats(this.player.stats, this.player.baseFrameId);
        return {
          maxHealth: this.player.maxHealth,
          maxShield: this.player.maxShield,
          movementMultiplier: effective.movementSpeed.movementMultiplier,
          bodyDamageMultiplier: effective.bodyDamage.damageMultiplier,
          repairPerSecond: effective.autonomousRepair.regenFlat,
          thrusterVisualScale: effective.movementSpeed.thrusterVisualScale,
        };
      })(),
      effectiveModuleStats: getEffectiveModuleStats(this.player),
      leaderboard: buildLeaderboard(this.player, this.multiplayer.getRemotePlayers()),
      multiplayer: this.multiplayer.getSnapshot(),
      buildSummary: this.buildSummary(),
      buildIdentity: this.player.buildIdentity,
      upgradeFeedback: performance.now() < this.upgradeFeedbackUntil ? this.recentUpgradeFeedback : null,
      fleet: this.fleet.getSnapshot(),
      hull: {
        current: getHullTier(this.player.loadout.hullTier),
        next: nextHull,
        canUpgrade: Boolean(nextHull && claimedStation && this.stations.canUpgradeHull(this.player, claimedStation, nextHull.tier)),
        craftedModuleIds: [...this.player.loadout.craftedModuleIds],
        installedModules: [...this.player.loadout.installedModules],
        craftableModules: this.stations.getCraftableForPlayer(this.player),
      },
      station: stationSnapshot,
      cargo: {
        capacity: this.player.cargo.capacity,
        used: this.player.cargo.used,
        ether: { ...this.player.cargo.ether },
      },
      cargoFull: performance.now() < this.player.cargoFullUntil,
      cargoPickupEnabled: this.player.cargoPickupEnabled,
      nextCargoDrop: getNextCargoDropPreview(this.player.cargo),
      currentObjective,
      objectiveProgress: currentObjective.targetAmount ? `${Math.floor(currentObjective.currentAmount ?? 0)} / ${Math.floor(currentObjective.targetAmount)}` : "",
      objectiveHint: currentObjective.hint ?? "",
      playerDeathState: this.deathState ? { ...this.deathState } : null,
      baseLostState: this.stations.baseLostState ? { ...this.stations.baseLostState } : null,
      stationHealthWarning: getStationHealthWarning(this.stations.claimedStation),
      stationInteraction,
      stationFinder,
      zone: {
        id: zone.id,
        displayName: zone.displayName,
        pvpEnabled: zone.pvpEnabled,
        lootDescription: zone.lootDescription,
        statusText: getCurrentZoneStatusText(this.player.pos, MAP_CONFIG),
      },
      zoneNotification: {
        text: this.zoneNotificationText,
        visible: performance.now() < this.zoneNotificationUntil,
      },
      autoFire: this.autoFire,
      autoThrottle: this.autoThrottle,
      evolutionAvailable: availableEvolutionChoices.length > 0,
      mode: this.mode,
      minimap: {
        player: { ...this.player.pos, angle: this.player.angle },
        ships: [
          { id: "player", pos: { ...this.player.pos }, angle: this.player.angle, owner: "player" },
          ...this.multiplayer.getRemotePlayers().map((remote) => ({ id: remote.id, pos: { x: remote.renderX, y: remote.renderY }, angle: remote.renderAngle, owner: "teammate" as const })),
          ...this.enemies.map((enemy) => ({ id: enemy.id, pos: { ...enemy.pos }, angle: enemy.angle, owner: "enemy" as const })),
        ],
        planets: [],
        aliens: this.enemies.map((enemy) => ({ id: enemy.id, pos: enemy.pos, type: enemy.alienType, state: enemy.state })),
        stations: (scannerActive
          ? this.stations.stations
            .filter((s) => s.lifecycleState !== "destroyed")
            .filter((s) => distance(this.player.pos, s.pos) <= this.getEffectiveStationScannerRadius())
          : this.stations.getVisibleStationMarkers(this.player, false)
        ).map((station) => ({
            id: station.id,
            name: station.name,
            pos: station.pos,
            claimState: station.claimState,
            ownerTeamId: station.ownerTeamId,
            isMobile: station.isMobile,
            mothershipUnlocked: station.mothershipUnlocked,
            level: station.level,
            health: station.health,
            maxHealth: station.maxHealth,
            underAttack: station.underAttack,
          })),
        asteroidBelts: ASTEROID_BELTS.filter((belt) => belt.visibleOnMinimap).map((belt) => ({
          id: belt.id,
          name: belt.name,
          type: belt.type,
          minRadiusFromCenter: belt.minRadiusFromCenter,
          maxRadiusFromCenter: belt.maxRadiusFromCenter,
          angleStart: belt.angleStart,
          angleEnd: belt.angleEnd,
          minimapColor: belt.minimapColor,
          dangerLevel: belt.dangerLevel,
        })),
      },
    });
  }

  private buildSummary() {
    const hull = getHullTier(this.player.loadout.hullTier);
    const modules = this.player.loadout.installedModules.length;
    const identity = this.player.buildIdentity;
    return `${identity.primaryRole} ${hull.name} / ${modules} module${modules === 1 ? "" : "s"}`;
  }

  private getStationFinderSnapshot() {
    const now = performance.now();
    const scannerActive = now < this.stationScannerActiveUntil;
    const nearest = this.stations.getNearestUnclaimedStation(this.player);
    const indicator = getStationDirectionIndicator(this.player, nearest?.station);
    const visible = shouldShowStationFinder(this.player, this.stations.stations, this.stations.claimedStation);
    return {
      visible: visible && Boolean(nearest && indicator),
      stationId: nearest?.station.id ?? null,
      stationName: nearest?.station.name ?? "",
      distance: indicator?.distance ?? 0,
      direction: indicator?.direction ?? { x: 0, y: 0 },
      bearingLabel: indicator?.bearingLabel ?? "",
      scannerActive,
      pulseReady: now >= this.stationScannerCooldownUntil,
      hint: scannerActive ? "Scanner pulse active. Station markers are visible." : "Press R to pulse the station scanner.",
    };
  }
}
