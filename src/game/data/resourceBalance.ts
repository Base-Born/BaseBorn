import type { AsteroidQuality, AsteroidRegion, AsteroidSizeTier } from "./asteroidTypes";
import type { EtherType } from "./etherTypes";

export const ETHER_QUALITY_ORDER: EtherType[] = ["rawEther", "refinedEther", "chargedEther", "radiantEther", "primalEther", "coreEther"];

export const ETHER_VALUE_WEIGHTS: Record<EtherType, { value: number; fuel: number; stationXp: number }> = {
  rawEther: { value: 1, fuel: 1, stationXp: 1 },
  refinedEther: { value: 3, fuel: 2.5, stationXp: 2 },
  chargedEther: { value: 8, fuel: 6, stationXp: 4.5 },
  radiantEther: { value: 20, fuel: 15, stationXp: 10 },
  primalEther: { value: 55, fuel: 40, stationXp: 24 },
  coreEther: { value: 150, fuel: 100, stationXp: 60 },
};

export const HYPERDRIVE_FUEL_PER_ETHER: Record<EtherType, number> = {
  rawEther: 0.1,
  refinedEther: 0.25,
  chargedEther: 0.6,
  radiantEther: 1.5,
  primalEther: 4,
  coreEther: 10,
};

export const ASTEROID_QUALITY_BALANCE: Record<AsteroidQuality, {
  xpMultiplier: number;
  etherMultiplier: number;
  healthMultiplier: number;
  miningResistance: number;
  scoreMultiplier: number;
  stationXpMultiplier: number;
  requiredMiningPower: number;
  respawnSecondsRange: [number, number];
}> = {
  common: { xpMultiplier: 1, etherMultiplier: 1, healthMultiplier: 1, miningResistance: 1, scoreMultiplier: 1, stationXpMultiplier: 1, requiredMiningPower: 1, respawnSecondsRange: [240, 300] },
  uncommon: { xpMultiplier: 2.5, etherMultiplier: 2.25, healthMultiplier: 1.8, miningResistance: 1.4, scoreMultiplier: 2, stationXpMultiplier: 2, requiredMiningPower: 2, respawnSecondsRange: [300, 360] },
  rare: { xpMultiplier: 6, etherMultiplier: 5, healthMultiplier: 3.2, miningResistance: 2.1, scoreMultiplier: 5, stationXpMultiplier: 4.5, requiredMiningPower: 4, respawnSecondsRange: [360, 480] },
  epic: { xpMultiplier: 14, etherMultiplier: 11, healthMultiplier: 6, miningResistance: 3.5, scoreMultiplier: 12, stationXpMultiplier: 10, requiredMiningPower: 7, respawnSecondsRange: [480, 720] },
  legendary: { xpMultiplier: 35, etherMultiplier: 26, healthMultiplier: 11, miningResistance: 6, scoreMultiplier: 30, stationXpMultiplier: 24, requiredMiningPower: 11, respawnSecondsRange: [900, 1500] },
  unique: { xpMultiplier: 90, etherMultiplier: 65, healthMultiplier: 22, miningResistance: 10, scoreMultiplier: 80, stationXpMultiplier: 60, requiredMiningPower: 16, respawnSecondsRange: [1800, 2700] },
};

export const ASTEROID_SIZE_BALANCE: Record<AsteroidSizeTier, { rewardMultiplier: number; healthMultiplier: number }> = {
  pebble: { rewardMultiplier: 0.75, healthMultiplier: 0.45 },
  small: { rewardMultiplier: 1, healthMultiplier: 0.75 },
  standard: { rewardMultiplier: 1.6, healthMultiplier: 1.1 },
  large: { rewardMultiplier: 2.6, healthMultiplier: 2 },
  massive: { rewardMultiplier: 4, healthMultiplier: 3.7 },
  giant: { rewardMultiplier: 6, healthMultiplier: 6.5 },
  colossal: { rewardMultiplier: 9, healthMultiplier: 11 },
  titan: { rewardMultiplier: 13, healthMultiplier: 18 },
  moonlet: { rewardMultiplier: 19, healthMultiplier: 30 },
  worldstone: { rewardMultiplier: 28, healthMultiplier: 48 },
};

export const ZONE_ASTEROID_QUALITY_WEIGHTS: Record<AsteroidRegion, Record<AsteroidQuality, number>> = {
  outer: { common: 85, uncommon: 13, rare: 2, epic: 0, legendary: 0, unique: 0 },
  mid: { common: 35, uncommon: 35, rare: 22, epic: 7, legendary: 1, unique: 0 },
  inner: { common: 10, uncommon: 24, rare: 34, epic: 24, legendary: 7, unique: 1 },
  center: { common: 0, uncommon: 5, rare: 20, epic: 40, legendary: 28, unique: 7 },
};

export const CARGO_DROP_AMOUNT = 25;
