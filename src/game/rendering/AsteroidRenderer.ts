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

  drawRarityDetails(ctx, asteroid);
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

function drawRarityDetails(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
  const radius = asteroid.radius;
  const shape = asteroid.type.shape;
  ctx.lineCap = "round";
  if (shape === "crag") {
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#283139";
    for (let i = 0; i < 3; i += 1) {
      const angle = i * 2.17 + 0.4;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * radius * 0.38, Math.sin(angle) * radius * 0.34, radius * 0.13, radius * 0.09, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (shape === "cluster") {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = asteroid.type.strokeColor;
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    for (let i = 0; i < 3; i += 1) {
      const angle = i * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius * 0.28, Math.sin(angle) * radius * 0.28, radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  if (shape === "crystal" || shape === "shard") {
    const facets = shape === "crystal" ? 4 : 5;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#eaf4ff";
    for (let i = 0; i < facets; i += 1) {
      const angle = i * Math.PI * 2 / facets;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle - 0.2) * radius * 0.35, Math.sin(angle - 0.2) * radius * 0.35);
      ctx.lineTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9);
      ctx.lineTo(Math.cos(angle + 0.2) * radius * 0.35, Math.sin(angle + 0.2) * radius * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (shape === "crown") {
    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = "#fff0a8";
    ctx.lineWidth = Math.max(2, radius * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.42, Math.sin(angle) * radius * 0.42);
      ctx.lineTo(Math.cos(angle) * radius * 0.88, Math.sin(angle) * radius * 0.88);
      ctx.stroke();
    }
    return;
  }
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "#ffcc9b";
  ctx.strokeStyle = asteroid.type.strokeColor;
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  ctx.stroke();
}
