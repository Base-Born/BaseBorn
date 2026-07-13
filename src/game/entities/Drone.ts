import { createId } from "../id";
import { clamp, length, normalize } from "../math";
import type { Owner, Vec2 } from "../types";

export type DroneMode = "auto_farm" | "move_to_cursor" | "repel_from_cursor" | "orbit" | "return";

export type DroneCommand = {
  mode: DroneMode;
  target?: Vec2;
  targetEntityId?: string | null;
  droneCount: number;
};

type DroneUpdateContext = {
  now: number;
};

const SOFT_RETURN_DISTANCE = 2500;
const HARD_FAILSAFE_DISTANCE = 6000;
const ORBIT_RADIUS_BASE = 58;
const ACTIVE_CLUSTER_MAX_RADIUS = 28;

export class Drone {
  id = createId("drone");
  owner: Owner;
  ownerId: string;
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  vx = 0;
  vy = 0;
  angleOffset: number;
  radius = 10;
  health = 36;
  maxHealth = 36;
  damage = 10;
  speed = 360;
  maxSpeed = 560;
  acceleration = 1200;
  steeringForce = 1700;
  orbitIndex = 0;
  orbitAngle = 0;
  mode: DroneMode = "orbit";
  targetX?: number;
  targetY?: number;
  targetEntityId: string | null = null;
  trail: Vec2[] = [];

  constructor(owner: Owner, ownerId: string, pos: Vec2, angleOffset: number, orbitIndex = 0) {
    this.owner = owner;
    this.ownerId = ownerId;
    this.pos = { ...pos };
    this.angleOffset = angleOffset;
    this.orbitIndex = orbitIndex;
    this.orbitAngle = angleOffset;
  }

  get x() {
    return this.pos.x;
  }

  get y() {
    return this.pos.y;
  }

  update(dt: number, ownerPos: Vec2, command: DroneCommand, nearbyDrones: Drone[] = [], context: DroneUpdateContext = { now: performance.now() }) {
    const ownerDistance = Math.hypot(this.pos.x - ownerPos.x, this.pos.y - ownerPos.y);
    const hasActiveCommand = command.mode === "move_to_cursor" || command.mode === "repel_from_cursor";
    let mode = command.mode;
    if (ownerDistance > HARD_FAILSAFE_DISTANCE) mode = "return";
    else if (!hasActiveCommand && ownerDistance > SOFT_RETURN_DISTANCE) mode = "return";

    this.mode = mode;
    this.targetEntityId = command.targetEntityId ?? null;

    let desired = this.orbitPoint(ownerPos, command.droneCount, context.now);
    if ((mode === "move_to_cursor" || mode === "auto_farm") && command.target) {
      desired = this.cursorFormationPoint(command.target, command.droneCount);
    } else if (mode === "repel_from_cursor" && command.target) {
      desired = this.repelPoint(command.target, ownerPos);
    } else if (mode === "return") {
      desired = this.orbitPoint(ownerPos, command.droneCount, context.now);
    }

    this.targetX = desired.x;
    this.targetY = desired.y;
    this.steerToward(desired, dt, mode);
    this.applySeparation(nearbyDrones, dt, mode);
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.vx = this.vel.x;
    this.vy = this.vel.y;
    this.recordTrail();
  }

  private orbitPoint(ownerPos: Vec2, droneCount: number, now: number) {
    const count = Math.max(1, droneCount);
    const orbitRadius = ORBIT_RADIUS_BASE + Math.min(28, count * 4);
    this.orbitAngle = now / 760 + this.angleOffset;
    return {
      x: ownerPos.x + Math.cos(this.orbitAngle) * orbitRadius,
      y: ownerPos.y + Math.sin(this.orbitAngle) * orbitRadius,
    };
  }

  private cursorFormationPoint(target: Vec2, droneCount: number) {
    const count = Math.max(1, droneCount);
    const formationRadius = clamp(8 + count * 1.8, 10, ACTIVE_CLUSTER_MAX_RADIUS);
    const angle = this.angleOffset + this.orbitIndex * 0.19;
    return {
      x: target.x + Math.cos(angle) * formationRadius,
      y: target.y + Math.sin(angle) * formationRadius,
    };
  }

  private repelPoint(cursor: Vec2, ownerPos: Vec2) {
    const away = normalize({ x: this.pos.x - cursor.x, y: this.pos.y - cursor.y });
    const fallback = normalize({ x: ownerPos.x - cursor.x, y: ownerPos.y - cursor.y });
    const direction = length(away) > 0 ? away : fallback;
    return {
      x: this.pos.x + direction.x * 850,
      y: this.pos.y + direction.y * 850,
    };
  }

  private steerToward(target: Vec2, dt: number, mode: DroneMode) {
    const toTarget = { x: target.x - this.pos.x, y: target.y - this.pos.y };
    const dist = length(toTarget);
    const targetSpeed = mode === "orbit" || mode === "return" ? this.speed : this.maxSpeed;
    const slowRadius = mode === "move_to_cursor" || mode === "auto_farm" ? 70 : 36;
    const speed = dist < slowRadius ? targetSpeed * clamp(dist / slowRadius, 0.22, 1) : targetSpeed;
    const desiredVelocity = dist > 0 ? { x: (toTarget.x / dist) * speed, y: (toTarget.y / dist) * speed } : { x: 0, y: 0 };
    const steer = { x: desiredVelocity.x - this.vel.x, y: desiredVelocity.y - this.vel.y };
    const steerLength = length(steer);
    const maxSteer = this.steeringForce * dt;
    if (steerLength > maxSteer && steerLength > 0) {
      steer.x = (steer.x / steerLength) * maxSteer;
      steer.y = (steer.y / steerLength) * maxSteer;
    }
    this.vel.x += steer.x;
    this.vel.y += steer.y;
    const currentSpeed = length(this.vel);
    const maxSpeed = mode === "orbit" ? this.speed : this.maxSpeed;
    if (currentSpeed > maxSpeed) {
      this.vel.x = (this.vel.x / currentSpeed) * maxSpeed;
      this.vel.y = (this.vel.y / currentSpeed) * maxSpeed;
    }
  }

  private applySeparation(nearbyDrones: Drone[], dt: number, mode: DroneMode) {
    const tightFormation = mode === "move_to_cursor" || mode === "repel_from_cursor";
    const desiredSpacing = this.radius * (tightFormation ? 1.25 : 2.1);
    let push = { x: 0, y: 0 };
    let count = 0;
    for (const other of nearbyDrones) {
      if (other === this) continue;
      const offset = { x: this.pos.x - other.pos.x, y: this.pos.y - other.pos.y };
      const dist = length(offset);
      if (dist <= 0 || dist >= desiredSpacing) continue;
      push.x += (offset.x / dist) * (desiredSpacing - dist);
      push.y += (offset.y / dist) * (desiredSpacing - dist);
      count += 1;
    }
    if (!count) return;
    const strength = tightFormation ? 5 : 11;
    this.vel.x += (push.x / count) * strength * dt;
    this.vel.y += (push.y / count) * strength * dt;
  }

  private recordTrail() {
    if (length(this.vel) < 280) {
      this.trail.length = 0;
      return;
    }
    this.trail.unshift({ ...this.pos });
    this.trail.length = Math.min(this.trail.length, 5);
  }

  takeDamage(amount: number) {
    this.health -= amount;
  }

  get dead() {
    return this.health <= 0;
  }
}
