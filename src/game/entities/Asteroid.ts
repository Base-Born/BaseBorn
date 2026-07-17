import { ASTEROID_QUALITY_BY_ID, ASTEROID_SIZE_BY_ID, getAsteroidComputedValues, type AsteroidQuality, type AsteroidQualityConfig, type AsteroidSizeTier, type AsteroidTypeId } from "../data/asteroidTypes";
import type { EtherType } from "../data/etherTypes";
import type { Vec2 } from "../types";

export type LegacyAsteroidKind = "debris" | "small" | "crystal" | "ancient" | "wreck";
export type AsteroidKind = AsteroidQuality | LegacyAsteroidKind;

const legacyQualityMap: Record<LegacyAsteroidKind, AsteroidQuality> = {
  debris: "common",
  small: "common",
  wreck: "uncommon",
  crystal: "epic",
  ancient: "unique",
};

const legacySizeMap: Record<LegacyAsteroidKind, AsteroidSizeTier> = {
  debris: "pebble",
  small: "standard",
  wreck: "large",
  crystal: "massive",
  ancient: "giant",
};

type AsteroidOptions = {
  id?: string;
  radius?: number;
  seed?: number;
  chunkId?: string;
  sizeTier?: AsteroidSizeTier;
  quality?: AsteroidQuality;
};

function toQuality(kind: AsteroidKind): AsteroidQuality {
  if (kind in ASTEROID_QUALITY_BY_ID) return kind as AsteroidQuality;
  return legacyQualityMap[kind as LegacyAsteroidKind];
}

function randomFromSeed(seed: number) {
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

export class Asteroid {
  id: string;
  kind: AsteroidKind;
  typeId: AsteroidTypeId;
  type: AsteroidQualityConfig;
  sizeTier: AsteroidSizeTier;
  quality: AsteroidQuality;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  health: number;
  maxHealth: number;
  xp: number;
  xpReward: number;
  score: number;
  etherReward: number;
  etherType: EtherType;
  miningResistance: number;
  requiredMiningPower: number;
  respawnSeconds: number;
  color: string;
  spin: number;
  rotation: number;
  polygonPoints: number[];
  hitFlash = 0;
  chunkId?: string;

  constructor(kind: AsteroidKind = "common", pos: Vec2 = { x: 0, y: 0 }, options: AsteroidOptions = {}) {
    const quality = options.quality ?? toQuality(kind);
    const sizeTier = options.sizeTier ?? (kind in legacySizeMap ? legacySizeMap[kind as LegacyAsteroidKind] : "standard");
    const entry = ASTEROID_QUALITY_BY_ID[quality];
    const size = ASTEROID_SIZE_BY_ID[sizeTier];
    const computed = getAsteroidComputedValues(sizeTier, quality);
    const random = randomFromSeed(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    const radius = options.radius ?? randomRange(random, size.radiusRange[0], size.radiusRange[1]);
    const vertexCount = quality === "common" ? 9 : quality === "uncommon" ? 12 : quality === "rare" ? 8 : quality === "epic" ? 10 : 12;
    this.id = options.id ?? `asteroid-${Math.floor(random() * 1e9).toString(36)}`;
    this.kind = kind;
    this.typeId = quality;
    this.type = entry;
    this.sizeTier = sizeTier;
    this.quality = quality;
    this.radius = radius;
    this.maxHealth = computed.maxHealth;
    this.health = this.maxHealth;
    this.xp = computed.xpReward;
    this.xpReward = computed.xpReward;
    this.score = computed.scoreReward;
    this.etherReward = computed.etherReward;
    this.etherType = entry.etherType;
    this.miningResistance = computed.miningResistance;
    this.requiredMiningPower = computed.requiredMiningPower;
    this.respawnSeconds = computed.respawnSeconds;
    this.color = entry.color;
    this.pos = { ...pos };
    this.vel = { x: randomRange(random, -1.4, 1.4), y: randomRange(random, -1.4, 1.4) };
    this.spin = randomRange(random, -0.22, 0.22);
    this.rotation = randomRange(random, 0, Math.PI * 2);
    this.chunkId = options.chunkId;
    this.polygonPoints = Array.from({ length: vertexCount }, (_, i) => {
      if (entry.shape === "crag") return 0.74 + random() * 0.28 + (i % 3 === 0 ? 0.08 : 0);
      if (entry.shape === "cluster") return (i % 2 === 0 ? 0.98 : 0.76) + random() * 0.1;
      if (entry.shape === "crystal") return (i % 2 === 0 ? 1.08 : 0.62) + random() * 0.06;
      if (entry.shape === "shard") return (i % 2 === 0 ? 1.13 : 0.56) + random() * 0.08;
      if (entry.shape === "crown") return (i % 3 === 0 ? 1.12 : i % 3 === 1 ? 0.7 : 0.88) + random() * 0.05;
      return (i % 2 === 0 ? 1.02 : 0.88) + random() * 0.025;
    });
  }

  update(dt: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.rotation += this.spin * dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3.2);
  }

  takeDamage(amount: number) {
    this.health -= amount;
    this.hitFlash = 1;
  }

  get dead() {
    return this.health <= 0;
  }
}
