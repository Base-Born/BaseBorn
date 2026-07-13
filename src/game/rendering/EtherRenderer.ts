import { ETHER_TYPES } from "../data/etherTypes";
import type { EtherDrop } from "../entities/EtherDrop";

export function drawEtherDrop(ctx: CanvasRenderingContext2D, drop: EtherDrop, now = performance.now()) {
  const ether = ETHER_TYPES[drop.type];
  const pulse = 1 + Math.sin(now * 0.006 + drop.x * 0.01) * 0.08;

  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(now * 0.002 + drop.y * 0.002);
  ctx.shadowColor = ether.color;
  ctx.shadowBlur = 4;
  ctx.fillStyle = ether.color;
  ctx.strokeStyle = "rgba(230,235,238,.58)";
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.moveTo(0, -drop.radius * 1.1 * pulse);
  ctx.lineTo(drop.radius * 0.78, 0);
  ctx.lineTo(0, drop.radius * 1.15 * pulse);
  ctx.lineTo(-drop.radius * 0.62, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.restore();
}
