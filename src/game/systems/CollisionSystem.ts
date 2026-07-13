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

const MIN_BODY_DAMAGE_IMPACT_SPEED = 95;
const ASTEROID_BOUNCE_RESTITUTION = 0.82;
const ASTEROID_CONTACT_PUSH = 0.64;

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
        const collisionDamage = this.impactPlayerAsteroid(player, asteroid, effective.bodyDamage.resistance);
        if (collisionDamage > 0) {
          const wasAlive = !asteroid.dead;

          if (onMiningInefficient) {
            const ratio = getAsteroidMiningPowerRatio(player, asteroid);
            if (ratio < 0.25 && performance.now() - lastMiningWarnAt > 2500) {
              lastMiningWarnAt = performance.now();
              onMiningInefficient(ratio);
            }
          }

          asteroid.takeDamage(getAsteroidDamage(player, asteroid, collisionDamage * effective.bodyDamage.damageMultiplier * getMassMovementModifiers(player.buildIdentity.budgets.mass).collision, 1.25));
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

    player.pos.x += nx * (overlap * ASTEROID_CONTACT_PUSH + 1.5);
    player.pos.y += ny * (overlap * ASTEROID_CONTACT_PUSH + 1.5);

    const relativeNormalSpeed = (player.vel.x - asteroid.vel.x) * nx + (player.vel.y - asteroid.vel.y) * ny;
    const impactSpeed = Math.max(0, -relativeNormalSpeed);
    if (relativeNormalSpeed < 0) {
      const impulse = -(1 + ASTEROID_BOUNCE_RESTITUTION) * relativeNormalSpeed;
      player.vel.x += nx * impulse;
      player.vel.y += ny * impulse;
      asteroid.vel.x = clamp(asteroid.vel.x - nx * impulse * 0.035, -42, 42);
      asteroid.vel.y = clamp(asteroid.vel.y - ny * impulse * 0.035, -42, 42);
    } else {
      player.vel.x += nx * 18;
      player.vel.y += ny * 18;
    }

    const bodyDamageLevel = getTotalEffectiveStatLevel(player.stats, "bodyDamage");
    const shieldImpact = Math.max(0, impactSpeed - 80) * 0.025 * (1 - platingResistance);
    if (shieldImpact > 0.2) player.damage(shieldImpact);
    if (!this.canRamAsteroids(player) || bodyDamageLevel <= 0 || impactSpeed < MIN_BODY_DAMAGE_IMPACT_SPEED) return 0;

    const impactFactor = clamp((impactSpeed - MIN_BODY_DAMAGE_IMPACT_SPEED) / 340, 0.15, 1.65);
    return (2.6 + bodyDamageLevel * 2.4) * impactFactor;
  }

  private canRamAsteroids(player: Player) {
    return player.ship.node.branch === "Tank" || player.ship.node.weaponType === "tank" || player.buildIdentity.activeSynergies.some((synergy) => synergy.id === "reinforced_ram");
  }

}
