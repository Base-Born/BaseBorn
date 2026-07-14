import { SPACE_BACKGROUND_CONFIG, getSpaceBackgroundQuality, type StarLayerConfig } from "../data/spaceBackgroundConfig";
import type { Vec2 } from "../types";

type BackgroundCamera = { x: number; y: number; zoom: number };
type RenderOptions = {
  width: number;
  height: number;
  camera: BackgroundCamera;
  velocity: Vec2;
  thrust: number;
  now: number;
  warping?: boolean;
  ambient?: boolean;
};

type Star = { x: number; y: number; radius: number; alpha: number; color: string; phase: number; twinkleSpeed: number };

function hash32(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function sectorSeed(layer: number, x: number, y: number) {
  return hash32(SPACE_BACKGROUND_CONFIG.seed ^ Math.imul(layer + 1, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^ Math.imul(y, 0xc2b2ae35));
}

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export class SpaceBackgroundRenderer {
  private cache = new Map<string, Star[]>();
  private previousCamera: BackgroundCamera | null = null;
  private previousTime = 0;
  private motion = { x: 0, y: 0 };
  private reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  private quality = getSpaceBackgroundQuality();

  render(ctx: CanvasRenderingContext2D, options: RenderOptions) {
    const { width, height, camera, velocity, now } = options;
    this.updateMotion(camera, velocity, now, options.ambient === true);
    this.drawFoundation(ctx, width, height, camera);

    const speed = Math.hypot(this.motion.x, this.motion.y);
    const moving = speed > SPACE_BACKGROUND_CONFIG.trailStartSpeed;
    const warp = options.warping === true && !this.reducedMotion;
    const speedRatio = Math.min(1, speed / SPACE_BACKGROUND_CONFIG.movementReferenceSpeed);
    const thrustBoost = Math.max(0, options.thrust - 0.65) * 0.45;
    const trailStrength = this.reducedMotion ? 0 : warp ? 1 : Math.min(1, speedRatio + thrustBoost);

    for (let layerIndex = 0; layerIndex < SPACE_BACKGROUND_CONFIG.layers.length; layerIndex += 1) {
      const layer = SPACE_BACKGROUND_CONFIG.layers[layerIndex];
      if (layer.id === "dust" && (!moving || options.ambient)) continue;
      this.drawLayer(ctx, layer, layerIndex, options, trailStrength, warp);
    }
  }

  resetMotion() {
    this.previousCamera = null;
    this.previousTime = 0;
    this.motion.x = 0;
    this.motion.y = 0;
  }

  destroy() {
    this.cache.clear();
    this.resetMotion();
  }

  private updateMotion(camera: BackgroundCamera, velocity: Vec2, now: number, ambient: boolean) {
    if (!this.previousCamera || !this.previousTime) {
      this.previousCamera = { ...camera };
      this.previousTime = now;
      return;
    }
    const dt = Math.max(1 / 120, Math.min(0.05, (now - this.previousTime) / 1000));
    const cameraVelocityX = (camera.x - this.previousCamera.x) / dt;
    const cameraVelocityY = (camera.y - this.previousCamera.y) / dt;
    const cameraSpeed = Math.hypot(cameraVelocityX, cameraVelocityY);
    const cameraMotionIsPhysical = cameraSpeed > 0.1 && cameraSpeed < 8_000;
    const targetX = ambient ? 5 : cameraMotionIsPhysical ? cameraVelocityX : velocity.x;
    const targetY = ambient ? 2 : cameraMotionIsPhysical ? cameraVelocityY : velocity.y;
    const blend = 1 - Math.exp(-SPACE_BACKGROUND_CONFIG.motionSmoothing * dt);
    this.motion.x += (targetX - this.motion.x) * blend;
    this.motion.y += (targetY - this.motion.y) * blend;
    this.previousCamera = { ...camera };
    this.previousTime = now;
  }

  private drawFoundation(ctx: CanvasRenderingContext2D, width: number, height: number, camera: BackgroundCamera) {
    ctx.fillStyle = SPACE_BACKGROUND_CONFIG.background;
    ctx.fillRect(0, 0, width, height);

    const driftX = ((camera.x * 0.004) % width + width) % width;
    const driftY = ((camera.y * 0.003) % height + height) % height;
    const nebula = ctx.createRadialGradient(width * 0.64 - driftX * 0.06, height * 0.35 - driftY * 0.04, 0, width * 0.64, height * 0.35, Math.max(width, height) * 0.62);
    nebula.addColorStop(0, "rgba(35, 73, 104, 0.105)");
    nebula.addColorStop(0.46, "rgba(20, 43, 68, 0.035)");
    nebula.addColorStop(1, "rgba(1, 2, 5, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.78);
    edge.addColorStop(0, "rgba(0,0,0,0)");
    edge.addColorStop(1, "rgba(0,0,0,.48)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);
  }

  private drawLayer(ctx: CanvasRenderingContext2D, layer: StarLayerConfig, layerIndex: number, options: RenderOptions, trailStrength: number, warp: boolean) {
    const { width, height, camera, now } = options;
    const sectorSize = SPACE_BACKGROUND_CONFIG.sectorSize;
    const zoom = 0.92 + Math.max(0.75, Math.min(1.1, camera.zoom)) * 0.08;
    const centerX = camera.x * layer.parallax;
    const centerY = camera.y * layer.parallax;
    const minX = Math.floor((centerX - width / 2 - sectorSize) / sectorSize);
    const maxX = Math.floor((centerX + width / 2 + sectorSize) / sectorSize);
    const minY = Math.floor((centerY - height / 2 - sectorSize) / sectorSize);
    const maxY = Math.floor((centerY + height / 2 + sectorSize) / sectorSize);
    const motionLength = Math.hypot(this.motion.x, this.motion.y) || 1;
    const directionX = -this.motion.x / motionLength;
    const directionY = -this.motion.y / motionLength;
    const warpLength = warp ? SPACE_BACKGROUND_CONFIG.warpTrailPixels : 0;
    const normalLength = Math.min(18, trailStrength * 14);
    const trailLength = (warpLength || normalLength) * layer.trail;
    const densityScale = SPACE_BACKGROUND_CONFIG.qualityDensity[this.quality];

    ctx.save();
    ctx.lineCap = "round";
    for (let sy = minY; sy <= maxY; sy += 1) {
      for (let sx = minX; sx <= maxX; sx += 1) {
        const stars = this.getSector(layer, layerIndex, sx, sy, densityScale);
        for (const star of stars) {
          const screenX = (sx * sectorSize + star.x - centerX) * zoom + width / 2;
          const screenY = (sy * sectorSize + star.y - centerY) * zoom + height / 2;
          if (screenX < -90 || screenX > width + 90 || screenY < -90 || screenY > height + 90) continue;
          const twinkle = 1 + Math.sin(now * 0.001 * star.twinkleSpeed + star.phase) * layer.twinkle;
          const alpha = star.alpha * twinkle * (layer.id === "dust" ? trailStrength : 1);
          if (trailLength > 0.6) {
            ctx.globalAlpha = alpha * (warp ? 0.78 : 0.48);
            ctx.strokeStyle = star.color;
            ctx.lineWidth = Math.max(0.45, star.radius * (warp ? 0.75 : 0.5));
            ctx.beginPath();
            ctx.moveTo(screenX - directionX * trailLength, screenY - directionY * trailLength);
            ctx.lineTo(screenX, screenY);
            ctx.stroke();
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = star.color;
          ctx.beginPath();
          ctx.arc(screenX, screenY, star.radius * (warp ? 0.82 : 1), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private getSector(layer: StarLayerConfig, layerIndex: number, sx: number, sy: number, densityScale: number) {
    const key = `${this.quality}:${layer.id}:${sx}:${sy}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const rng = random(sectorSeed(layerIndex, sx, sy));
    const areaInMegapixels = (SPACE_BACKGROUND_CONFIG.sectorSize * SPACE_BACKGROUND_CONFIG.sectorSize) / 1_000_000;
    const count = Math.round(layer.densityPerMegapixel * areaInMegapixels * densityScale);
    const stars: Star[] = Array.from({ length: count }, () => ({
      x: rng() * SPACE_BACKGROUND_CONFIG.sectorSize,
      y: rng() * SPACE_BACKGROUND_CONFIG.sectorSize,
      radius: layer.radius[0] + rng() * (layer.radius[1] - layer.radius[0]),
      alpha: layer.alpha[0] + rng() * (layer.alpha[1] - layer.alpha[0]),
      color: layer.colors[Math.floor(rng() * layer.colors.length)] ?? "#ffffff",
      phase: rng() * Math.PI * 2,
      twinkleSpeed: 0.38 + rng() * 0.72,
    }));
    this.cache.set(key, stars);
    while (this.cache.size > SPACE_BACKGROUND_CONFIG.maxCachedSectors) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
    return stars;
  }
}
