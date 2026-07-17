import { ASTEROID_QUALITY_WEIGHTS, ASTEROID_SIZE_BY_ID, getAsteroidRegionForPosition, pickAsteroidSize, type AsteroidQuality, type AsteroidRegion, type AsteroidSizeTier } from "../data/asteroidTypes";
import { getBestAsteroidBeltAtPosition, OPEN_SPACE_QUALITY_DISTRIBUTION, OPEN_SPACE_SPAWN_COUNT_RANGE, type AsteroidBelt } from "../data/asteroidBelts";
import { MAP_CONFIG } from "../data/mapConfig";
import { Asteroid } from "../entities/Asteroid";
import type { Vec2 } from "../types";

type AsteroidSpec = {
  id: string;
  chunkId: string;
  quality: AsteroidQuality;
  sizeTier: AsteroidSizeTier;
  pos: Vec2;
  radius: number;
  seed: number;
};

const CHUNK_SIZE = 1600;
const ACTIVE_RADIUS = 6200;
const SPAWN_PROTECTION_RADIUS = 280;

function hashToUint(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inCornerSpawnBuffer(pos: Vec2, radius: number) {
  const nearExtremeX = Math.abs(pos.x) >= MAP_CONFIG.halfWidth * 0.985 - radius;
  const nearExtremeY = Math.abs(pos.y) >= MAP_CONFIG.halfHeight * 0.985 - radius;
  return nearExtremeX && nearExtremeY;
}

type AsteroidSpawnProfile = {
  countRange: [number, number];
  qualityDistribution: Record<AsteroidQuality, number>;
  belt: AsteroidBelt | null;
};

function pickWeightedQuality(random: () => number, distribution: Record<AsteroidQuality, number>) {
  const entries = Object.entries(distribution) as Array<[AsteroidQuality, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return "common";
  let roll = random() * total;
  for (const [quality, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return quality;
  }
  return "common";
}

export function getOpenSpaceAsteroidSpawnProfile(): AsteroidSpawnProfile {
  return { countRange: OPEN_SPACE_SPAWN_COUNT_RANGE, qualityDistribution: OPEN_SPACE_QUALITY_DISTRIBUTION, belt: null };
}

export function getBeltAsteroidSpawnProfile(belt: AsteroidBelt): AsteroidSpawnProfile {
  return { countRange: belt.spawnCountRange, qualityDistribution: belt.qualityDistribution, belt };
}

export function getChunkAsteroidSpawnProfile(chunkCenter: Vec2): AsteroidSpawnProfile {
  const belt = getBestAsteroidBeltAtPosition(chunkCenter);
  const region = getAsteroidRegionForPosition(chunkCenter);
  const regionRanges: Record<AsteroidRegion, [number, number]> = {
    outer: [18, 26],
    mid: [22, 30],
    inner: [26, 36],
    center: [32, 44],
  };
  const density = Math.min(1.1, Math.max(1, belt?.densityMultiplier ?? 1));
  const baseRange = regionRanges[region];
  const countRange: [number, number] = [Math.round(baseRange[0] * density), Math.round(baseRange[1] * density)];
  const radialDistribution = ASTEROID_QUALITY_WEIGHTS[region];
  const qualityDistribution = belt
    ? Object.fromEntries((Object.keys(radialDistribution) as AsteroidQuality[]).map((quality) => [quality, radialDistribution[quality] * 0.72 + belt.qualityDistribution[quality] * 0.28])) as Record<AsteroidQuality, number>
    : radialDistribution;
  return { countRange, qualityDistribution, belt };
}

export function pickAsteroidQualityFromBeltProfile(random: () => number, profile: AsteroidSpawnProfile) {
  return pickWeightedQuality(random, profile.qualityDistribution);
}

export function pickAsteroidCountForBeltProfile(random: () => number, profile: AsteroidSpawnProfile) {
  return Math.floor(randomRange(random, profile.countRange[0], profile.countRange[1] + 1));
}

export class AsteroidSpawnSystem {
  private activeAsteroids = new Map<string, Asteroid>();
  private destroyedUntil = new Map<string, number>();
  private chunkCache = new Map<string, AsteroidSpec[]>();

  update(playerPos: Vec2, now: number) {
    const specs = this.getActiveSpecs(playerPos);
    const visibleIds = new Set(specs.map((spec) => spec.id));
    const asteroids: Asteroid[] = [];

    for (const spec of specs) {
      const availableAt = this.destroyedUntil.get(spec.id) ?? 0;
      if (availableAt > now) continue;
      this.destroyedUntil.delete(spec.id);
      const existing = this.activeAsteroids.get(spec.id);
      if (existing && !existing.dead) {
        asteroids.push(existing);
        continue;
      }
      const asteroid = new Asteroid(spec.quality, spec.pos, {
        id: spec.id,
        radius: spec.radius,
        seed: spec.seed,
        chunkId: spec.chunkId,
        quality: spec.quality,
        sizeTier: spec.sizeTier,
      });
      this.activeAsteroids.set(spec.id, asteroid);
      asteroids.push(asteroid);
    }

    for (const id of this.activeAsteroids.keys()) {
      if (!visibleIds.has(id)) this.activeAsteroids.delete(id);
    }

    return asteroids;
  }

  markDestroyed(asteroid: Asteroid, now: number) {
    this.destroyedUntil.set(asteroid.id, now + asteroid.respawnSeconds * 1000);
    this.activeAsteroids.delete(asteroid.id);
  }

  syncSharedDestroyed(entries: Array<{ id: string; until: number }>) {
    const epochNow = Date.now();
    const perfNow = performance.now();
    for (const entry of entries) {
      const remaining = Math.max(0, entry.until - epochNow);
      if (remaining <= 0) continue;
      this.destroyedUntil.set(entry.id, perfNow + remaining);
      this.activeAsteroids.delete(entry.id);
    }
  }

  private getActiveSpecs(playerPos: Vec2) {
    const chunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    const chunkY = Math.floor(playerPos.y / CHUNK_SIZE);
    const radiusInChunks = Math.ceil(ACTIVE_RADIUS / CHUNK_SIZE);
    const specs: AsteroidSpec[] = [];

    for (let y = chunkY - radiusInChunks; y <= chunkY + radiusInChunks; y += 1) {
      for (let x = chunkX - radiusInChunks; x <= chunkX + radiusInChunks; x += 1) {
        const center = { x: x * CHUNK_SIZE + CHUNK_SIZE / 2, y: y * CHUNK_SIZE + CHUNK_SIZE / 2 };
        if (Math.abs(center.x - playerPos.x) > ACTIVE_RADIUS + CHUNK_SIZE || Math.abs(center.y - playerPos.y) > ACTIVE_RADIUS + CHUNK_SIZE) continue;
        if (center.x < -MAP_CONFIG.halfWidth || center.x > MAP_CONFIG.halfWidth || center.y < -MAP_CONFIG.halfHeight || center.y > MAP_CONFIG.halfHeight) continue;
        specs.push(...this.getChunkSpecs(x, y));
      }
    }

    return specs;
  }

  private getChunkSpecs(chunkX: number, chunkY: number) {
    const chunkId = `${chunkX}:${chunkY}`;
    const cached = this.chunkCache.get(chunkId);
    if (cached) return cached;

    const seed = hashToUint(`baseborn:${chunkId}`);
    const random = mulberry32(seed);
    const chunkCenter = { x: chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, y: chunkY * CHUNK_SIZE + CHUNK_SIZE / 2 };
    const profile = getChunkAsteroidSpawnProfile(chunkCenter);
    const count = pickAsteroidCountForBeltProfile(random, profile);
    const specs: AsteroidSpec[] = [];

    for (let i = 0; i < count; i += 1) {
      const sizeTier = pickAsteroidSize(random);
      const size = ASTEROID_SIZE_BY_ID[sizeTier];
      const radius = randomRange(random, size.radiusRange[0], size.radiusRange[1]);
      let pos: Vec2 | undefined;

      for (let attempt = 0; attempt < 36; attempt += 1) {
        const candidate = {
          x: chunkX * CHUNK_SIZE + random() * CHUNK_SIZE,
          y: chunkY * CHUNK_SIZE + random() * CHUNK_SIZE,
        };
        if (candidate.x < -MAP_CONFIG.halfWidth + radius || candidate.x > MAP_CONFIG.halfWidth - radius) continue;
        if (candidate.y < -MAP_CONFIG.halfHeight + radius || candidate.y > MAP_CONFIG.halfHeight - radius) continue;
        if (inCornerSpawnBuffer(candidate, radius + SPAWN_PROTECTION_RADIUS)) continue;
        if (specs.some((spec) => distance(candidate, spec.pos) < radius + spec.radius + 14)) continue;
        pos = candidate;
        break;
      }

      if (!pos) continue;
      const quality = pickAsteroidQualityFromBeltProfile(random, profile);
      specs.push({ id: `asteroid-${chunkId}-${i}`, chunkId, quality, sizeTier, pos, radius, seed: hashToUint(`${chunkId}:${i}`) });
    }

    this.chunkCache.set(chunkId, specs);
    return specs;
  }
}
