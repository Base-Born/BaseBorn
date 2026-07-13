import { MAP_CONFIG, insideCenterZone } from "../data/mapConfig";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { angleTo, distance, fromAngle, normalize, randomRange } from "../math";
import type { Projectile, } from "../entities/Projectile";

export const MAX_ALIEN_ATTACKER_SLOTS_PER_PLAYER = 3;

export function canAlienTargetPlayer(alien: Enemy, player: Player, currentAttackersByPlayer: Map<string, number>) {
  if (!insideCenterZone(player.pos)) return false;
  if (distance(alien.pos, player.pos) > alien.aggroRadius) return false;
  if (distance(alien.home, alien.pos) > alien.leashRadius) return false;
  const currentSlots = currentAttackersByPlayer.get(player.id) ?? 0;
  return currentSlots + alien.attackerSlotCost <= MAX_ALIEN_ATTACKER_SLOTS_PER_PLAYER;
}

export class AlienAggroSystem {
  update(
    dt: number,
    aliens: Enemy[],
    player: Player,
    projectiles: Projectile[],
    stationTarget?: { id: string; pos: { x: number; y: number } } | null,
  ) {
    const slots = this.attackSlots(aliens);
    const activeTargetId = stationTarget?.id ?? player.id;
    const activeTargetPos = stationTarget?.pos ?? player.pos;
    for (const alien of aliens) {
      alien.retargetCooldown = Math.max(0, alien.retargetCooldown - dt);
      alien.fireCooldown = Math.max(0, alien.fireCooldown - dt);

      const targetingPlayer = alien.currentTargetPlayerId === player.id;
      const targetingStation = Boolean(stationTarget) && alien.currentTargetPlayerId === stationTarget!.id;

      if (alien.currentTargetPlayerId && stationTarget && !targetingStation) this.disengage(alien);
      if (alien.currentTargetPlayerId && !stationTarget && !targetingPlayer) this.disengage(alien);

      if (alien.currentTargetPlayerId) {
        const targetPos = targetingStation ? stationTarget!.pos : player.pos;
        if (
          distance(alien.home, alien.pos) > alien.leashRadius ||
          distance(alien.pos, targetPos) > alien.leashRadius ||
          (!stationTarget && !insideCenterZone(player.pos))
        ) {
          this.disengage(alien);
        }
      }

      if (!alien.currentTargetPlayerId && alien.retargetCooldown <= 0) {
        if (stationTarget) {
          if (this.canAlienTargetStation(alien, stationTarget, slots)) {
            alien.currentTargetPlayerId = stationTarget.id;
            alien.reactionTimer = randomRange(0.3, 1.2);
            alien.state = "warning";
            slots.set(stationTarget.id, (slots.get(stationTarget.id) ?? 0) + alien.attackerSlotCost);
          }
        } else if (canAlienTargetPlayer(alien, player, slots)) {
          alien.currentTargetPlayerId = player.id;
          alien.reactionTimer = randomRange(0.3, 1.2);
          alien.state = "warning";
          slots.set(player.id, (slots.get(player.id) ?? 0) + alien.attackerSlotCost);
        }
      }

      if (alien.currentTargetPlayerId === activeTargetId) this.attack(dt, alien, activeTargetPos, projectiles);
      else this.patrol(dt, alien);
    }
  }

  private attackSlots(aliens: Enemy[]) {
    const slots = new Map<string, number>();
    for (const alien of aliens) {
      if (!alien.currentTargetPlayerId || alien.state === "returning") continue;
      slots.set(alien.currentTargetPlayerId, (slots.get(alien.currentTargetPlayerId) ?? 0) + alien.attackerSlotCost);
    }
    return slots;
  }

  private attack(dt: number, alien: Enemy, targetPos: { x: number; y: number }, projectiles: Projectile[]) {
    alien.reactionTimer -= dt;
    if (alien.reactionTimer > 0) {
      alien.state = "warning";
      this.orbitHome(dt, alien, 0.4);
      return;
    }
    alien.state = "attacking";
    const d = distance(alien.pos, targetPos);
    const desiredRange = alien.alienType === "core_guardian" || alien.alienType === "beam_guard" ? 760 : alien.alienType === "interceptor" ? 250 : 520;
    const toTarget = angleTo(alien.pos, targetPos);
    alien.angle = toTarget;
    const sign = d > desiredRange + 80 ? 1 : d < desiredRange - 80 ? -1 : 0;
    const orbit = fromAngle(toTarget + Math.PI / 2, alien.alienType === "interceptor" ? 0.58 : 0.32);
    const dir = normalize({ x: Math.cos(toTarget) * sign + orbit.x, y: Math.sin(toTarget) * sign + orbit.y });
    const speed = alien.alienType === "interceptor" ? 245 : alien.alienType === "core_guardian" ? 125 : 175;
    alien.pos.x += dir.x * speed * dt;
    alien.pos.y += dir.y * speed * dt;
    if (d < alien.aggroRadius * 1.05) alien.fire(projectiles, toTarget);
  }

  private canAlienTargetStation(
    alien: Enemy,
    stationTarget: { id: string; pos: { x: number; y: number } },
    currentAttackersByTarget: Map<string, number>,
  ) {
    if (distance(alien.pos, stationTarget.pos) > alien.aggroRadius) return false;
    if (distance(alien.home, alien.pos) > alien.leashRadius) return false;
    const currentSlots = currentAttackersByTarget.get(stationTarget.id) ?? 0;
    return currentSlots + alien.attackerSlotCost <= MAX_ALIEN_ATTACKER_SLOTS_PER_PLAYER;
  }

  private patrol(dt: number, alien: Enemy) {
    alien.state = distance(alien.pos, alien.home) > alien.patrolRadius * 1.35 ? "returning" : "patrol";
    this.orbitHome(dt, alien, alien.state === "returning" ? 1 : 0.55);
  }

  private orbitHome(dt: number, alien: Enemy, pull: number) {
    const toHome = angleTo(alien.pos, alien.home);
    const orbit = angleTo({ x: MAP_CONFIG.centerX, y: MAP_CONFIG.centerY }, alien.home) + Math.PI / 2;
    const dir = normalize({
      x: Math.cos(toHome) * pull + Math.cos(orbit) * 0.45,
      y: Math.sin(toHome) * pull + Math.sin(orbit) * 0.45,
    });
    const speed = alien.alienType === "core_guardian" ? 85 : 120;
    alien.angle = Math.atan2(dir.y, dir.x);
    alien.pos.x += dir.x * speed * dt;
    alien.pos.y += dir.y * speed * dt;
  }

  private disengage(alien: Enemy) {
    alien.currentTargetPlayerId = null;
    alien.state = "returning";
    alien.retargetCooldown = randomRange(1.4, 2.6);
  }
}
