import { MAP_CONFIG, clampToWorld, type MapConfig } from "../data/mapConfig";
import { emptyEtherCargo, type EtherCost, type EtherType } from "../data/etherTypes";
import { getHullTier, getNextHullTier } from "../data/hullTiers";
import { getCraftableModules, getModuleDefinition } from "../data/shipModules";
import {
  createDefaultUpgradeState,
  createDefenseSlots,
  createHyperdriveStatus,
  createLandingPads,
  createStationUpgrades,
  createStationStorage,
  EMPTY_STATION_DEFENSE_STATS,
  getDefenseSlotUnlockCount,
  getLandingPadUnlockCount,
  getStationUpgradeBonuses,
  getStationUpgradeCost,
  getStationSpawnCount,
  REPAIR_STAGES,
  STATION_CONFIG,
} from "../data/stationConfig";
import type { BaseLostState, HullTierId, PlayerLoadout, RepairStageId, ShipModuleDefinition, Station, StationDefenseStats, StationUpgrade, StationUpgradeCategory, Team } from "../data/stationTypes";
import type { StationSubsystemId, StationSubsystemStateKind, StationSubsystemState } from "../data/stationTypes";
import { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { createId } from "../id";
import { distance, lerp, normalize, randomRange } from "../math";
import type { Vec2 } from "../types";
import type { NetworkStationState, NetworkTeam } from "../network/protocol";
import { ETHER_QUALITY_ORDER, ETHER_VALUE_WEIGHTS } from "../data/resourceBalance";
import { addEtherToCargo, canAffordEtherCost, removeEtherFromCombinedCargo, spendEther, syncCargoUsed } from "./CargoSystem";
import type { EtherDropSystem } from "./EtherDropSystem";
import type { Asteroid } from "../entities/Asteroid";
import { TUNING } from "../config";
import type { StatKey } from "../data/stats";
import { canUpgradeShipStat } from "./ShipUpgradeSystem";
import { canAffordStationFuelCost, convertEtherToStationFuel, createStationFuelState, spendStationFuel } from "./StationFuelSystem";
import { ETHER_CONFIG } from "../data/etherConfig";
import { resolveMovementTuning, type MovementCommand } from "../data/movementConfig";
import { updateThrusterMovement } from "./ShipMovementSystem";

const STATION_NAMES = ["Hollow Runner", "Kestrel Hull", "Orion Courier", "Rustwake", "Pale Voyager", "Foundry Skiff", "Eidolon Craft", "Broken Halo"];

export type StationInteraction = {
  station: Station | null;
  kind: "claim" | "repair_wreck" | "deposit" | "dock" | null;
  prompt: string;
  distance: number;
};

export class StationSystem {
  stations: Station[] = [];
  team: Team;
  baseLostState: BaseLostState | null = null;
  private lastNetworkStationStates = new Map<string, NetworkStationState>();

  constructor(player: Player) {
    this.team = this.createLocalTeam(player);
    this.stations = this.spawnBrokenStations(STATION_CONFIG.expectedPlayerCount);
    this.placeStarterStationNearPlayer(player);
  }

  syncSharedStations(states: NetworkStationState[], player?: Player) {
    if (!states.length) return;
    const existing = new Map(this.stations.map((station) => [station.id, station]));
    this.stations = states.map((state, index) => {
      const existingStation = existing.get(state.id);
      const station = existingStation ?? this.createBrokenStation({ x: state.x, y: state.y }, index);
      const isFreshSnapshot = this.lastNetworkStationStates.get(state.id) !== state;
      this.lastNetworkStationStates.set(state.id, state);
      station.id = state.id;
      station.name = state.name;
      if (isFreshSnapshot) {
        const target = { x: state.x, y: state.y };
        const positionError = distance(station.pos, target);
        const locallyDriven = Boolean(player && state.driverPlayerId === player.id);
        const correction = locallyDriven ? STATION_CONFIG.stationNetworkCorrection * 0.45 : STATION_CONFIG.stationNetworkCorrection;
        station.pos = !existingStation || positionError > 700
          ? target
          : { x: lerp(station.pos.x, target.x, correction), y: lerp(station.pos.y, target.y, correction) };
        const velocityCorrection = locallyDriven ? 0.12 : 0.28;
        station.vel = {
          x: lerp(station.vel.x, state.vx ?? station.vel.x, velocityCorrection),
          y: lerp(station.vel.y, state.vy ?? station.vel.y, velocityCorrection),
        };
      }
      const driveX = state.driverPlayerId ? state.driveX ?? 0 : 0;
      const driveY = state.driverPlayerId ? state.driveY ?? 0 : 0;
      const drivePower = Math.hypot(driveX, driveY);
      const driveScale = drivePower > 1 ? 1 / drivePower : 1;
      station.driveInput = drivePower > 0.001 ? { x: driveX * driveScale, y: driveY * driveScale } : { x: 0, y: 0 };
      if (Number.isFinite(state.facingAngle)) station.facingAngle = lerpAngle(station.facingAngle ?? state.facingAngle as number, state.facingAngle as number, 0.34);
      if (Number.isFinite(state.angularVelocity)) station.angularVelocity = state.angularVelocity;
      if (Number.isFinite(state.thrusterForward)) station.thrusterForward = state.thrusterForward;
      if (Number.isFinite(state.thrusterRotation)) station.thrusterRotation = state.thrusterRotation;
      if (Number.isFinite(state.turretAngle)) station.turretAngle = lerpAngle(station.turretAngle ?? state.turretAngle as number, state.turretAngle as number, 0.42);
      if (state.turretClassId) station.turretClassId = state.turretClassId;
      station.reservedForPlayerId = state.reservedForPlayerId ?? null;
      station.starterRepairRequired = Math.max(1, state.starterRepairRequired ?? STATION_CONFIG.starterWreckRepairCost);
      station.starterRepairProgress = Math.max(0, Math.min(station.starterRepairRequired, state.starterRepairProgress ?? (state.claimState === "claimed" ? station.starterRepairRequired : 0)));
      if ((state.turretFiringUntil ?? 0) > Date.now()) {
        station.turretFiringUntil = performance.now() + Math.min(120, (state.turretFiringUntil as number) - Date.now());
      }
      station.claimState = state.claimState;
      station.ownerTeamId = state.ownerTeamId;
      station.ownerPlayerId = state.ownerPlayerId;
      station.level = Math.max(station.level, state.level);
      station.health = state.health;
      station.maxHealth = state.maxHealth;
      station.isMobile = state.isMobile;
      station.mothershipUnlocked = state.mothershipUnlocked;
      const dockedPlayerIds = Array.isArray(state.dockedPlayerIds) ? state.dockedPlayerIds : [];
      station.landingPads.forEach((pad, padIndex) => { pad.occupiedByPlayerId = dockedPlayerIds[padIndex] ?? null; });
      if (state.claimState === "claimed" && station.lifecycleState === "unclaimed") station.lifecycleState = "claimed";
      return station;
    });
    const liveIds = new Set(states.map((state) => state.id));
    for (const id of this.lastNetworkStationStates.keys()) if (!liveIds.has(id)) this.lastNetworkStationStates.delete(id);
  }

  syncNetworkTeam(networkTeam: NetworkTeam | null, player: Player) {
    if (!networkTeam) return;
    const previousMembers = new Map(this.team.members.map((member) => [member.playerId, member]));
    this.team.id = networkTeam.id;
    this.team.name = networkTeam.name;
    this.team.leaderPlayerId = networkTeam.leaderPlayerId;
    this.team.memberIds = [...networkTeam.memberIds];
    this.team.stationId = networkTeam.stationId;
    this.team.members = networkTeam.members.map((member) => {
      const previous = previousMembers.get(member.id);
      return {
        playerId: member.id,
        name: member.name,
        role: member.id === networkTeam.leaderPlayerId ? "leader" as const : "member" as const,
        status: member.online ? (member.id === player.id && player.dockingState === "docked" ? "docked" as const : "online" as const) : "offline" as const,
        joinedAt: previous?.joinedAt ?? performance.now(),
        currentShipId: previous?.currentShipId ?? (member.id === player.id ? player.currentShipId : "base_ship"),
        currentHullTier: previous?.currentHullTier ?? (member.id === player.id ? player.loadout.hullTier : 1),
        contributionStats: previous?.contributionStats ?? { etherDeposited: 0, repairsCompleted: 0, modulesCrafted: 0 },
      };
    });
  }

  spawnBrokenStations(expectedPlayerCount: number) {
    const count = getStationSpawnCount(expectedPlayerCount);
    const stations: Station[] = [];
    let attempts = 0;
    while (stations.length < count && attempts < count * 80) {
      attempts += 1;
      const candidate = this.randomStationBeltPosition();
      if (!canSpawnBrokenStationAt(candidate, stations, MAP_CONFIG)) continue;
      stations.push(this.createBrokenStation(candidate, stations.length));
    }
    return stations;
  }

  get claimedStation() {
    return this.team.stationId ? this.stations.find((station) => station.id === this.team.stationId) ?? null : null;
  }

  getNearestInteraction(player: Player): StationInteraction {
    let nearest: Station | null = null;
    let nearestDistance = Infinity;
    for (const station of this.stations) {
      const d = distance(player.pos, station.pos);
      if (d < nearestDistance) {
        nearest = station;
        nearestDistance = d;
      }
    }
    if (!nearest) return { station: null, kind: null, prompt: "", distance: Infinity };
    const owned = nearest.ownerTeamId === this.team.id;
    if (nearest.claimState === "unclaimed" && nearestDistance <= STATION_CONFIG.claimRadius) {
      const reservedForAnotherPilot = Boolean(nearest.reservedForPlayerId && nearest.reservedForPlayerId !== player.id);
      if (reservedForAnotherPilot) return { station: nearest, kind: null, prompt: "This wreck is reserved for another pilot", distance: nearestDistance };
      const repaired = nearest.starterRepairProgress >= nearest.starterRepairRequired;
      return repaired
        ? { station: nearest, kind: "claim", prompt: "Press F to Land and Integrate", distance: nearestDistance }
        : { station: nearest, kind: "repair_wreck", prompt: player.cargo.ether.rawEther > 0 ? "Press F to Install Raw Ether Repairs" : "Mine asteroids for Raw Ether", distance: nearestDistance };
    }
    if (owned && nearestDistance <= STATION_CONFIG.depositRadius) {
      return {
        station: nearest,
        kind: "dock",
        prompt: player.dockedStationId === nearest.id ? "Press F to Undock" : "Press F to Dock",
        distance: nearestDistance,
      };
    }
    return { station: nearest, kind: null, prompt: "", distance: nearestDistance };
  }

  getNearestUnclaimedStation(player: Player) {
    return getNearestUnclaimedStation(player, this.stations);
  }

  getVisibleStationMarkers(player: Player, scannerActive = false) {
    return getVisibleStationMarkers(player, this.stations, scannerActive);
  }

  interact(player: Player) {
    const interaction = this.getNearestInteraction(player);
    if (!interaction.station || !interaction.kind) return false;
    if (interaction.kind === "repair_wreck") return this.repairStarterWreck(player, interaction.station) > 0;
    if (interaction.kind === "claim") return this.claimStation(interaction.station, player);
    if (interaction.kind === "deposit") return this.depositAllEther(player, interaction.station) > 0;
    if (interaction.kind === "dock") {
      if (player.dockedStationId === interaction.station.id) return this.launchPlayerFromStation(player, interaction.station);
      return this.dockPlayerAtStation(player, interaction.station);
    }
    return false;
  }

  private isSubsystemOfflineOrDisabled(station: Station, subsystemId: StationSubsystemId) {
    const state = station.subsystemStates[subsystemId]?.state;
    return state === "offline" || state === "disabled";
  }

  dockPlayerAtStation(player: Player, station = this.claimedStation) {
    if (!station || station.ownerTeamId !== this.team.id) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "landing_pads")) return false;
    const pad = station.landingPads
      .filter((entry) => entry.unlocked && (!entry.occupiedByPlayerId || entry.occupiedByPlayerId === player.id))
      .sort((a, b) => distance(player.pos, this.getLandingPadPosition(station, a)) - distance(player.pos, this.getLandingPadPosition(station, b)))[0];
    if (!pad) return false;
    const padPosition = this.getLandingPadPosition(station, pad);
    if (distance(player.pos, padPosition) > STATION_CONFIG.dockRadius) return false;
    station.landingPads.forEach((entry) => {
      if (entry.occupiedByPlayerId === player.id) entry.occupiedByPlayerId = null;
    });
    pad.occupiedByPlayerId = player.id;
    player.dockedStationId = station.id;
    player.dockingState = "docking";
    player.dockingAnimationStartedAt = performance.now();
    player.dockingFrom = { ...player.pos };
    player.dockingTo = padPosition;
    player.vel = { x: 0, y: 0 };
    player.angularVelocity = 0;
    player.thrustWorld = { x: 0, y: 0 };
    player.thrustLocal = { forward: 0, strafe: 0 };
    station.driveInput = { x: 0, y: 0 };
    return true;
  }

  launchPlayerFromStation(player: Player, station = this.claimedStation) {
    if (!station || player.dockedStationId !== station.id) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "landing_pads")) return false;
    const pad = station.landingPads.find((entry) => entry.occupiedByPlayerId === player.id);
    if (!pad) return false;
    const padPosition = this.getLandingPadPosition(station, pad);
    player.dockingState = "undocking";
    player.dockingAnimationStartedAt = performance.now();
    player.dockingFrom = padPosition;
    player.dockingTo = padPosition;
    player.pos = padPosition;
    player.vel = { x: 0, y: 0 };
    player.angularVelocity = 0;
    player.thrustWorld = { x: 0, y: 0 };
    player.thrustLocal = { forward: 0, strafe: 0 };
    station.driveInput = { x: 0, y: 0 };
    return true;
  }

  updateDockingAnimation(player: Player, now = performance.now()) {
    if (player.dockingState !== "docking" && player.dockingState !== "undocking") return;
    const station = this.stations.find((entry) => entry.id === player.dockedStationId);
    const pad = station?.landingPads.find((entry) => entry.occupiedByPlayerId === player.id);
    if (station && pad) {
      const livePadPosition = this.getLandingPadPosition(station, pad);
      player.dockingTo = livePadPosition;
      if (player.dockingState === "undocking") player.dockingFrom = livePadPosition;
    }
    const t = Math.max(0, Math.min(1, (now - player.dockingAnimationStartedAt) / player.dockingAnimationDurationMs));
    const eased = t * t * (3 - 2 * t);
    player.pos = {
      x: player.dockingFrom.x + (player.dockingTo.x - player.dockingFrom.x) * eased,
      y: player.dockingFrom.y + (player.dockingTo.y - player.dockingFrom.y) * eased,
    };
    player.vel = { x: 0, y: 0 };
    if (t < 1) return;
    if (player.dockingState === "docking") {
      player.dockingState = "docked";
      return;
    }
    if (pad) pad.occupiedByPlayerId = null;
    player.dockedStationId = null;
    player.dockingState = "free";
    player.vel = { x: 0, y: 0 };
    player.angularVelocity = 0;
    player.thrustWorld = { x: 0, y: 0 };
    player.thrustLocal = { forward: 0, strafe: 0 };
  }

  getDockedPlayerPosition(player: Player, station = this.claimedStation) {
    if (!station || player.dockedStationId !== station.id) return null;
    const pad = station.landingPads.find((entry) => entry.occupiedByPlayerId === player.id);
    return pad ? this.getLandingPadPosition(station, pad) : { ...station.pos };
  }

  private getLandingPadPosition(station: Station, pad: Station["landingPads"][number]) {
    return {
      x: station.pos.x + pad.positionOffset.x,
      y: station.pos.y + pad.positionOffset.y,
    };
  }

  isPlayerDockedAtClaimedStation(player: Player, station = this.claimedStation) {
    return Boolean(station && player.dockedStationId === station.id && player.dockingState === "docked");
  }

  requireDockedPlayer(player: Player, station = this.claimedStation) {
    return this.isPlayerDockedAtClaimedStation(player, station) ? station : null;
  }

  pilotClaimedStation(player: Player, command: MovementCommand, _dt: number, station = this.claimedStation) {
    if (!station || !canPilotStation(station, player)) return false;
    const maxSpeed = getStationPilotMaxSpeed(station);
    station.driveInput = { x: command.rotationInput, y: -command.thrustInput };
    player.pos = this.getDockedPlayerPosition(player, station) ?? { ...station.pos };
    player.vel = { x: 0, y: 0 };
    // The carrier artwork faces up at zero rotation, while the shared flight
    // solver uses +X as its local forward axis.
    player.thrustWorld = { x: Math.sin(station.facingAngle ?? 0) * command.thrustInput, y: -Math.cos(station.facingAngle ?? 0) * command.thrustInput };
    player.thrustLocal = { forward: station.thrusterForward ?? command.thrustInput, strafe: station.thrusterRotation ?? command.rotationInput };
    station.isMobile = true;
    station.lifecycleState = "active";
    station.lastActiveAt = performance.now();
    station.localRelocationReason = `Command drive online. W/S thrust, A/D rotate. Maximum forward speed ${Math.round(maxSpeed)} u/s.`;
    return true;
  }

  aimClaimedStationTurret(player: Player, aimWorld: Vec2, dt: number, station = this.claimedStation) {
    if (!station || !canPilotStation(station, player)) return null;
    const targetAngle = Math.atan2(aimWorld.y - station.pos.y, aimWorld.x - station.pos.x);
    const blend = 1 - Math.exp(-STATION_CONFIG.stationTurretResponse * Math.min(dt, 0.1));
    station.turretAngle = lerpAngle(station.turretAngle ?? targetAngle, targetAngle, blend);
    return station.turretAngle;
  }

  getClaimedStationTurretMuzzles(station: Station, angle = station.turretAngle ?? 0) {
    const rotation = station.facingAngle ?? 0;
    const classId = (station.turretClassId ?? "base_ship").toLowerCase();
    const twin = classId.includes("twin") || classId.includes("machine_gun_l15");
    const sniper = classId.includes("sniper");
    const mountXs = twin ? [-STATION_CONFIG.spacecraftTurretMountX, STATION_CONFIG.spacecraftTurretMountX] : [STATION_CONFIG.spacecraftTurretMountX];
    const barrelLength = sniper ? 128 : STATION_CONFIG.spacecraftTurretBarrelLength;
    return mountXs.map((mountRatio) => {
      const localX = station.radius * mountRatio;
      const localY = station.radius * STATION_CONFIG.spacecraftTurretMountY;
      const mountX = station.pos.x + localX * Math.cos(rotation) - localY * Math.sin(rotation);
      const mountY = station.pos.y + localX * Math.sin(rotation) + localY * Math.cos(rotation);
      return { x: mountX + Math.cos(angle) * barrelLength, y: mountY + Math.sin(angle) * barrelLength };
    });
  }

  relocateClaimedStationNearPlayer(player: Player, station = this.claimedStation) {
    if (!station || station.ownerTeamId !== this.team.id) return false;
    const lockReason = getLocalStationRelocationLockReason(station, player);
    if (lockReason) {
      station.localRelocationReason = lockReason;
      return false;
    }
    const dockedPad = station.landingPads.find((entry) => entry.occupiedByPlayerId === player.id);
    const inward = normalize({
      x: MAP_CONFIG.centerX - station.pos.x,
      y: MAP_CONFIG.centerY - station.pos.y,
    });
    const direction = inward.x || inward.y ? inward : { x: Math.cos(player.angle), y: Math.sin(player.angle) };
    const impulse = STATION_CONFIG.stationPilotAcceleration * 0.8;
    station.vel.x += direction.x * impulse;
    station.vel.y += direction.y * impulse;
    clampStationVelocity(station, getStationPilotMaxSpeed(station));
    if (dockedPad) {
      player.pos = { ...station.pos };
      player.vel = { x: 0, y: 0 };
    }
    station.isMobile = true;
    station.lifecycleState = "active";
    station.lastActiveAt = performance.now();
    station.localRelocationReason = "Basic booster online. Use WASD while docked to pilot the station.";
    return true;
  }

  update(dt: number, enemies: Enemy[], now: number, etherDrops?: EtherDropSystem) {
    for (const station of this.stations) {
      if (station.lifecycleState === "destroyed") continue;
      this.updateStationMovement(station, dt, now);
      station.defenseStats = calculateStationDefenseStats(station);
      station.selfDefenseEnabled = canStationSelfDefend(station);
      const sinceAttack = now - station.lastAttackedAt;
      station.underAttack = sinceAttack < 5000;
      this.updatePowerCore(station, now);
      if (station.shield < station.defenseStats.shieldCapacity && sinceAttack > 3500) {
        station.shield = Math.min(station.defenseStats.shieldCapacity, station.shield + station.defenseStats.shieldRegen * dt);
      }
      if (station.health < station.maxHealth && sinceAttack > 2500) {
        station.health = Math.min(station.maxHealth, station.health + station.defenseStats.repairRate * dt);
      }
      const defensesOnline = station.repairStageIndex >= 4 && station.claimState === "claimed";
      const raidWarningActive = typeof station.raidWarningUntil === "number" && now < station.raidWarningUntil;
      const raidEnemiesNearby = defensesOnline
        ? enemies.filter((e) => e.health > 0 && distance(e.pos, station.pos) <= STATION_CONFIG.stationRaidEnemyProximityRadius)
        : [];

      if (defensesOnline) {
        const raidOngoing = !raidWarningActive && raidEnemiesNearby.length > 0;
        const raidJustFinished = !raidWarningActive && raidEnemiesNearby.length === 0 && station.lastAttackedAt > 0 && sinceAttack > STATION_CONFIG.stationRaidCompletionClearTimeMs;

        if (raidJustFinished) {
          const rewardBase = Math.floor(160 + station.level * 2.2);
          addEtherToCargo(station.storage, "rawEther", rewardBase);
          if (station.level >= 30) addEtherToCargo(station.storage, "refinedEther", Math.floor(rewardBase * 0.22));
          if (station.level >= 60) addEtherToCargo(station.storage, "chargedEther", Math.floor(rewardBase * 0.11));
          if (station.level >= 90) addEtherToCargo(station.storage, "primalEther", Math.floor(rewardBase * 0.04));
          station.xp += rewardBase * 0.45;
          this.levelStationFromXp(station);
          this.updateStationUnlocks(station);

          station.lifecycleState = "active";
          station.raidWarningUntil = undefined;
          station.lastAttackedAt = 0;
          station.underAttack = false;
          station.nextRaidAt = now + randomRange(25000, 52000);
        }

        if (raidWarningActive) {
          station.lifecycleState = "under_attack";
        } else {
          const warningJustEnded = typeof station.raidWarningUntil === "number" && now >= station.raidWarningUntil;
          if (warningJustEnded) {
            station.raidWarningUntil = undefined;
            station.lifecycleState = "under_attack";
            station.lastAttackedAt = now;
            this.spawnRaidAttackersForStation(station, enemies);
          } else if (!raidOngoing) {
            if (!station.lastAttackedAt || now - station.lastAttackedAt > 2500) {
              const nextWarningAt = station.nextRaidAt ?? (now + randomRange(16000, 32000));
              if (now >= nextWarningAt) {
                station.raidWarningUntil = now + 2500;
                station.lifecycleState = "under_attack";
                station.lastAttackedAt = 0;
                station.underAttack = false;
                station.nextRaidAt = now + randomRange(30000, 52000);
              } else {
                station.nextRaidAt = nextWarningAt;
              }
            }
          }
        }
      }

      if (!raidWarningActive) updateStationAutoDefense(station, enemies, dt, now);
      this.updateStationHyperdrive(station, dt, now, enemies);
      if (station.health <= 0 && station.claimState === "claimed") this.destroyBaseStation(station, etherDrops, now);
    }
  }

  private spawnRaidAttackersForStation(station: Station, enemies: Enemy[]) {
    const maxEnemies = TUNING.botCount;
    const availableSlots = Math.max(0, maxEnemies - enemies.length);
    if (availableSlots <= 0) return;

    type RaidVariant = "miner" | "siege" | "disruptor" | "boss";
    const raidVariant: RaidVariant = station.level >= 90
      ? "boss"
      : station.level >= 60
        ? "disruptor"
        : station.level >= 30
          ? "siege"
          : "miner";

    const baseCount = 2 + Math.floor(station.level / 25);
    const extra = raidVariant === "boss" ? 2 : raidVariant === "disruptor" ? 1 : 0;
    const count = Math.min(availableSlots, baseCount + extra);
    const spawnRadius = Math.max(2000, station.defenseStats.defenseRange + 650);

    const preset = (enemy: Enemy, index: number) => {
      if (raidVariant === "boss") {
        enemy.alienType = index === 0 ? "core_guardian" : index % 2 === 0 ? "mine_warden" : "beam_guard";
      } else if (raidVariant === "disruptor") {
        enemy.alienType = index % 3 === 0 ? "interceptor" : index % 3 === 1 ? "beam_guard" : "sentinel";
      } else if (raidVariant === "siege") {
        enemy.alienType = index % 3 === 0 ? "mine_warden" : index % 3 === 1 ? "beam_guard" : "sentinel";
      } else {
        enemy.alienType = index % 2 === 0 ? "sentinel" : "mine_warden";
      }

      enemy.role = enemy.alienType === "interceptor" ? "aggressor" : enemy.alienType === "mine_warden" ? "rammer" : enemy.alienType === "beam_guard" ? "sniper" : "farmer";
      enemy.attackerSlotCost = enemy.alienType === "core_guardian" ? 3 : enemy.alienType === "interceptor" ? 2 : 1;
      enemy.aggroRadius = enemy.alienType === "core_guardian" ? 2200 : enemy.alienType === "beam_guard" ? 900 : enemy.alienType === "interceptor" ? 760 : 1450;
      enemy.leashRadius = enemy.alienType === "core_guardian" ? 3600 : 2800;
      enemy.maxHealth = enemy.alienType === "core_guardian" ? 540 : enemy.alienType === "interceptor" ? 145 : enemy.alienType === "mine_warden" ? 145 : 175;
      enemy.health = enemy.maxHealth;
    };

    for (let i = 0; i < count; i += 1) {
      const alien = Enemy.createAlienDefender(Math.floor(randomRange(1, 1_000_000)));
      preset(alien, i);
      const angle = randomRange(0, Math.PI * 2);
      alien.pos = clampToWorld(
        { x: station.pos.x + Math.cos(angle) * spawnRadius, y: station.pos.y + Math.sin(angle) * spawnRadius },
        alien.radius + 90,
      );
      alien.home = { ...alien.pos };
      enemies.push(alien);
    }
  }

  resolveStationPhysicalCollisions(asteroids: Asteroid[], enemies: Enemy[]) {
    const station = this.claimedStation;
    if (!station || station.lifecycleState === "destroyed" || isStationPhasedForHyperdrive(station)) return;
    const collisionRadius = getStationPhysicalRadius(station);
    for (const asteroid of asteroids) {
      const dx = station.pos.x - asteroid.pos.x;
      const dy = station.pos.y - asteroid.pos.y;
      const d = Math.max(0.001, Math.hypot(dx, dy));
      const overlap = collisionRadius + asteroid.radius - d;
      if (overlap <= 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const stationPush = Math.min(overlap * 0.22, 38);
      const asteroidPush = Math.max(overlap - stationPush, 0);
      station.pos = clampToWorld({ x: station.pos.x + nx * stationPush, y: station.pos.y + ny * stationPush }, station.radius + 250);
      asteroid.pos.x -= nx * asteroidPush;
      asteroid.pos.y -= ny * asteroidPush;
      const normalSpeed = station.vel.x * nx + station.vel.y * ny;
      if (normalSpeed < 0) {
        station.vel.x -= nx * normalSpeed * (1 + STATION_CONFIG.stationCollisionRestitution);
        station.vel.y -= ny * normalSpeed * (1 + STATION_CONFIG.stationCollisionRestitution);
        asteroid.vel.x -= nx * normalSpeed * 0.08;
        asteroid.vel.y -= ny * normalSpeed * 0.08;
      }
      asteroid.takeDamage(Math.max(0.2, (Math.hypot(station.vel.x, station.vel.y) + overlap * 0.15) * STATION_CONFIG.stationAsteroidCrushDamage));
    }
    for (const enemy of enemies) {
      const dx = enemy.pos.x - station.pos.x;
      const dy = enemy.pos.y - station.pos.y;
      const d = Math.max(0.001, Math.hypot(dx, dy));
      const overlap = collisionRadius + enemy.radius - d;
      if (overlap <= 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      enemy.pos.x += nx * (overlap + 12);
      enemy.pos.y += ny * (overlap + 12);
      enemy.health -= 2.6;
      station.vel.x -= nx * 8;
      station.vel.y -= ny * 8;
    }
  }

  claimStation(station: Station, player: Player) {
    if (station.claimState !== "unclaimed") return false;
    if (station.starterRepairProgress < station.starterRepairRequired) return false;
    if (this.team.stationId) return false;
    station.ownerTeamId = this.team.id;
    station.ownerPlayerId = player.id;
    station.name = player.name;
    station.claimState = "claimed";
    station.reservedForPlayerId = null;
    station.health = Math.max(station.health, station.maxHealth * 0.22);
    station.movementLockReason = getStationMovementLockReason(station, player);
    this.team.stationId = station.id;
    player.setClass("base_ship");
    this.dockPlayerAtStation(player, station);
    return true;
  }

  repairStarterWreck(player: Player, station: Station) {
    if (station.claimState !== "unclaimed" || distance(player.pos, station.pos) > STATION_CONFIG.claimRadius) return 0;
    if (station.reservedForPlayerId && station.reservedForPlayerId !== player.id) return 0;
    const missing = Math.max(0, station.starterRepairRequired - station.starterRepairProgress);
    const installed = removeEtherFromCombinedCargo(player.cargo, "rawEther", missing);
    if (installed <= 0) return 0;
    station.starterRepairProgress += installed;
    const ratio = station.starterRepairProgress / station.starterRepairRequired;
    station.health = Math.max(station.health, station.maxHealth * (0.16 + ratio * 0.18));
    return installed;
  }

  depositAllEther(player: Player, station = this.claimedStation) {
    if (!station || station.ownerTeamId !== this.team.id || station.lifecycleState === "destroyed") return 0;
    if (this.isSubsystemOfflineOrDisabled(station, "storage")) return 0;
    let deposited = 0;
    for (const type of Object.keys(player.cargo.ether) as EtherType[]) {
      const amount = player.cargo.ether[type];
      if (amount <= 0) continue;
      const accepted = addEtherToCargo(station.storage, type, amount);
      player.cargo.ether[type] -= accepted;
      deposited += accepted;
      station.xp += accepted * ETHER_VALUE_WEIGHTS[type].stationXp;
    }
    syncCargoUsed(player.cargo);
    syncCargoUsed(station.storage);
    if (deposited > 0) {
      this.team.members[0].contributionStats.etherDeposited += deposited;
      this.levelStationFromXp(station);
      this.updateStationUnlocks(station);
    }
    return deposited;
  }

  repairNextStage(station = this.claimedStation) {
    if (!station || station.isFullyRepaired) return false;
    const stage = station.repairStages[station.repairStageIndex];
    if (!stage) return false;

    const subsystemForStage: Partial<Record<RepairStageId, StationSubsystemId>> = {
      coreSystems: "power_core",
      fuelConverter: "fuel_refinery",
      storage: "storage",
      shipUpgradeBay: "upgrade_console",
      crafting: "crafting_bay",
      defenses: "turrets",
      landingPads: "landing_pads",
      commandCore: "fleet_control_system",
      fullRestoration: "hyperdrive_system",
    };

    const requiredSubsystem = subsystemForStage[stage.id];
    if (requiredSubsystem && this.isSubsystemOfflineOrDisabled(station, requiredSubsystem)) return false;
    if (!canAffordEtherCost(station.storage, stage.cost)) return false;
    if (!spendStationFuel(station, stage.fuelCost, "repair:" + stage.id)) return false;
    if (!spendEther(station.storage, stage.cost)) return false;

    station.repairStageIndex += 1;
    station.xp += stage.fuelCost * 2;
    station.health = Math.min(station.maxHealth, station.health + station.maxHealth * 0.12);
    station.craftingTier = Math.max(station.craftingTier, this.getCraftingTierForRepairStage(station.repairStageIndex));
    station.upgradeState.craftingLevel = station.craftingTier;
    station.upgradeState.hullConsoleLevel = station.repairStageIndex >= 4 ? 1 : station.upgradeState.hullConsoleLevel;
    station.upgradeState.boosterLevel = isRepairStageCompleteForStation(station, "coreSystems") ? Math.max(1, station.upgradeState.boosterLevel) : station.upgradeState.boosterLevel;
    station.isFullyRepaired = station.repairStageIndex >= station.repairStages.length;
    if (station.isFullyRepaired) station.health = station.maxHealth;
    this.team.members[0].contributionStats.repairsCompleted += 1;
    this.levelStationFromXp(station);
    this.updateStationUnlocks(station);
    this.refreshUpgradeUnlocks(station);
    return true;
  }
  upgradeStationDefense(category: StationUpgradeCategory, station = this.claimedStation) {
    if (!station) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "turrets")) return false;
    const upgrade = station.upgrades.find((entry) => entry.category === category);
    if (!upgrade || upgrade.level >= upgrade.maxLevel) return false;
    this.refreshUpgradeUnlocks(station);
    if (!upgrade.unlocked) return false;
    const fuelCost = this.fuelValue(upgrade.upgradeCost);
    if (!spendStationFuel(station, fuelCost, "defense:" + category)) return false;
    upgrade.level += 1;
    upgrade.installed = upgrade.level > 0;
    upgrade.upgradeCost = getStationUpgradeCost(upgrade.category, Math.min(upgrade.maxLevel, upgrade.level + 1));
    upgrade.bonuses = getStationUpgradeBonuses(upgrade.category, Math.min(upgrade.maxLevel, upgrade.level + 1));
    station.defenseStats = calculateStationDefenseStats(station);
    station.defensePowerLevel = station.upgrades.reduce((sum, entry) => sum + entry.level, 0);
    station.selfDefenseEnabled = canStationSelfDefend(station);
    station.shield = Math.min(station.defenseStats.shieldCapacity, station.shield + station.defenseStats.shieldCapacity * 0.3);
    station.xp += this.costValue(upgrade.upgradeCost) * 2;
    this.levelStationFromXp(station);
    this.updateStationUnlocks(station);
    return true;
  }

  upgradeHull(player: Player, station = this.claimedStation) {
    if (!station) return false;
    const next = getNextHullTier(player.loadout.hullTier);
    if (!next || !this.canUpgradeHull(player, station, next.tier)) return false;
    const fuelCost = this.fuelValue(next.etherCost);
    if (!spendStationFuel(station, fuelCost, "hull:tier-" + next.tier)) return false;
    player.loadout.hullTier = next.tier;
    player.recalculate();
    this.team.members[0].currentHullTier = next.tier;
    station.xp += this.costValue(next.etherCost) * 3;
    this.levelStationFromXp(station);
    return true;
  }

  canUpgradeHull(player: Player, station: Station, tier: HullTierId) {
    const target = getHullTier(tier);
    if (player.level < target.levelRequirement) return false;
    if (station.craftingTier < target.requiredCraftingTier) return false;
    if (target.requiredRepairStage && !this.isRepairStageComplete(station, target.requiredRepairStage)) return false;
    return this.isRepairStageComplete(station, "shipUpgradeBay") && canAffordStationFuelCost(station, this.fuelValue(target.etherCost));
  }

  craftModule(player: Player, moduleId: string, station = this.claimedStation) {
    if (!station) return false;
    const module = getModuleDefinition(moduleId);
    if (!module || !this.canCraftModule(player, station, module)) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "crafting_bay")) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "upgrade_console")) return false;
    const fuelCost = this.fuelValue(module.cost);
    if (!spendStationFuel(station, fuelCost, "craft:" + module.id)) return false;
    player.loadout.craftedModuleIds.push(module.id);
    this.team.members[0].contributionStats.modulesCrafted += 1;
    if (module.id === "mothership_core") station.mothershipCoreCrafted = true;
    station.xp += this.costValue(module.cost) * 3;
    this.levelStationFromXp(station);
    return true;
  }

  canCraftModule(player: Player, station: Station, module: ShipModuleDefinition) {
    if (station.craftingTier < module.craftingTier) return false;
    if (player.level < module.levelRequirement) return false;
    if (player.loadout.craftedModuleIds.includes(module.id)) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "crafting_bay")) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "upgrade_console")) return false;
    return canAffordStationFuelCost(station, this.fuelValue(module.cost));
  }

  getShipStatUpgradeCost(player: Player, statKey: StatKey) {
    const currentRank = Math.max(0, Math.floor(player.stats[statKey] ?? 0));
    return currentRank < 10
      ? 60 + (currentRank + 1) * (currentRank + 1) * 20
      : 1200 + (currentRank - 9) * (currentRank - 9) * 500;
  }

  getShipStatUpgradeLockReason(player: Player, statKey: StatKey, station = this.claimedStation) {
    if (!station || player.dockedStationId !== station.id || player.dockingState !== "docked") return "Dock at a station to upgrade.";
    if (!this.isRepairStageComplete(station, "shipUpgradeBay")) return "Repair the Ship Upgrade Bay.";
    if (!canUpgradeShipStat(player, statKey)) return "Level, rank, or upgrade point requirement not met.";
    const fuelCost = this.getShipStatUpgradeCost(player, statKey);
    if (!canAffordStationFuelCost(station, fuelCost)) return "Requires " + fuelCost.toLocaleString() + " Station Fuel.";
    return "";
  }

  upgradeShipStat(player: Player, statKey: StatKey, station = this.claimedStation) {
    if (!station || this.getShipStatUpgradeLockReason(player, statKey, station)) return false;
    const fuelCost = this.getShipStatUpgradeCost(player, statKey);
    if (!spendStationFuel(station, fuelCost, "ship-stat:" + statKey)) return false;
    return player.upgrade(statKey);
  }
  installFirstAvailableModule(player: Player, moduleId: string) {
    const module = getModuleDefinition(moduleId);
    if (!module || !player.loadout.craftedModuleIds.includes(moduleId)) return false;
    const hull = getHullTier(player.loadout.hullTier);
    const slotCount = hull.slots[module.slotType] ?? 0;
    const usedSlots = player.loadout.installedModules.filter((entry) => entry.slotType === module.slotType);
    if (usedSlots.some((entry) => entry.moduleId === moduleId)) return false;
    if (usedSlots.length >= slotCount) return false;
    player.loadout.installedModules.push({ slotType: module.slotType, slotIndex: usedSlots.length, moduleId });
    player.recalculate();
    return true;
  }

  getCraftableForPlayer(player: Player, station = this.claimedStation) {
    if (!station) return [];
    return getCraftableModules(station.craftingTier, player.level);
  }

  getStationSnapshot(player: Player) {
    const station = this.claimedStation;
    const interaction = this.getNearestInteraction(player);
    if (!station) {
      return {
        claimed: null,
        nearby: interaction.station ? this.toStationLite(interaction.station) : null,
        interactionPrompt: interaction.prompt,
        team: this.team,
      };
    }
    station.movementLockReason = getStationMovementLockReason(station, player);
    station.localRelocationAvailable = canLocallyRelocateStation(station, player);
    station.localRelocationReason = getLocalStationRelocationLockReason(station, player) || `Basic booster online. Use WASD while docked to pilot the station.`;
    return {
      claimed: {
        ...this.toStationLite(station),
        storage: {
          capacity: station.storage.capacity,
          used: station.storage.used,
          ether: { ...station.storage.ether },
        },
        fuel: { ...station.fuel, conversionQueue: [...station.fuel.conversionQueue] },
        repairStageIndex: station.repairStageIndex,
        repairStageCount: station.repairStages.length,
        currentRepairStage: station.repairStages[station.repairStageIndex] ?? null,
        repairStages: station.repairStages,
        completedRepairStages: station.repairStages.slice(0, station.repairStageIndex).map((stage) => stage.name),
        isFullyRepaired: station.isFullyRepaired,
        craftingTier: station.craftingTier,
        movementLockReason: station.movementLockReason,
        localRelocationAvailable: station.localRelocationAvailable,
        localRelocationReason: station.localRelocationReason,
        defenseSlotsUnlocked: station.defenseSlots.filter((slot) => slot.unlocked).length,
        landingPadsUnlocked: station.landingPads.filter((pad) => pad.unlocked).length,
        etherFuel: station.fuel.currentFuel,
        hyperdriveState: station.hyperdrive.hyperdriveState,
        hyperdriveChargeStartedAt: station.hyperdrive.hyperdriveChargeStartedAt,
        hyperdriveCooldownUntil: station.hyperdrive.hyperdriveCooldownUntil,
        hyperdriveChargeDurationMs: station.hyperdrive.hyperdriveChargeDurationMs,
        hyperdriveLastInterruptReason: station.hyperdrive.hyperdriveLastInterruptReason,
        upgrades: station.upgrades.map((upgrade) => ({ ...upgrade, upgradeCost: { ...upgrade.upgradeCost }, bonuses: { ...upgrade.bonuses } })),
        defenseStats: { ...station.defenseStats },
        selfDefenseEnabled: station.selfDefenseEnabled,
        defenseLockReason: getStationDefenseLockReason(station),
        underAttack: station.underAttack,
        shield: station.shield,
        powerCoreLevel: station.powerCoreLevel,
        powerCapacity: station.powerCapacity,
        powerUsed: station.powerUsed,
        powerOverloaded: station.powerOverloaded,
        powerOverloadReason: station.powerOverloadReason,
        subsystemStates: station.subsystemStates,
      },
      nearby: interaction.station ? this.toStationLite(interaction.station) : null,
      interactionPrompt: interaction.prompt,
      team: this.team,
      baseLost: this.baseLostState,
    };
  }

  destroyBaseStation(station: Station, etherDrops?: EtherDropSystem, now = performance.now()) {
    const summary = getBaseDestructionSummary(station);
    dropStationDestructionSalvage(station, etherDrops, now);
    clearStationProgress(station);
    station.lifecycleState = "destroyed";
    station.claimState = "unclaimed";
    station.ownerTeamId = null;
    station.ownerPlayerId = null;
    station.health = 0;
    station.destroyedAt = now;
    if (this.team.stationId === station.id) this.team.stationId = null;
    if (this.team.mothershipId === station.id) this.team.mothershipId = null;
    this.baseLostState = {
      baseDestroyedAt: now,
      destroyedStationId: station.id,
      resourcesLost: summary.resourcesLost,
      salvageDropped: summary.salvageDropped,
      teamNeedsNewStation: true,
      previousStationLevel: summary.previousStationLevel,
      previousMothershipState: summary.previousMothershipState,
      destructionSector: "unknown",
    };
    return this.baseLostState;
  }

  canStationMove(station: Station, ownerPlayer: Player) {
    return canStationMove(station, ownerPlayer);
  }

  calculateHyperdriveFuelCost(currentPosition: Vec2, destination: Vec2) {
    return STATION_CONFIG.hyperdriveBaseFuelCost + distance(currentPosition, destination) * STATION_CONFIG.hyperdriveFuelCostPerWorldUnit;
  }

  convertEtherToFuel(station: Station, etherType: EtherType, amount: number) {
    if (!this.isRepairStageComplete(station, "fuelConverter")) return 0;
    return convertEtherToStationFuel(station, etherType, Math.min(amount, station.storage.ether[etherType]));
  }
  transformStationToMothership(ownerPlayer: Player, station = this.claimedStation) {
    if (!station) return false;
    if (station.ownerTeamId !== this.team.id) return false;
    if (station.ownerPlayerId !== ownerPlayer.id) return false;
    if (station.mothershipUnlocked) return true;

    const playerAtRequirements = ownerPlayer.level >= 100 && ownerPlayer.loadout.hullTier >= 7;
    const stationAtRequirements = station.isFullyRepaired && station.level >= 100 && station.mothershipCoreCrafted;
    if (!playerAtRequirements) return false;
    if (!stationAtRequirements) return false;

    if (!station.transformationPaid) {
      if (!canAffordEtherCost(station.storage, STATION_CONFIG.mothershipTransformationCost)) return false;
      if (!spendStationFuel(station, STATION_CONFIG.mothershipTransformationFuelCost, "mothership-transformation")) return false;
      if (!spendEther(station.storage, STATION_CONFIG.mothershipTransformationCost)) return false;
      station.transformationPaid = true;
    }

    station.mothershipUnlocked = true;
    station.isMobile = true;
    station.lifecycleState = "mothership";
    station.localRelocationReason = "Mothership systems online. Hyperdrive operational.";
    this.updateStationUnlocks(station);
    return true;
  }

  startHyperdriveWarp(ownerPlayer: Player, station = this.claimedStation, destination: Vec2, now = performance.now()) {
    if (!station) return false;
    if (station.ownerTeamId !== this.team.id) return false;
    if (station.ownerPlayerId !== ownerPlayer.id) return false;
    if (!station.hyperdrive.hyperdriveUnlocked) return false;
    if (station.hyperdrive.hyperdriveState !== "idle") return false;
    if (this.isSubsystemOfflineOrDisabled(station, "power_core")) return false;
    if (this.isSubsystemOfflineOrDisabled(station, "hyperdrive_system")) return false;
    if (station.powerOverloaded) {
      station.hyperdrive.hyperdriveLastInterruptReason = station.powerOverloadReason || "Power overload.";
      return false;
    }
    if (station.underAttack) return false;

    if (!station.isFullyRepaired || station.level < 100) return false;
    if (ownerPlayer.level < 100 || ownerPlayer.loadout.hullTier < 7) return false;
    if (!station.mothershipCoreCrafted) return false;

    const requiredFuel = this.calculateHyperdriveFuelCost(station.pos, destination);
    if (!canAffordStationFuelCost(station, requiredFuel)) {
      station.hyperdrive.hyperdriveLastInterruptReason = "Not enough hyperdrive fuel.";
      return false;
    }

    if (!spendStationFuel(station, requiredFuel, "hyperdrive")) return false;
    station.hyperdrive.hyperdriveState = "charging";
    station.hyperdrive.hyperdriveChargeStartedAt = now;
    station.hyperdrive.hyperdriveDestination = destination;
    station.hyperdrive.hyperdriveFuelCost = requiredFuel;
    station.hyperdrive.hyperdriveLastInterruptReason = undefined;
    station.hyperdrive.isPhasedDuringWarp = false;
    station.hyperdrive.hyperdriveChargeStartHealth = station.health;
    station.hyperdrive.hyperdriveChargeStartShield = station.shield;
    station.lifecycleState = "active";
    return true;
  }

  private updateStationHyperdrive(station: Station, _dt: number, now: number, enemies: Enemy[]) {
    if (station.hyperdrive.hyperdriveState === "charging") {
      if (station.underAttack) {
        station.hyperdrive.hyperdriveState = "interrupted";
        station.hyperdrive.hyperdriveLastInterruptReason = "Hyperdrive interrupted by hostile fire.";

        const fuelCost = station.hyperdrive.hyperdriveFuelCost ?? 0;
        const penalty = fuelCost * STATION_CONFIG.hyperdriveFailedStartupFuelPenalty;
        station.fuel.currentFuel = Math.max(0, station.fuel.currentFuel - penalty);

        station.hyperdrive.hyperdriveCooldownUntil = now + STATION_CONFIG.hyperdriveCooldownMs;
        station.hyperdrive.hyperdriveChargeStartedAt = undefined;
        station.hyperdrive.hyperdriveDestination = undefined;
        station.hyperdrive.hyperdriveFuelCost = undefined;
        station.hyperdrive.isPhasedDuringWarp = false;
        return;
      }

      const threat = enemies.some((e) => e.health > 0 && distance(e.pos, station.pos) <= STATION_CONFIG.hyperdriveThreatRadius);
      if (threat) {
        station.hyperdrive.hyperdriveState = "interrupted";
        station.hyperdrive.hyperdriveLastInterruptReason = "Hyperdrive interdicted by hostile threat.";

        const fuelCost = station.hyperdrive.hyperdriveFuelCost ?? 0;
        const penalty = fuelCost * STATION_CONFIG.hyperdriveFailedStartupFuelPenalty;
        station.fuel.currentFuel = Math.max(0, station.fuel.currentFuel - penalty);

        station.hyperdrive.hyperdriveCooldownUntil = now + STATION_CONFIG.hyperdriveCooldownMs;
        station.hyperdrive.hyperdriveChargeStartedAt = undefined;
        station.hyperdrive.hyperdriveDestination = undefined;
        station.hyperdrive.hyperdriveFuelCost = undefined;
        station.hyperdrive.isPhasedDuringWarp = false;
        return;
      }

      const startHealth = station.hyperdrive.hyperdriveChargeStartHealth;
      const startShield = station.hyperdrive.hyperdriveChargeStartShield;
      const healthDamaged = typeof startHealth === "number" && station.health < startHealth - 0.001;
      const shieldDamaged = typeof startShield === "number" && station.shield < (startShield ?? 0) - 0.001;
      if (healthDamaged || shieldDamaged) {
        station.hyperdrive.hyperdriveState = "interrupted";
        station.hyperdrive.hyperdriveLastInterruptReason = "Hyperdrive interrupted by damage to the station.";

        const fuelCost = station.hyperdrive.hyperdriveFuelCost ?? 0;
        const penalty = fuelCost * STATION_CONFIG.hyperdriveFailedStartupFuelPenalty;
        station.fuel.currentFuel = Math.max(0, station.fuel.currentFuel - penalty);

        station.hyperdrive.hyperdriveCooldownUntil = now + STATION_CONFIG.hyperdriveCooldownMs;
        station.hyperdrive.hyperdriveChargeStartedAt = undefined;
        station.hyperdrive.hyperdriveDestination = undefined;
        station.hyperdrive.hyperdriveFuelCost = undefined;
        station.hyperdrive.isPhasedDuringWarp = false;
        return;
      }

      const startedAt = station.hyperdrive.hyperdriveChargeStartedAt ?? now;
      const elapsed = now - startedAt;
      if (elapsed >= station.hyperdrive.hyperdriveChargeDurationMs) {
        station.hyperdrive.hyperdriveState = "warping";
        station.hyperdrive.isPhasedDuringWarp = true;
      }
    }

    if (station.hyperdrive.hyperdriveState === "cooldown" || station.hyperdrive.hyperdriveState === "interrupted") {
      const until = station.hyperdrive.hyperdriveCooldownUntil;
      if (until && now >= until) {
        station.hyperdrive.hyperdriveState = "idle";
        station.hyperdrive.hyperdriveCooldownUntil = undefined;
      }
    }
  }

  private createBrokenStation(pos: Vec2, index: number): Station {
    const now = performance.now();
    const name = STATION_NAMES[index % STATION_NAMES.length];
    return {
      id: createId("station"),
      name,
      pos,
      vel: { x: 0, y: 0 },
      driveInput: { x: 0, y: 0 },
      facingAngle: 0,
      angularVelocity: 0,
      thrusterForward: 0,
      thrusterRotation: 0,
      turretAngle: -Math.PI / 2,
      turretFiringUntil: 0,
      turretClassId: "base_ship",
      reservedForPlayerId: null,
      starterRepairProgress: 0,
      starterRepairRequired: STATION_CONFIG.starterWreckRepairCost,
      radius: STATION_CONFIG.baseRadius,
      ownerTeamId: null,
      ownerPlayerId: null,
      claimState: "unclaimed",
      repairStageIndex: 0,
      repairStages: REPAIR_STAGES,
      level: 1,
      xp: 0,
      health: 360,
      maxHealth: 2200,
      isFullyRepaired: false,
      storage: createStationStorage(),
      fuel: createStationFuelState(),
      defenseSlots: createDefenseSlots(),
      defenses: [],
      landingPads: createLandingPads(),
      craftingTier: 0,
      upgradeState: createDefaultUpgradeState(),
      upgrades: createStationUpgrades(),
      defenseStats: { ...EMPTY_STATION_DEFENSE_STATS },
      selfDefenseEnabled: false,
      lastAttackedAt: 0,
      underAttack: false,
      autoDefenseTargets: [],
      defensePowerLevel: 0,
      shield: 0,
      powerCoreLevel: 1,
      powerCapacity: 900,
      powerUsed: 0,
      powerOverloaded: false,
      powerOverloadReason: "",
      subsystemStates: this.initSubsystems(),
      isMobile: false,
      mothershipUnlocked: false,
      mothershipCoreCrafted: false,
      transformationPaid: false,
      movementLockReason: "Station movement locked: complete all repairs.",
      localRelocationAvailable: false,
      localRelocationReason: "Landing pad control offline.",
      hyperdrive: createHyperdriveStatus(),
      lifecycleState: "unclaimed",
      lastActiveAt: now,
    };
  }

  private createLocalTeam(player: Player): Team {
    const now = performance.now();
    return {
      id: createId("team"),
      name: `${player.name}'s Crew`,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      leaderPlayerId: player.id,
      memberIds: [player.id],
      members: [{
        playerId: player.id,
        name: player.name,
        role: "leader",
        status: "online",
        joinedAt: now,
        currentShipId: player.currentShipId,
        currentHullTier: player.loadout.hullTier,
        contributionStats: { etherDeposited: 0, repairsCompleted: 0, modulesCrafted: 0 },
      }],
      pendingInvites: [],
      stationId: null,
      mothershipId: null,
      maxMembers: 6,
      createdAt: now,
    };
  }

  private randomStationBeltPosition() {
    const maxRadius = Math.hypot(MAP_CONFIG.halfWidth, MAP_CONFIG.halfHeight);
    const normalized = randomRange(STATION_CONFIG.stationBeltMinNormalizedDistance, STATION_CONFIG.stationBeltMaxNormalizedDistance);
    const angle = randomRange(0, Math.PI * 2);
    return clampToWorld({
      x: Math.cos(angle) * maxRadius * normalized,
      y: Math.sin(angle) * maxRadius * normalized,
    }, 3000);
  }

  placeStarterStationNearPlayer(player: Player) {
    const existing = this.stations[0];
    const angle = -Math.PI / 4;
    const pos = clampToWorld({
      x: player.pos.x + Math.cos(angle) * STATION_CONFIG.starterStationDistance,
      y: player.pos.y + Math.sin(angle) * STATION_CONFIG.starterStationDistance,
    }, STATION_CONFIG.baseRadius + 250);
    const station = existing ?? this.createBrokenStation(pos, 0);
    station.pos = pos;
    station.vel = { x: 0, y: 0 };
    station.name = "Derelict Survey Craft";
    station.reservedForPlayerId = player.id;
    if (!existing) this.stations.unshift(station);
  }

  private updateStationMovement(station: Station, dt: number, now: number) {
    if (station.hyperdrive.hyperdriveState === "warping" && station.hyperdrive.hyperdriveDestination) {
      const destination = station.hyperdrive.hyperdriveDestination;
      const dx = destination.x - station.pos.x;
      const dy = destination.y - station.pos.y;
      const d = Math.hypot(dx, dy);
      const direction = d > 0.0001 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
      const maxSpeed = getStationPilotMaxSpeed(station) * STATION_CONFIG.hyperdriveSpeedMultiplier;
      const step = Math.min(d, maxSpeed * dt);
      station.pos = {
        x: station.pos.x + direction.x * step,
        y: station.pos.y + direction.y * step,
      };
      station.vel = { x: 0, y: 0 };

      if (d <= 12) {
        station.pos = { ...destination };
        station.hyperdrive.isPhasedDuringWarp = false;
        station.hyperdrive.hyperdriveState = "cooldown";
        station.hyperdrive.hyperdriveCooldownUntil = now + STATION_CONFIG.hyperdriveArrivalCooldownMs;
        station.hyperdrive.hyperdriveChargeStartedAt = undefined;
        station.hyperdrive.hyperdriveDestination = undefined;
        station.hyperdrive.hyperdriveFuelCost = undefined;
      }
      return;
    }
    if (!station.vel) station.vel = { x: 0, y: 0 };
    const maxSpeed = isStationPhasedForHyperdrive(station)
      ? getStationPilotMaxSpeed(station) * STATION_CONFIG.hyperdriveSpeedMultiplier
      : getStationPilotMaxSpeed(station);
    const tuning = resolveMovementTuning("carrier", {
      acceleration: STATION_CONFIG.stationPilotAcceleration / 430,
      maximumSpeed: maxSpeed / 230,
      rotation: 1 + Math.max(0, station.upgradeState.boosterLevel - 1) * 0.06,
    });
    const command: MovementCommand = {
      thrustInput: -(station.driveInput?.y ?? 0),
      rotationInput: station.driveInput?.x ?? 0,
      source: "keyboard",
    };
    const body = {
      pos: station.pos,
      vel: station.vel,
      angle: (station.facingAngle ?? 0) - Math.PI / 2,
      angularVelocity: station.angularVelocity ?? 0,
      thrusterForward: station.thrusterForward ?? 0,
      thrusterRotation: station.thrusterRotation ?? 0,
    };
    updateThrusterMovement(body, command, tuning, dt, station.radius + 250);
    station.pos = body.pos;
    station.vel = body.vel;
    station.facingAngle = body.angle + Math.PI / 2;
    station.angularVelocity = body.angularVelocity;
    station.thrusterForward = body.thrusterForward;
    station.thrusterRotation = body.thrusterRotation;
  }

  private isRepairStageComplete(station: Station, stageId: RepairStageId) {
    const index = station.repairStages.findIndex((stage) => stage.id === stageId);
    return index >= 0 && station.repairStageIndex > index;
  }

  private getCraftingTierForRepairStage(repairStageIndex: number) {
    if (repairStageIndex >= 7) return 5;
    if (repairStageIndex >= 6) return 4;
    if (repairStageIndex >= 4) return 3;
    if (repairStageIndex >= 3) return 2;
    if (repairStageIndex >= 2) return 1;
    return 0;
  }

  private levelStationFromXp(station: Station) {
    station.level = Math.max(1, Math.min(100, 1 + Math.floor(station.xp / 950)));
  }

  private updateStationUnlocks(station: Station) {
    const landingPads = getLandingPadUnlockCount(station.level);
    station.landingPads.forEach((pad, index) => { pad.unlocked = index < landingPads; });
    const defenseSlots = getDefenseSlotUnlockCount(station.level);
    station.defenseSlots.forEach((slot, index) => { slot.unlocked = index < defenseSlots && station.repairStageIndex >= 4; });
    station.hyperdrive.hyperdriveUnlocked = station.isMobile && station.mothershipUnlocked;
    this.refreshUpgradeUnlocks(station);
  }

  private initSubsystems(): Record<StationSubsystemId, StationSubsystemState> {
    const max = 100;
    const mk = (state: StationSubsystemStateKind): StationSubsystemState => ({ health: max, maxHealth: max, state });
    return {
      power_core: mk("online"),
      storage: mk("online"),
      crafting_bay: mk("online"),
      turrets: mk("online"),
      shield_generator: mk("online"),
      repair_drone_bay: mk("online"),
      landing_pads: mk("online"),
      scanner_array: mk("online"),
      fuel_refinery: mk("online"),
      upgrade_console: mk("online"),
      hyperdrive_system: mk("online"),
      fleet_control_system: mk("online"),
    };
  }

  private updatePowerCore(station: Station, now: number) {
    const landingPadOnline = station.landingPads.filter((p) => p.unlocked).length;
    const defensePower = station.defensePowerLevel;
    const baseCapacity = 900 + station.repairStageIndex * 180 + landingPadOnline * 45 + defensePower * 120;
    const combatUse = station.underAttack ? baseCapacity * 0.18 : baseCapacity * 0.04;
    const hyperdriveUse = station.hyperdrive.hyperdriveState === "charging" || station.hyperdrive.hyperdriveState === "warping" ? baseCapacity * 0.32 : baseCapacity * 0.08;
    const repairUse = station.isFullyRepaired ? baseCapacity * 0.05 : baseCapacity * 0.09;
    const used = Math.min(baseCapacity * 1.5, combatUse + hyperdriveUse + repairUse + defensePower * 8);

    station.powerCapacity = baseCapacity;
    station.powerUsed = used;

    const normalized = station.repairStages.length > 0 ? station.repairStageIndex / station.repairStages.length : 0;
    station.powerCoreLevel = Math.max(1, Math.min(7, Math.floor(normalized * 6) + 1));
    station.powerOverloaded = used > baseCapacity;
    station.powerOverloadReason = station.powerOverloaded ? "Power overload: reduce low-priority systems." : "";

    const overloadFactor = station.powerOverloaded ? 0.78 : 1;
    const hitFactor = station.hyperdrive.hyperdriveState === "charging" ? 0.96 : 1;
    const underAttackFactor = station.underAttack ? 0.92 : 1;
    const combined = overloadFactor * hitFactor * underAttackFactor;

    const overloadDisabled = station.powerOverloaded ? new Set<StationSubsystemId>([
      "scanner_array",
      "repair_drone_bay",
      "fuel_refinery",
      "crafting_bay",
      "power_core",
    ]) : new Set<StationSubsystemId>();

    for (const id of Object.keys(station.subsystemStates) as StationSubsystemId[]) {
      const s = station.subsystemStates[id];
      const maxHealth = s.maxHealth;
      const targetHealth = overloadDisabled.has(id) ? maxHealth * 0.56 : maxHealth * combined;
      const damaged = s.health > targetHealth;
      s.health = damaged ? Math.max(0, targetHealth) : Math.min(maxHealth, s.health);
      if (overloadDisabled.has(id)) s.state = "disabled";
      else if (s.health < maxHealth * 0.6) s.state = "damaged";
      else s.state = "online";
    }
  }

  repairStationSubsystem(subsystemId: StationSubsystemId, station = this.claimedStation) {
    if (!station) return false;
    if (station.claimState !== "claimed") return false;
    const subsystem = station.subsystemStates[subsystemId];
    if (!subsystem) return false;
    if (subsystem.state === "online") return false;
    if (station.repairStageIndex < 2) return false;

    const missingRatio = 1 - Math.max(0, Math.min(1, subsystem.health / Math.max(1, subsystem.maxHealth)));
    if (missingRatio <= 0.001) return false;

    const rawCost = Math.ceil(45 + station.level * 3 + missingRatio * 120);
    const refinedCost = Math.ceil(rawCost * 0.6);
    const cost = station.repairStageIndex >= 3 ? { refinedEther: refinedCost } : { rawEther: rawCost };

    const fuelCost = this.fuelValue(cost);
    if (!spendStationFuel(station, fuelCost, "subsystem-repair:" + subsystemId)) return false;

    subsystem.health = subsystem.maxHealth;
    subsystem.state = "online";

    station.xp += rawCost * 0.25;
    this.levelStationFromXp(station);
    this.updatePowerCore(station, performance.now());
    return true;
  }

  private refreshUpgradeUnlocks(station: Station) {
    station.upgrades.forEach((upgrade) => {
      upgrade.unlocked = station.level >= upgrade.requiredStationLevel && this.isRepairStageComplete(station, upgrade.requiredRepairStage);
    });
  }

  private fuelValue(cost: EtherCost) {
    const station = this.claimedStation ?? this.stations[0];
    if (!station) return 0;
    return (Object.entries(cost) as Array<[EtherType, number | undefined]>).reduce((sum, [type, amount]) => sum + (amount ?? 0) * ETHER_CONFIG[type].fuelPerUnit, 0);
  }

  private costValue(cost: EtherCost) {
    return Object.values(cost).reduce((sum, amount) => sum + (amount ?? 0), 0);
  }

  private toStationLite(station: Station) {
    return {
      id: station.id,
      name: station.name,
      pos: { ...station.pos },
      radius: station.radius,
      claimState: station.claimState,
      ownerTeamId: station.ownerTeamId,
      ownerPlayerId: station.ownerPlayerId,
      level: station.level,
      health: station.health,
      maxHealth: station.maxHealth,
      isMobile: station.isMobile,
      mothershipUnlocked: station.mothershipUnlocked,
    };
  }
}

export function isPositionInsideStationBelt(position: Vec2, mapConfig: MapConfig) {
  const maxRadius = Math.hypot(mapConfig.halfWidth, mapConfig.halfHeight);
  const normalizedDistance = distance(position, { x: mapConfig.centerX, y: mapConfig.centerY }) / maxRadius;
  return normalizedDistance >= STATION_CONFIG.stationBeltMinNormalizedDistance && normalizedDistance <= STATION_CONFIG.stationBeltMaxNormalizedDistance;
}

export function canSpawnBrokenStationAt(position: Vec2, existingStations: Station[], mapConfig: MapConfig) {
  if (!isPositionInsideStationBelt(position, mapConfig)) return false;
  if (distance(position, { x: mapConfig.centerX, y: mapConfig.centerY }) <= mapConfig.centerZoneRadius + 25000) return false;
  const corners = [
    { x: -mapConfig.halfWidth, y: -mapConfig.halfHeight },
    { x: mapConfig.halfWidth, y: -mapConfig.halfHeight },
    { x: -mapConfig.halfWidth, y: mapConfig.halfHeight },
    { x: mapConfig.halfWidth, y: mapConfig.halfHeight },
  ];
  if (corners.some((corner) => distance(position, corner) < STATION_CONFIG.minDistanceFromSpawnCorners)) return false;
  return existingStations.every((station) => distance(position, station.pos) >= STATION_CONFIG.minDistanceBetweenStations);
}

export function getNearestUnclaimedStation(player: Player, stations: Station[]) {
  let nearest: Station | null = null;
  let nearestDistance = Infinity;
  for (const station of stations) {
    if (station.claimState !== "unclaimed" || station.lifecycleState === "destroyed") continue;
    const d = distance(player.pos, station.pos);
    if (d >= nearestDistance) continue;
    nearest = station;
    nearestDistance = d;
  }
  return nearest ? { station: nearest, distance: nearestDistance } : null;
}

export function getStationDirectionIndicator(player: Player, station: Station | null | undefined) {
  if (!station) return null;
  const dx = station.pos.x - player.pos.x;
  const dy = station.pos.y - player.pos.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  return {
    direction: { x: dx / d, y: dy / d },
    distance: d,
    bearingLabel: getBearingLabel(dx, dy),
  };
}

export function revealNearbyStationsForPlayer(player: Player, stations: Station[], radius = STATION_CONFIG.stationScannerPulseRadius) {
  return stations.filter((station) => station.lifecycleState !== "destroyed" && distance(player.pos, station.pos) <= radius);
}

export function getVisibleStationMarkers(player: Player, stations: Station[], scannerActive = false) {
  if (scannerActive) return stations.filter((station) => station.lifecycleState !== "destroyed");
  return stations.filter((station) => (
    station.lifecycleState !== "destroyed"
    && (station.claimState === "claimed" || distance(player.pos, station.pos) <= STATION_CONFIG.passiveStationMarkerRadius)
  ));
}

export function shouldShowStationFinder(player: Player, stations: Station[], claimedStation: Station | null | undefined) {
  if (claimedStation) return false;
  return Boolean(getNearestUnclaimedStation(player, stations));
}

function getBearingLabel(dx: number, dy: number) {
  const angle = Math.atan2(dy, dx);
  const normalized = (angle + Math.PI * 2 + Math.PI / 8) % (Math.PI * 2);
  const index = Math.floor(normalized / (Math.PI / 4));
  return ["E", "SE", "S", "SW", "W", "NW", "N", "NE"][index] ?? "E";
}

export function canStationMove(station: Station, ownerPlayer: Player) {
  return !getStationMovementLockReason(station, ownerPlayer);
}

export function getStationMovementLockReason(station: Station, ownerPlayer: Player) {
  if (canLocallyRelocateStation(station, ownerPlayer)) return "";
  const localReason = getLocalStationRelocationLockReason(station, ownerPlayer);
  if (localReason) return localReason;
  if (!station.isFullyRepaired) return "Station movement locked: complete all repairs.";
  if (station.level < 100) return "Station movement locked: station level 100 required.";
  if (ownerPlayer.level < 100) return "Station movement locked: ship level 100 required.";
  if (ownerPlayer.loadout.hullTier < 7) return "Station movement locked: Tier 7 hull required.";
  if (!station.mothershipCoreCrafted) return "Station movement locked: Mothership Core not crafted.";
  if (!station.transformationPaid) return "Station movement locked: transformation cost unpaid.";
  return "";
}

export function isRepairStageCompleteForStation(station: Station, stageId: RepairStageId) {
  const index = station.repairStages.findIndex((stage) => stage.id === stageId);
  return index >= 0 && station.repairStageIndex > index;
}

export function getLocalStationRelocationLockReason(station: Station, ownerPlayer: Player) {
  if (station.claimState !== "claimed") return "Claim a broken station first.";
  if (station.ownerPlayerId !== ownerPlayer.id) return "Only the team leader can pilot this base.";
  if (station.health <= 0 || station.lifecycleState === "destroyed") return "Base disabled.";
  if (station.hyperdrive.hyperdriveState === "charging") return "Hyperdrive charging. Station control locked.";
  if (station.hyperdrive.hyperdriveState === "warping") return "Hyperdrive warping. Station control locked.";
  if (distance(ownerPlayer.pos, station.pos) > STATION_CONFIG.dockRadius) return "Dock at the landing pad to control and move the base.";
  if (ownerPlayer.dockedStationId !== station.id || ownerPlayer.dockingState !== "docked" || !station.landingPads.some((pad) => pad.occupiedByPlayerId === ownerPlayer.id)) return "Dock inside the station before piloting the base.";
  return "";
}

export function canLocallyRelocateStation(station: Station, ownerPlayer: Player) {
  return !getLocalStationRelocationLockReason(station, ownerPlayer);
}

export function canPilotStation(station: Station, ownerPlayer: Player) {
  return canLocallyRelocateStation(station, ownerPlayer);
}

export function getStationPilotMaxSpeed(station: Station) {
  const boosterLevel = Math.max(1, station.upgradeState.boosterLevel);
  return STATION_CONFIG.stationBasePilotSpeed + boosterLevel * STATION_CONFIG.stationPilotSpeedPerBoosterLevel;
}

export function clampStationVelocity(station: Station, maxSpeed: number) {
  const speed = Math.hypot(station.vel.x, station.vel.y);
  if (speed <= maxSpeed || speed <= 0.001) return;
  const scale = maxSpeed / speed;
  station.vel.x *= scale;
  station.vel.y *= scale;
}

export function getStationPhysicalRadius(station: Station) {
  return station.radius === STATION_CONFIG.baseRadius
    ? STATION_CONFIG.spacecraftCollisionRadius
    : station.radius;
}

export function isStationPhasedForHyperdrive(station: Station) {
  return station.hyperdrive.isPhasedDuringWarp || station.hyperdrive.hyperdriveState === "warping";
}

function lerpAngle(current: number, target: number, amount: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * Math.max(0, Math.min(1, amount));
}

export function isHyperdriveFuelEther(etherType: EtherType) {
  return Boolean(etherType);
}

export function createEmptyLoadout(): PlayerLoadout {
  return {
    hullTier: 1,
    craftedModuleIds: [],
    installedModules: [],
  };
}

export function createEmptyStationSnapshot() {
  return {
    claimed: null,
    nearby: null,
    interactionPrompt: "",
    team: null,
  };
}

export function getActiveStationDefenseUpgrades(station: Station) {
  return station.upgrades.filter((upgrade) => upgrade.installed && upgrade.level > 0);
}

export function getStationDefenseLockReason(station: Station) {
  if (station.claimState !== "claimed") return "Station self-defense locked: station unclaimed.";
  if (station.repairStageIndex <= station.repairStages.findIndex((stage) => stage.id === "coreSystems")) return "Station self-defense locked: core systems offline.";
  if (station.repairStageIndex <= station.repairStages.findIndex((stage) => stage.id === "defenses")) return "Station self-defense locked: defense systems offline.";
  const turretState = station.subsystemStates?.turrets?.state;
  if (turretState === "offline" || turretState === "disabled") return "Station self-defense locked: turrets offline.";
  if (!getActiveStationDefenseUpgrades(station).length) return "Station self-defense locked: no defensive upgrades installed.";
  if (station.health <= 0) return "Station self-defense locked: station disabled.";
  return "";
}

export function canStationSelfDefend(station: Station) {
  return !getStationDefenseLockReason(station);
}

export function calculateStationDefenseStats(station: Station): StationDefenseStats {
  const stats: StationDefenseStats = { ...EMPTY_STATION_DEFENSE_STATS };
  for (const upgrade of getActiveStationDefenseUpgrades(station)) {
    const applied = getStationUpgradeBonuses(upgrade.category, upgrade.level);
    stats.turretDamage += applied.turretDamage ?? 0;
    stats.turretFireRate += applied.turretFireRate ?? 0;
    stats.missileDamage += applied.missileDamage ?? 0;
    stats.missileCooldown += applied.missileCooldown ?? 0;
    stats.shieldCapacity += applied.shieldCapacity ?? 0;
    stats.shieldRegen += applied.shieldRegen ?? 0;
    stats.armorDamageReduction = Math.max(stats.armorDamageReduction, applied.armorDamageReduction ?? 0);
    stats.repairRate += applied.repairRate ?? 0;
    stats.repairDroneCount += applied.repairDroneCount ?? 0;
    stats.defenseRange = Math.max(stats.defenseRange, applied.defenseRange ?? 0);
    stats.emergencyPulseDamage += applied.emergencyPulseDamage ?? 0;
    stats.globalDefenseMultiplier = Math.max(stats.globalDefenseMultiplier, applied.globalDefenseMultiplier ?? 1);
  }
  if (stats.defenseRange <= 0 && stats.turretDamage > 0) stats.defenseRange = 1700;
  return stats;
}

export function updateStationAutoDefense(station: Station, enemies: Enemy[], dt: number, now: number) {
  station.autoDefenseTargets = [];
  const stats = station.defenseStats;
  const range = Math.max(1200, stats.defenseRange);
  const targets = enemies
    .filter((enemy) => enemy.health > 0 && distance(enemy.pos, station.pos) <= range + enemy.radius)
    .sort((a, b) => distance(a.pos, station.pos) - distance(b.pos, station.pos));
  station.autoDefenseTargets = targets.slice(0, 3).map((enemy) => enemy.id);
  if (!targets.length) return;
  const target = targets[0];
  const canShoot = Boolean(getStationDefenseLockReason(station) === "");
  if (canShoot) {
    const turretDps = stats.turretDamage * stats.turretFireRate * stats.globalDefenseMultiplier;
    const missileDps = stats.missileDamage > 0 ? (stats.missileDamage / Math.max(1, stats.missileCooldown || 3)) * stats.globalDefenseMultiplier : 0;
    const pulseDps = targets.length >= 3 ? stats.emergencyPulseDamage * 0.08 : 0;
    target.health -= (turretDps + missileDps + pulseDps) * dt;
  }
  station.underAttack = true;
  station.lifecycleState = "under_attack";
  station.lastAttackedAt = now;
  const incomingDamage = Math.max(0, targets.length * 2.2 * dt * (1 - station.defenseStats.armorDamageReduction));
  if (incomingDamage > 0) {
    const shieldHit = Math.min(station.shield, incomingDamage);
    station.shield -= shieldHit;
    station.health -= incomingDamage - shieldHit;

    const etherLoss = Math.floor(incomingDamage * 0.6);
    if (etherLoss > 0) {
      let remaining = etherLoss;
      for (const type of ETHER_QUALITY_ORDER) {
        if (remaining <= 0) break;
        const available = station.storage.ether[type];
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        station.storage.ether[type] -= take;
        remaining -= take;
      }
      syncCargoUsed(station.storage);
    }

    const damageBudget = incomingDamage * 0.22;
    if (damageBudget > 0) {
      const subsystemIds = Object.keys(station.subsystemStates) as StationSubsystemId[];
      const candidates = subsystemIds.filter((id) => id !== "power_core");
      const count = Math.min(2, candidates.length, Math.max(1, Math.floor(targets.length / 2)));
      for (let i = 0; i < count; i += 1) {
        const id = candidates[(i + targets.length) % candidates.length];
        const s = station.subsystemStates[id];
        if (!s) continue;
        s.health = Math.max(0, s.health - damageBudget);
        if (s.health <= 0) s.state = "disabled";
      }
    }
  }
}

export function getStationHealthWarning(station: Station | null | undefined) {
  if (!station || station.claimState !== "claimed") return "";
  const ratio = station.maxHealth > 0 ? station.health / station.maxHealth : 0;
  if (ratio <= 0) return "Base Station Destroyed.";
  if (ratio <= 0.25) return "Critical: base near destruction.";
  if (ratio <= 0.5) return "Base shields failing.";
  if (ratio <= 0.75 || station.underAttack) return "Base under attack.";
  return "";
}

export function shouldPrioritizeBaseDefenseObjective(station: Station | null | undefined) {
  return Boolean(getStationHealthWarning(station));
}

export function getBaseDestructionSummary(station: Station) {
  const resourcesLost = Object.values(station.storage.ether).reduce((sum, amount) => sum + amount, 0);
  return {
    resourcesLost,
    salvageDropped: Math.floor(resourcesLost * 0.15),
    previousStationLevel: station.level,
    previousMothershipState: station.isMobile || station.mothershipUnlocked,
  };
}

export function calculateStationDestructionSalvage(station: Station) {
  const salvage: Array<{ type: EtherType; amount: number }> = [];
  (Object.entries(station.storage.ether) as Array<[EtherType, number]>).forEach(([type, amount]) => {
    const salvageAmount = Math.floor(amount * 0.15);
    if (salvageAmount > 0) salvage.push({ type, amount: salvageAmount });
  });
  return salvage;
}

export function dropStationDestructionSalvage(station: Station, etherDrops?: EtherDropSystem, now = performance.now()) {
  if (!etherDrops) return 0;
  let dropped = 0;
  calculateStationDestructionSalvage(station).forEach((stack) => {
    etherDrops.spawnCargoDrop(station.pos, stack.type, stack.amount, station.id, now);
    dropped += stack.amount;
  });
  return dropped;
}

export function clearStationProgress(station: Station) {
  station.storage.ether = emptyEtherCargo();
  station.storage.used = 0;
  station.fuel = createStationFuelState();
  station.repairStageIndex = 0;
  station.level = 1;
  station.xp = 0;
  station.isFullyRepaired = false;
  station.craftingTier = 0;
  station.upgradeState = createDefaultUpgradeState();
  station.upgrades = createStationUpgrades();
  station.defenseStats = { ...EMPTY_STATION_DEFENSE_STATS };
  station.selfDefenseEnabled = false;
  station.underAttack = false;
  station.autoDefenseTargets = [];
  station.defensePowerLevel = 0;
  station.shield = 0;
  station.powerCoreLevel = 1;
  station.powerCapacity = 900;
  station.powerUsed = 0;
  station.powerOverloaded = false;
  station.powerOverloadReason = "";
  const max = 100;
  const mk = (state: StationSubsystemStateKind) => ({ health: max, maxHealth: max, state } satisfies StationSubsystemState);
  station.subsystemStates = {
    power_core: mk("online"),
    storage: mk("online"),
    crafting_bay: mk("online"),
    turrets: mk("online"),
    shield_generator: mk("online"),
    repair_drone_bay: mk("online"),
    landing_pads: mk("online"),
    scanner_array: mk("online"),
    fuel_refinery: mk("online"),
    upgrade_console: mk("online"),
    hyperdrive_system: mk("online"),
    fleet_control_system: mk("online"),
  };
  station.defenses = [];
  station.defenseSlots = createDefenseSlots();
  station.landingPads = createLandingPads();
  station.vel = { x: 0, y: 0 };
  station.isMobile = false;
  station.mothershipUnlocked = false;
  station.mothershipCoreCrafted = false;
  station.transformationPaid = false;
  station.localRelocationAvailable = false;
  station.localRelocationReason = "Landing pad control offline.";
  station.movementLockReason = "Station movement locked: complete all repairs.";
  station.hyperdrive = createHyperdriveStatus();
}
