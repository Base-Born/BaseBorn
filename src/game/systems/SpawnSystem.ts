import type { Asteroid } from "../entities/Asteroid";
import type { Enemy } from "../entities/Enemy";
import type { MapConfig } from "../data/mapConfig";
import { getLootRegionByDistance } from "./LootDistributionSystem";
import type { Vec2 } from "../types";

type SpawnCorner = "nw" | "ne" | "sw" | "se";

export type SpawnGameState = {
  asteroids?: Asteroid[];
  enemies?: Enemy[];
};

const corners: SpawnCorner[] = ["nw", "ne", "sw", "se"];
const CORNER_SPAWN_MIN = 0.9;
const CORNER_SPAWN_MAX = 0.98;
const CORNER_SPAWN_VALID_MIN = 0.88;

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function getRandomCornerSpawnPoint(mapConfig: MapConfig): Vec2 {
  const corner = corners[Math.floor(Math.random() * corners.length)];
  const xSign = corner === "nw" || corner === "sw" ? -1 : 1;
  const ySign = corner === "nw" || corner === "ne" ? -1 : 1;
  return {
    x: randomRange(mapConfig.halfWidth * CORNER_SPAWN_MIN, mapConfig.halfWidth * CORNER_SPAWN_MAX) * xSign,
    y: randomRange(mapConfig.halfHeight * CORNER_SPAWN_MIN, mapConfig.halfHeight * CORNER_SPAWN_MAX) * ySign,
  };
}

export function isValidSpawnPoint(x: number, y: number, gameState: SpawnGameState, mapConfig: MapConfig) {
  if (getLootRegionByDistance(x, y, mapConfig) !== "outer") return false;
  if (Math.abs(x) < mapConfig.halfWidth * CORNER_SPAWN_VALID_MIN || Math.abs(y) < mapConfig.halfHeight * CORNER_SPAWN_VALID_MIN) return false;
  if (Math.hypot(x - mapConfig.centerX, y - mapConfig.centerY) < mapConfig.centerZoneRadius * 5) return false;

  for (const asteroid of gameState.asteroids ?? []) {
    if (Math.hypot(x - asteroid.pos.x, y - asteroid.pos.y) < asteroid.radius + 240) return false;
  }
  for (const enemy of gameState.enemies ?? []) {
    if (Math.hypot(x - enemy.pos.x, y - enemy.pos.y) < 1400) return false;
  }
  return true;
}

export function findSafeCornerSpawnPoint(gameState: SpawnGameState, mapConfig: MapConfig) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const point = getRandomCornerSpawnPoint(mapConfig);
    if (isValidSpawnPoint(point.x, point.y, gameState, mapConfig)) return point;
  }
  return getRandomCornerSpawnPoint(mapConfig);
}
