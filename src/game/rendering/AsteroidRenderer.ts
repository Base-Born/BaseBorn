import type { Asteroid } from "../entities/Asteroid";

export function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
  const type = asteroid.type;
  const healthRatio = Math.max(0, asteroid.health / asteroid.maxHealth);
  const damaged = healthRatio < 0.98;

  ctx.save();
  ctx.translate(asteroid.pos.x, asteroid.pos.y);
  ctx.rotate(asteroid.rotation);
  ctx.shadowColor = type.glowColor;
  ctx.shadowBlur = damaged ? type.glowStrength + asteroid.hitFlash * 5 : type.glowStrength;
  ctx.fillStyle = type.color;
  ctx.strokeStyle = type.strokeColor;
  ctx.lineWidth = asteroid.quality === "unique" || asteroid.quality === "legendary" ? 3.2 : 2;

  ctx.beginPath();
  asteroid.polygonPoints.forEach((point, index) => {
    const angle = (Math.PI * 2 * index) / asteroid.polygonPoints.length;
    const radius = asteroid.radius * point;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.96;
  ctx.fill();
  ctx.globalAlpha = 0.68 + asteroid.hitFlash * 0.18;
  ctx.stroke();

  if (asteroid.quality === "rare" || asteroid.quality === "epic" || asteroid.quality === "legendary" || asteroid.quality === "unique") {
    ctx.globalAlpha = asteroid.quality === "unique" || asteroid.quality === "legendary" ? 0.24 : 0.16;
    ctx.fillStyle = "#d9dde0";
    for (let i = 0; i < 3; i += 1) {
      const angle = i * 2.1 + asteroid.rotation * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * asteroid.radius * 0.16, Math.sin(angle) * asteroid.radius * 0.16);
      ctx.lineTo(Math.cos(angle + 0.45) * asteroid.radius * 0.84, Math.sin(angle + 0.45) * asteroid.radius * 0.84);
      ctx.lineTo(Math.cos(angle - 0.35) * asteroid.radius * 0.72, Math.sin(angle - 0.35) * asteroid.radius * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  if (damaged || asteroid.hitFlash > 0.05) {
    ctx.save();
    const width = Math.max(36, asteroid.radius * 1.35);
    const y = asteroid.pos.y - asteroid.radius - 16;
    ctx.fillStyle = "rgba(2, 6, 23, .78)";
    ctx.fillRect(asteroid.pos.x - width / 2, y, width, 5);
    ctx.fillStyle = healthRatio > 0.45 ? "#6faec6" : "#c7747a";
    ctx.fillRect(asteroid.pos.x - width / 2, y, width * healthRatio, 5);
    ctx.strokeStyle = "rgba(226, 232, 240, .24)";
    ctx.strokeRect(asteroid.pos.x - width / 2, y, width, 5);
    ctx.restore();
  }
}
