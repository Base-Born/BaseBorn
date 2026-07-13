import type { Asteroid } from "../entities/Asteroid";
import { EtherDrop } from "../entities/EtherDrop";
import type { Player } from "../entities/Player";
import { addEtherToCombinedCargo, getAvailableCargoSpace } from "./CargoSystem";
import { distance, normalize, randomRange } from "../math";
import type { EtherType } from "../data/etherTypes";
import type { Vec2 } from "../types";
import type { NetworkEtherDropState } from "../network/protocol";

export class EtherDropSystem {
  drops: EtherDrop[] = [];
  private pickupRequestedAt = new Map<string, number>();

  syncSharedDrops(states: NetworkEtherDropState[]) {
    const existing = new Map(this.drops.map((drop) => [drop.id, drop]));
    const epochNow = Date.now();
    const perfNow = performance.now();
    this.drops = states.map((state) => {
      const drop = existing.get(state.id);
      if (drop) {
        drop.type = state.type;
        drop.amount = state.amount;
        drop.radius = Math.max(5, Math.min(13, 4 + Math.sqrt(state.amount)));
        drop.expiresAt = perfNow + Math.max(0, state.expiresAt - epochNow);
        return drop;
      }
      const age = Math.max(0, epochNow - state.createdAt);
      return new EtherDrop({
        id: state.id,
        type: state.type,
        amount: state.amount,
        pos: { x: state.x, y: state.y },
        velocity: { x: state.velocityX, y: state.velocityY },
        createdAt: perfNow - age,
        ownerId: state.ownerId,
        pickupDelayMs: state.pickupDelayMs,
        expiresAt: perfNow + Math.max(0, state.expiresAt - epochNow),
      });
    });
    const liveIds = new Set(states.map((state) => state.id));
    for (const id of this.pickupRequestedAt.keys()) if (!liveIds.has(id)) this.pickupRequestedAt.delete(id);
  }

  spawnFromAsteroid(asteroid: Asteroid, now: number, yieldMultiplier = 1) {
    const total = Math.max(1, Math.round(asteroid.etherReward * yieldMultiplier));
    const shardCount = Math.min(18, Math.max(2, Math.ceil(Math.sqrt(total))));
    let remaining = total;
    for (let i = 0; i < shardCount; i += 1) {
      const amount = i === shardCount - 1 ? remaining : Math.max(1, Math.round(total / shardCount * randomRange(0.72, 1.28)));
      remaining = Math.max(0, remaining - amount);
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(35, 150);
      const scatter = randomRange(0, asteroid.radius * 0.34);
      this.drops.push(new EtherDrop({
        type: asteroid.etherType,
        amount,
        pos: { x: asteroid.pos.x + Math.cos(angle) * scatter, y: asteroid.pos.y + Math.sin(angle) * scatter },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        createdAt: now,
      }));
    }
  }

  update(dt: number, player: Player, now: number, onPickupRequest?: (dropId: string, amount: number) => void) {
    const mining = player.ship.behavior.mining;
    const pickupRadius = mining.pickupRadius;
    const tractorRadius = pickupRadius * 3.1;
    let cargoFull = false;
    let remainingCapacity = player.cargoPickupEnabled ? getAvailableCargoSpace(player.cargo) : 0;

    for (let i = this.drops.length - 1; i >= 0; i -= 1) {
      const drop = this.drops[i];
      if (drop.expiresAt <= now || drop.amount <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      const d = distance(drop.pos, player.pos);
      const canCollectCargo = player.cargoPickupEnabled && remainingCapacity > 0;
      if (canCollectCargo && d < tractorRadius && now - drop.createdAt >= drop.pickupDelayMs) {
        const pull = normalize({ x: player.pos.x - drop.x, y: player.pos.y - drop.y });
        const strength = (1 - Math.min(1, d / tractorRadius)) * 980 * mining.tractorBeamStrength;
        drop.velocityX += pull.x * strength * dt;
        drop.velocityY += pull.y * strength * dt;
      }

      drop.velocityX *= Math.pow(0.1, dt);
      drop.velocityY *= Math.pow(0.1, dt);
      drop.x += drop.velocityX * dt;
      drop.y += drop.velocityY * dt;

      if (d > pickupRadius + player.radius || now - drop.createdAt < drop.pickupDelayMs) continue;
      if (!player.cargoPickupEnabled) continue;
      if (remainingCapacity <= 0) { cargoFull = true; continue; }

      if (onPickupRequest) {
        const lastRequest = this.pickupRequestedAt.get(drop.id) ?? -Infinity;
        if (now - lastRequest > 500) {
          this.pickupRequestedAt.set(drop.id, now);
          onPickupRequest(drop.id, Math.min(drop.amount, remainingCapacity));
        }
        continue;
      }

      const accepted = addEtherToCombinedCargo(player.cargo, drop.type, drop.amount);
      drop.amount -= accepted;
      remainingCapacity = getAvailableCargoSpace(player.cargo);
      if (remainingCapacity <= 0 && drop.amount > 0) cargoFull = true;
      if (drop.amount <= 0) this.drops.splice(i, 1);
    }

    if (cargoFull) player.showCargoFull(now);
  }

  spawnCargoDrop(position: Vec2, etherType: EtherType, amount: number, sourcePlayerId: string, now = performance.now()) {
    const angle = randomRange(0, Math.PI * 2);
    this.drops.push(new EtherDrop({
      type: etherType,
      amount,
      pos: { x: position.x - Math.cos(angle) * 44, y: position.y - Math.sin(angle) * 44 },
      velocity: { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 },
      createdAt: now,
      ownerId: sourcePlayerId,
      pickupDelayMs: 2000,
    }));
  }
}
