import { XP_BY_LEVEL, totalUpgradePointsForLevel } from "../config";
import type { Station } from "../data/stationTypes";
import type { Player } from "../entities/Player";
import { findSafeCornerSpawnPoint } from "./SpawnSystem";
import { MAP_CONFIG } from "../data/mapConfig";
import type { Vec2 } from "../types";

export const RESPAWN_DELAY_MS = 120_000;

export type PlayerDeathState = {
  isDestroyed: boolean;
  destroyedAt: number;
  respawnAvailableAt: number;
  respawnDelayMs: number;
  respawnLocation: "station" | "outer_safe_zone";
  oldLevel: number;
  newLevel: number;
  cargoDropped: number;
  stationRespawnAvailable: boolean;
  reasonIfRespawnBlocked: string;
};

export function calculateRespawnLevelAfterDeath(oldLevel: number) {
  return Math.max(1, Math.floor(oldLevel * 0.3));
}

export function canRespawnAtStation(player: Player, station: Station | null | undefined) {
  return !getStationRespawnLockReason(player, station);
}

export function getStationRespawnLockReason(_player: Player, station: Station | null | undefined) {
  if (!station) return "No claimed base station.";
  if (station.claimState !== "claimed") return "Station is not claimed.";
  if (station.health <= 0) return "Base station destroyed.";
  if (station.repairStageIndex < 1) return "Core systems offline.";
  return "";
}

export function getStationRespawnPoint(station: Station, player: Player): Vec2 {
  const angle = Math.atan2(player.pos.y - station.pos.y, player.pos.x - station.pos.x) || -Math.PI / 2;
  return {
    x: station.pos.x + Math.cos(angle) * (station.radius + 520),
    y: station.pos.y + Math.sin(angle) * (station.radius + 520),
  };
}

export function startRespawnCountdown(player: Player, station: Station | null, cargoDropped: number, now = performance.now()): PlayerDeathState {
  const stationLock = getStationRespawnLockReason(player, station);
  const stationRespawnAvailable = !stationLock;
  return {
    isDestroyed: true,
    destroyedAt: now,
    respawnAvailableAt: now + RESPAWN_DELAY_MS,
    respawnDelayMs: RESPAWN_DELAY_MS,
    respawnLocation: stationRespawnAvailable ? "station" : "outer_safe_zone",
    oldLevel: player.level,
    newLevel: calculateRespawnLevelAfterDeath(player.level),
    cargoDropped,
    stationRespawnAvailable,
    reasonIfRespawnBlocked: stationLock,
  };
}

export function completeRespawn(player: Player, station: Station | null, deathState: PlayerDeathState) {
  const stationRespawnAvailable = canRespawnAtStation(player, station);
  player.level = deathState.newLevel;
  player.xp = XP_BY_LEVEL[Math.min(deathState.newLevel, XP_BY_LEVEL.length - 1)] ?? 0;
  player.statPoints = totalUpgradePointsForLevel(deathState.newLevel);
  player.score = 0;
  player.recalculate();
  player.health = player.maxHealth;
  player.shieldHealth = player.maxShield;
  player.destroyedAt = 0;
  player.vel = { x: 0, y: 0 };
  player.cargo.ether.rawEther = 0;
  player.cargo.ether.refinedEther = 0;
  player.cargo.ether.chargedEther = 0;
  player.cargo.ether.radiantEther = 0;
  player.cargo.ether.primalEther = 0;
  player.cargo.ether.coreEther = 0;
  player.cargo.used = 0;
  player.pos = stationRespawnAvailable && station ? getStationRespawnPoint(station, player) : findSafeCornerSpawnPoint({}, MAP_CONFIG);
  player.resetSpawnProtection(3000);
}
