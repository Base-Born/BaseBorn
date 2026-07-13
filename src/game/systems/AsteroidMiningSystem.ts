import type { Asteroid } from "../entities/Asteroid";
import type { Player } from "../entities/Player";

export function getAsteroidMiningEffectiveness(player: Player, asteroid: Asteroid) {
  const mining = player.ship.behavior.mining;
  const qualityGapBonus = Math.max(0, mining.highQualityMiningBonus);
  const miningPower = mining.miningPower + qualityGapBonus * 0.15;
  if (miningPower >= asteroid.requiredMiningPower) return 1;
  const ratio = miningPower / asteroid.requiredMiningPower;
  return Math.max(0.15, ratio);
}

export function getAsteroidMiningPowerRatio(player: Player, asteroid: Asteroid) {
  const mining = player.ship.behavior.mining;
  const qualityGapBonus = Math.max(0, mining.highQualityMiningBonus);
  const miningPower = mining.miningPower + qualityGapBonus * 0.15;
  if (asteroid.requiredMiningPower <= 0) return 1;
  return Math.min(1, miningPower / asteroid.requiredMiningPower);
}

export function getAsteroidResistanceEffectiveness(asteroid: Asteroid, hitDamage: number) {
  if (hitDamage >= asteroid.miningResistance) return 1;
  return Math.max(0.25, hitDamage / Math.max(1, asteroid.miningResistance));
}

export function getAsteroidDamage(player: Player, asteroid: Asteroid, baseDamage: number, toolMultiplier = 1) {
  const mining = player.ship.behavior.mining;
  const moduleMultiplier = player.moduleBonuses.miningDamageMultiplier;
  const hitDamage = baseDamage * mining.asteroidDamageMultiplier * toolMultiplier * moduleMultiplier;
  return baseDamage
    * mining.asteroidDamageMultiplier
    * toolMultiplier
    * moduleMultiplier
    * getAsteroidMiningEffectiveness(player, asteroid)
    * getAsteroidResistanceEffectiveness(asteroid, hitDamage);
}
