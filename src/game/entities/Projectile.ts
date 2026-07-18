import { MAP_CONFIG } from "../data/mapConfig";
import { fromAngle } from "../math";
import type { Owner, ProjectileKind, Vec2 } from "../types";

export class Projectile {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  lifetime: number;
  maxLifetime: number;
  penetration: number;
  owner: Owner;
  ownerId: string;
  kind: ProjectileKind;
  color: string;
  splitDone = false;
  target?: Vec2;

  constructor(args: {
    pos: Vec2;
    angle: number;
    speed: number;
    radius: number;
    damage: number;
    lifetime: number;
    penetration: number;
    owner: Owner;
    ownerId: string;
    kind: ProjectileKind;
    color: string;
    target?: Vec2;
  }) {
    this.pos = { ...args.pos };
    this.vel = fromAngle(args.angle, args.speed);
    this.radius = args.radius;
    this.damage = args.damage;
    this.lifetime = args.lifetime;
    this.maxLifetime = args.lifetime;
    this.penetration = args.penetration;
    this.owner = args.owner;
    this.ownerId = args.ownerId;
    this.kind = args.kind;
    this.color = args.color;
    this.target = args.target;
    if (this.kind === "mine") this.vel = fromAngle(args.angle + Math.PI, args.speed * 0.18);
  }

  update(dt: number, potentialTargets: Vec2[] = []) {
    if (this.kind === "missile" && potentialTargets.length) {
      const closest = potentialTargets.reduce((best, target) => {
        const d = Math.hypot(target.x - this.pos.x, target.y - this.pos.y);
        return d < best.d ? { target, d } : best;
      }, { target: potentialTargets[0], d: Infinity });
      const desired = Math.atan2(closest.target.y - this.pos.y, closest.target.x - this.pos.x);
      const speed = Math.hypot(this.vel.x, this.vel.y);
      const current = Math.atan2(this.vel.y, this.vel.x);
      const turn = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
      this.vel = fromAngle(current + Math.max(-2.6 * dt, Math.min(2.6 * dt, turn)), speed);
    }
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.lifetime -= dt;
  }

  get dead() {
    return this.lifetime <= 0 || this.penetration <= 0 || this.pos.x < -MAP_CONFIG.halfWidth - 200 || this.pos.y < -MAP_CONFIG.halfHeight - 200 || this.pos.x > MAP_CONFIG.halfWidth + 200 || this.pos.y > MAP_CONFIG.halfHeight + 200;
  }
}
