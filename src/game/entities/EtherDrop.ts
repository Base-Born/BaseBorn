import { createId } from "../id";
import type { EtherDropData, EtherType } from "../data/etherTypes";
import type { Vec2 } from "../types";

export class EtherDrop implements EtherDropData {
  id: string;
  type: EtherType;
  x: number;
  y: number;
  amount: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  createdAt: number;
  ownerId?: string;
  pickupDelayMs: number;
  expiresAt: number;

  constructor(args: {
    id?: string;
    type: EtherType;
    pos: Vec2;
    amount: number;
    velocity: Vec2;
    createdAt: number;
    ownerId?: string;
    pickupDelayMs?: number;
    expiresAt?: number;
  }) {
    this.id = args.id ?? createId("ether");
    this.type = args.type;
    this.x = args.pos.x;
    this.y = args.pos.y;
    this.amount = args.amount;
    this.radius = Math.max(5, Math.min(13, 4 + Math.sqrt(args.amount)));
    this.velocityX = args.velocity.x;
    this.velocityY = args.velocity.y;
    this.createdAt = args.createdAt;
    this.ownerId = args.ownerId;
    this.pickupDelayMs = args.pickupDelayMs ?? 260;
    this.expiresAt = args.expiresAt ?? args.createdAt + 120_000;
  }

  get pos(): Vec2 { return { x: this.x, y: this.y }; }
}
