import { clamp, distance } from "../math";
import { Asteroid } from "../entities/Asteroid";
import type { Drone } from "../entities/Drone";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { Projectile } from "../entities/Projectile";
import type { LevelSystem } from "./LevelSystem";
import { getEffectivePlayerStats, getTotalEffectiveStatLevel } from "./StatScalingSystem";
import { getAsteroidDamage, getAsteroidMiningPowerRatio } from "./AsteroidMiningSystem";
import { getMassMovementModifiers } from "./MassSystem";
import { getHullTier } from "../data/hullTiers";
import type { AsteroidQuality } from "../data/asteroidTypes";
import { TUNING } from "../config";

const MIN_RAM_IMPACT_SPEED = 85;
const ASTEROID_CONTACT_PUSH = 0.62;
const ASTEROID_QUALITY_IMPACT: Record<AsteroidQuality, number> = { common: 1, uncommon: 1.12, rare: 1.28, epic: 1.48, legendary: 1.75, unique: 2.1 };

export function getPlayerHullArmorProfile(player: Player) {
  const hullTier = getHullTier(player.loadout.hullTier).tier;
  const maxHealthLevel = getTotalEffectiveStatLevel(player.stats, "maxHealth");
  const defenseModules = player.loadout.installedModules.filter((module) => module.slotType === "defense").length;
  const hullReduction = hullTier <= 1 ? 0 : 0.24 + (hullTier - 2) * 0.085;
  const damageReduction = clamp(hullReduction + maxHealthLevel * 0.02 + defenseModules * 0.1, 0, 0.78);
  return { hasArmor: hullTier > 1 || maxHealthLevel > 0 || defenseModules > 0, damageReduction, hullTier, maxHealthLevel, defenseModules };
}

export class CollisionSystem {
  resolve(
    dt: number,
    player: Player,
    enemies: Enemy[],
    asteroids: Asteroid[],
    projectiles: Projectile[],
    level: LevelSystem,
    playerActive = true,
    onAsteroidDestroyed?: (asteroid: Asteroid) => void,
    onMiningInefficient?: (ratio: number) => void,
  ) {
    let lastMiningWarnAt = -Infinity;
    const rewardedEnemyIds = new Set<string>();
    const destroyedDrones = new Set<Drone>();
    const awardEnemyKill = (enemy: Enemy) => {
      if (rewardedEnemyIds.has(enemy.id)) return;
      rewardedEnemyIds.add(enemy.id);
      level.award(player, 220 + enemy.level * 12, 600 + enemy.score);
    };

    if (playerActive && player.miningLaserActive && player.miningLaserTarget) {
      const target = asteroids.find((asteroid) => asteroid.id === player.miningLaserTarget?.id && !asteroid.dead) ?? null;
      const targetDistance = target ? distance(player.pos, target.pos) - target.radius : Infinity;
      if (target && targetDistance <= TUNING.miningLaserRange) {
        if (onMiningInefficient) {
          const ratio = getAsteroidMiningPowerRatio(player, target);
          if (ratio < 0.25) onMiningInefficient(ratio);
        }
        target.takeDamage(getAsteroidDamage(player, target, TUNING.baseDamage * player.ship.behavior.damage * 3.5 * dt));
        if (target.dead) level.award(player, target.xp, target.score);
      }
    }

    for (const projectile of projectiles) {
      if (projectile.owner === "player") {
        for (const asteroid of asteroids) {
          if (projectile.penetration <= 0) break;
          if (distance(projectile.pos, asteroid.pos) < projectile.radius + asteroid.radius) {
            const wasAlive = !asteroid.dead;

            if (onMiningInefficient) {
              const ratio = getAsteroidMiningPowerRatio(player, asteroid);
              if (ratio < 0.25 && performance.now() - lastMiningWarnAt > 2500) {
                lastMiningWarnAt = performance.now();
                onMiningInefficient(ratio);
              }
            }

            asteroid.takeDamage(getAsteroidDamage(player, asteroid, projectile.damage));
            projectile.penetration -= 1;
            if (wasAlive && asteroid.dead) level.award(player, asteroid.xp, asteroid.score);
            break;
          }
        }
        for (const enemy of enemies) {
          if (projectile.penetration <= 0) break;
          if (distance(projectile.pos, enemy.pos) < projectile.radius + enemy.radius) {
            const wasAlive = enemy.health > 0;
            enemy.health -= projectile.damage;
            projectile.penetration -= 1;
            if (wasAlive && enemy.health <= 0) awardEnemyKill(enemy);
            break;
          }
        }
      } else {
        if (playerActive) {
          for (const drone of player.drones) {
            if (projectile.penetration <= 0) break;
            if (destroyedDrones.has(drone)) continue;
            if (distance(projectile.pos, drone.pos) < projectile.radius + drone.radius) {
              drone.takeDamage(projectile.damage);
              projectile.penetration -= 1;
              if (drone.dead) destroyedDrones.add(drone);
              break;
            }
          }
        }
        for (const asteroid of asteroids) {
          if (projectile.penetration <= 0) break;
          if (distance(projectile.pos, asteroid.pos) < projectile.radius + asteroid.radius) {
            asteroid.takeDamage(projectile.damage * 0.55);
            projectile.penetration -= 1;
            break;
          }
        }
        if (playerActive && projectile.penetration > 0 && distance(projectile.pos, player.pos) < projectile.radius + player.radius) {
          player.damage(projectile.damage);
          projectile.penetration -= 1;
        }
      }
    }

    if (playerActive) for (const drone of player.drones) {
      if (destroyedDrones.has(drone)) continue;
      for (const enemy of enemies) {
        if (distance(drone.pos, enemy.pos) < drone.radius + enemy.radius) {
          const wasAlive = enemy.health > 0;
          enemy.health -= drone.damage * 0.18 * (dt * 60);
          drone.takeDamage(1.4 * (dt * 60));
          if (drone.dead) destroyedDrones.add(drone);
          if (wasAlive && enemy.health <= 0) awardEnemyKill(enemy);
          player.score += 1 * (dt * 60);
        }
      }
      if (destroyedDrones.has(drone)) continue;
        for (const asteroid of asteroids) {
          if (distance(drone.pos, asteroid.pos) < drone.radius + asteroid.radius) {
            const wasAlive = !asteroid.dead;

            if (onMiningInefficient) {
              const ratio = getAsteroidMiningPowerRatio(player, asteroid);
              if (ratio < 0.25 && performance.now() - lastMiningWarnAt > 2500) {
                lastMiningWarnAt = performance.now();
                onMiningInefficient(ratio);
              }
            }

            asteroid.takeDamage(getAsteroidDamage(player, asteroid, drone.damage * 0.15 * (dt * 60), 1.15));
            drone.takeDamage(Math.max(0.24, asteroid.miningResistance * 0.18) * (dt * 60));
            if (drone.dead) destroyedDrones.add(drone);
            if (wasAlive && asteroid.dead) level.award(player, asteroid.xp, asteroid.score);
          }
        }
    }

    for (const asteroid of asteroids) {
      if (playerActive && distance(player.pos, asteroid.pos) < player.radius + asteroid.radius) {
        const effective = getEffectivePlayerStats(player.stats, player.baseFrameId);
        const impact = this.impactPlayerAsteroid(player, asteroid, effective.bodyDamage.resistance);
        if (impact.ramDamage > 0) {
          const wasAlive = !asteroid.dead;

          if (onMiningInefficient) {
            const ratio = getAsteroidMiningPowerRatio(player, asteroid);
            if (ratio < 0.25 && performance.now() - lastMiningWarnAt > 2500) {
              lastMiningWarnAt = performance.now();
              onMiningInefficient(ratio);
            }
          }

          asteroid.takeDamage(getAsteroidDamage(player, asteroid, impact.ramDamage * effective.bodyDamage.damageMultiplier * getMassMovementModifiers(player.buildIdentity.budgets.mass).collision, 1.25));
          if (wasAlive && asteroid.dead) level.award(player, asteroid.xp, asteroid.score);
        }
      }
      for (const enemy of enemies) {
        if (distance(enemy.pos, asteroid.pos) < enemy.radius + asteroid.radius) {
          asteroid.takeDamage(4 * (dt * 60));
          const a = Math.atan2(enemy.pos.y - asteroid.pos.y, enemy.pos.x - asteroid.pos.x);
          enemy.pos.x += Math.cos(a) * 2;
          enemy.pos.y += Math.sin(a) * 2;
        }
      }
    }

    if (playerActive) for (const enemy of enemies) {
      if (distance(player.pos, enemy.pos) < player.radius + enemy.radius) {
        const effective = getEffectivePlayerStats(player.stats, player.baseFrameId);
        const playerRam = 18 * (dt * 60) * effective.bodyDamage.damageMultiplier * getMassMovementModifiers(player.buildIdentity.budgets.mass).collision;
        const wasAlive = enemy.health > 0;
        enemy.health -= playerRam;
        if (wasAlive && enemy.health <= 0) awardEnemyKill(enemy);
        player.damage(18 * (dt * 60) * (1 - effective.bodyDamage.resistance));
        const a = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
        player.pos.x += Math.cos(a) * 18;
        player.pos.y += Math.sin(a) * 18;
        enemy.pos.x -= Math.cos(a) * 18;
        enemy.pos.y -= Math.sin(a) * 18;
      }
    }

    for (let i = asteroids.length - 1; i >= 0; i -= 1) {
      if (asteroids[i].dead) {
        onAsteroidDestroyed?.(asteroids[i]);
        asteroids.splice(i, 1);
      }
    }
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (enemies[i].health <= 0) enemies.splice(i, 1);
    }
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      if (projectiles[i].dead) projectiles.splice(i, 1);
    }
    for (const drone of destroyedDrones) player.destroyDrone(drone);
  }

  private impactPlayerAsteroid(player: Player, asteroid: Asteroid, platingResistance: number) {
    const dx = player.pos.x - asteroid.pos.x;
    const dy = player.pos.y - asteroid.pos.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = Math.max(0, player.radius + asteroid.radius - dist);

    const armor = getPlayerHullArmorProfile(player);
    const shipMass = Math.max(1, player.buildIdentity.budgets.mass / 32);
    const qualityMass = ASTEROID_QUALITY_IMPACT[asteroid.quality];
    const asteroidMass = Math.max(0.75, (asteroid.radius / Math.max(18, player.radius)) ** 2 * qualityMass);
    const totalMass = shipMass + asteroidMass;
    const playerPushShare = asteroidMass / totalMass;
    player.pos.x += nx * (overlap * ASTEROID_CONTACT_PUSH * playerPushShare + 1.25);
    player.pos.y += ny * (overlap * ASTEROID_CONTACT_PUSH * playerPushShare + 1.25);
    asteroid.pos.x -= nx * overlap * (1 - playerPushShare) * 0.38;
    asteroid.pos.y -= ny * overlap * (1 - playerPushShare) * 0.38;

    const relativeNormalSpeed = (player.vel.x - asteroid.vel.x) * nx + (player.vel.y - asteroid.vel.y) * ny;
    const impactSpeed = Math.max(0, -relativeNormalSpeed);
    if (relativeNormalSpeed < 0) {
      const restitution = 0.28 + armor.damageReduction * 0.18;
      const impulse = -(1 + restitution) * relativeNormalSpeed / (1 / shipMass + 1 / asteroidMass);
      player.vel.x += nx * impulse / shipMass;
      player.vel.y += ny * impulse / shipMass;
      asteroid.vel.x = clamp(asteroid.vel.x - nx * impulse / asteroidMass, -86, 86);
      asteroid.vel.y = clamp(asteroid.vel.y - ny * impulse / asteroidMass, -86, 86);
    } else {
      player.vel.x += nx * 12;
      player.vel.y += ny * 12;
    }

    const bodyDamageLevel = getTotalEffectiveStatLevel(player.stats, "bodyDamage");
    const totalReduction = clamp(armor.damageReduction + platingResistance * 0.35, 0, 0.82);
    const impactSeverity = Math.max(0, impactSpeed - 45) / 55;
    const massThreat = Math.sqrt(clamp(asteroidMass / shipMass, 0.45, 8));
    const incomingDamage = impactSeverity * (2.4 + massThreat * 2.2) * qualityMass * (1 - totalReduction);
    if (incomingDamage > 0.15) player.damage(incomingDamage);

    const reinforcedRam = player.ship.node.branch === "Tank" || player.ship.node.weaponType === "tank" || player.buildIdentity.activeSynergies.some((synergy) => synergy.id === "reinforced_ram");
    if ((!armor.hasArmor && !reinforcedRam) || impactSpeed < MIN_RAM_IMPACT_SPEED) return { ramDamage: 0, incomingDamage };
    const impactEnergy = (impactSpeed - 70) / 35;
    const armorForce = 1 + armor.damageReduction * 1.6;
    return { ramDamage: (3 + bodyDamageLevel * 1.8) * impactEnergy * armorForce, incomingDamage };
  }

}
