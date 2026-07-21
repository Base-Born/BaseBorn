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
  const bodyGradient = ctx.createRadialGradient(
    -asteroid.radius * 0.34,
    -asteroid.radius * 0.38,
    asteroid.radius * 0.04,
    0,
    0,
    asteroid.radius * 1.12,
  );
  bodyGradient.addColorStop(0, mixHex(type.color, "#f7fbff", 0.6));
  bodyGradient.addColorStop(0.28, mixHex(type.color, "#9aabb6", 0.58));
  bodyGradient.addColorStop(0.66, mixHex(type.color, "#35434d", 0.72));
  bodyGradient.addColorStop(1, mixHex(type.color, "#0b1117", 0.82));
  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = mixHex(type.strokeColor, "#d7edf4", 0.36);
  ctx.lineWidth = asteroid.quality === "unique" || asteroid.quality === "legendary" ? 3.6 : 2.4;

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

  drawHullFacets(ctx, asteroid);

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

function drawHullFacets(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
  const points = asteroid.polygonPoints.map((point, index) => {
    const angle = (Math.PI * 2 * index) / asteroid.polygonPoints.length;
    return { x: Math.cos(angle) * asteroid.radius * point, y: Math.sin(angle) * asteroid.radius * point };
  });
  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.clip();

  const sheen = ctx.createLinearGradient(-asteroid.radius, -asteroid.radius, asteroid.radius, asteroid.radius);
  sheen.addColorStop(0, "rgba(245, 252, 255, .3)");
  sheen.addColorStop(0.42, "rgba(164, 199, 211, .06)");
  sheen.addColorStop(0.58, "rgba(4, 10, 15, .05)");
  sheen.addColorStop(1, "rgba(2, 6, 10, .46)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = sheen;
  ctx.fillRect(-asteroid.radius, -asteroid.radius, asteroid.radius * 2, asteroid.radius * 2);

  ctx.strokeStyle = "rgba(207, 235, 244, .13)";
  ctx.lineWidth = Math.max(1, asteroid.radius * 0.025);
  for (let index = 0; index < points.length; index += 2) {
    ctx.beginPath();
    ctx.moveTo(points[index].x * 0.18, points[index].y * 0.18);
    ctx.lineTo(points[index].x * 0.82, points[index].y * 0.82);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRarityDetails(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
  const radius = asteroid.radius;
  const shape = asteroid.type.shape;
  ctx.lineCap = "round";
  if (shape === "crag") {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#172129";
    ctx.strokeStyle = "rgba(189, 222, 233, .2)";
    ctx.lineWidth = Math.max(1, radius * 0.025);
    for (let i = 0; i < 3; i += 1) {
      const angle = i * 2.17 + 0.4;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * radius * 0.38, Math.sin(angle) * radius * 0.34, radius * 0.13, radius * 0.09, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }
  if (shape === "cluster") {
    ctx.globalAlpha = 0.56;
    ctx.strokeStyle = mixHex(asteroid.type.strokeColor, "#8fe9ff", 0.34);
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
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = mixHex(asteroid.type.color, "#dff8ff", 0.54);
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
    ctx.globalAlpha = 0.64;
    ctx.strokeStyle = mixHex(asteroid.type.strokeColor, "#e8fbff", 0.22);
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
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = mixHex(asteroid.type.color, "#e5f8ff", 0.35);
  ctx.strokeStyle = mixHex(asteroid.type.strokeColor, "#c7f5ff", 0.22);
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

function mixHex(a: string, b: string, amount: number): string {
  const left = parseHex(a), right = parseHex(b);
  const t = Math.max(0, Math.min(1, amount));
  const channel = (start: number, end: number) => Math.round(start + (end - start) * t).toString(16).padStart(2, "0");
  return `#${channel(left.r, right.r)}${channel(left.g, right.g)}${channel(left.b, right.b)}`;
}

function parseHex(value: string): { r: number; g: number; b: number } {
  const normalized = value.replace("#", "");
  const expanded = normalized.length === 3 ? normalized.split("").map((part) => part + part).join("") : normalized;
  const parsed = Number.parseInt(expanded, 16);
  if (!Number.isFinite(parsed)) return { r: 128, g: 144, b: 154 };
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}
