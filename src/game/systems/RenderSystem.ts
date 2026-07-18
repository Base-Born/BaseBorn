import { MAP_CONFIG } from "../data/mapConfig";
import { getAlienVisualProfile, getShipVisualProfile } from "../rendering/ShipVisualProfiles";
import { getPlayerVisualProfile } from "./VisualProfileSystem";
import { ShipRenderer } from "../rendering/ShipRenderer";
import { drawAsteroid } from "../rendering/AsteroidRenderer";
import { drawEtherDrop } from "../rendering/EtherRenderer";
import { clamp } from "../math";
import { StationRenderer } from "./renderers/StationRenderer";
import { SpaceBackgroundRenderer } from "../rendering/SpaceBackgroundRenderer";
import { SPACE_BACKGROUND_CONFIG } from "../data/spaceBackgroundConfig";
import { getEffectivePlayerStats } from "./StatScalingSystem";
import { TUNING } from "../config";
import type { Asteroid } from "../entities/Asteroid";
import type { Drone } from "../entities/Drone";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { Projectile } from "../entities/Projectile";
import type { EtherDrop } from "../entities/EtherDrop";
import type { Station } from "../data/stationTypes";
import type { Planet, Vec2 } from "../types";
import type { NetworkProjectileState, RemotePlayerState } from "../network/protocol";

export type Camera = { x: number; y: number; zoom: number };

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private shipRenderer = new ShipRenderer();
  private stationRenderer = new StationRenderer();
  private spaceBackground = new SpaceBackgroundRenderer();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
  }

  render(player: Player, enemies: Enemy[], asteroids: Asteroid[], projectiles: Projectile[], camera: Camera, planets: Planet[] = [], etherDrops: EtherDrop[] = [], stations: Station[] = [], remotePlayers: RemotePlayerState[] = [], networkProjectiles: NetworkProjectileState[] = []) {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, SPACE_BACKGROUND_CONFIG.maxDevicePixelRatio);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const now = performance.now();
    const dockedStation = player.dockedStationId ? stations.find((station) => station.id === player.dockedStationId) : undefined;
    this.spaceBackground.render(ctx, {
      width: w,
      height: h,
      camera,
      velocity: dockedStation?.vel ?? player.vel,
      thrust: Math.min(1, Math.hypot(player.thrustLocal.forward, player.thrustLocal.strafe)),
      now,
      warping: dockedStation?.hyperdrive.hyperdriveState === "warping",
    });
    ctx.save();
    ctx.translate(w / 2 - camera.x * camera.zoom, h / 2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    this.drawZones();
    planets.forEach((p) => this.visible(p.pos, camera, w, h, p.radius + 220) && this.drawPlanet(p));
    asteroids.forEach((a) => this.visible(a.pos, camera, w, h, a.radius + 120) && drawAsteroid(ctx, a));
    etherDrops.forEach((drop) => this.visible(drop.pos, camera, w, h, 140) && drawEtherDrop(ctx, drop));
    stations.forEach((station) => this.visible(station.pos, camera, w, h, station.radius + 360) && this.stationRenderer.renderStation(ctx, station, { now }));
    projectiles.forEach((p) => this.visible(p.pos, camera, w, h, 160) && this.drawProjectile(p));
    if (player.miningLaserActive && !player.destroyed && !player.isInsideStation) this.drawMiningLaser(player);
    networkProjectiles.forEach((projectile) => this.visible(projectile, camera, w, h, 160) && this.drawNetworkProjectile(projectile));
    enemies.forEach((e) => {
      if (!this.visible(e.pos, camera, w, h, 140)) return;
      this.shipRenderer.drawShip({ ctx, x: e.pos.x, y: e.pos.y, rotation: e.angle, visualProfile: getAlienVisualProfile(e.alienType), animationTime: performance.now() });
      this.drawEnemyLabel(e.pos, e.radius, e.alienType.replace(/_/g, " "));
    });
    remotePlayers.forEach((remote) => {
      if (remote.docked || !this.visible({ x: remote.renderX, y: remote.renderY }, camera, w, h, 180)) return;
      let visualProfile;
      try { visualProfile = getShipVisualProfile(remote.shipClassId); } catch { visualProfile = getShipVisualProfile("base_ship"); }
      this.drawThrusterPlumes({
        x: remote.renderX,
        y: remote.renderY,
        angle: remote.renderAngle,
        radius: 24 * visualProfile.sizeScale,
        forwardPower: remote.thrustForward ?? 0,
        strafePower: remote.thrustStrafe ?? 0,
        visualScale: 1,
        trailLength: 1,
        glowScale: 1,
        layout: remote.shipClassId === "space_pod" ? "pod" : "dual",
      });
      this.shipRenderer.drawShip({ ctx, x: remote.renderX, y: remote.renderY, rotation: remote.renderAngle, visualProfile, playerCustomization: remote.customization, animationTime: now });
      this.drawRemotePlayerLabel(remote);
    });    if (!player.destroyed) {
      if (!player.isInsideStation || player.dockingState === "docking" || player.dockingState === "undocking") {
        if (!player.isInsideStation) player.drones.forEach((d) => this.drawDrone(d, player.customization.glowColor));
        if (player.dockingState === "docking" || player.dockingState === "undocking") this.drawDockingPath(player);
        this.drawPlayerThrusters(player);
        const dockProgress = player.dockingState === "free" ? 0 : Math.max(0, Math.min(1, (performance.now() - player.dockingAnimationStartedAt) / player.dockingAnimationDurationMs));
        const dockAlpha = player.dockingState === "docking" ? Math.max(0.18, 1 - dockProgress * 0.78) : player.dockingState === "undocking" ? Math.min(1, 0.25 + dockProgress * 0.75) : 1;
        ctx.save();
        ctx.globalAlpha *= dockAlpha;
        this.shipRenderer.drawShip({ ctx, x: player.pos.x, y: player.pos.y, rotation: player.angle, visualProfile: getPlayerVisualProfile(player), playerCustomization: player.customization, animationTime: performance.now() });
        ctx.restore();
        if (player.spawnProtected) this.drawSpawnShield(player.pos, player.radius, player.customization.glowColor);
      }
    } else {
      this.drawDestroyedShip(player);
    }
    ctx.restore();
    this.drawVignette(w, h);
  }

  private drawNetworkProjectile(projectile: NetworkProjectileState) {
    const ctx = this.ctx;
    const remaining = clamp((projectile.expiresAt - Date.now()) / Math.max(1, projectile.expiresAt - projectile.createdAt), 0.2, 1);
    ctx.save();
    ctx.globalAlpha = remaining;
    ctx.fillStyle = projectile.color;
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  destroy() {
    this.spaceBackground.destroy();
  }

  private drawRemotePlayerLabel(remote: RemotePlayerState) {
    const ctx = this.ctx;
    const width = 82;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillStyle = "#dff8ff";
    ctx.shadowColor = remote.customization.glowColor;
    ctx.shadowBlur = 7;
    ctx.fillText(remote.name, remote.renderX, remote.renderY - 42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(2, 8, 16, .82)";
    ctx.fillRect(remote.renderX - width / 2, remote.renderY - 35, width, 5);
    ctx.fillStyle = remote.healthRatio > 0.35 ? "#6edb8f" : "#ff6b78";
    ctx.fillRect(remote.renderX - width / 2, remote.renderY - 35, width * remote.healthRatio, 5);
    ctx.restore();
  }
  private drawDockingPath(player: Player) {
    const ctx = this.ctx;
    const progress = Math.max(0, Math.min(1, (performance.now() - player.dockingAnimationStartedAt) / player.dockingAnimationDurationMs));
    ctx.save();
    ctx.globalAlpha = player.dockingState === "docking" ? 0.36 * (1 - progress * 0.45) : 0.22 + progress * 0.18;
    ctx.strokeStyle = player.customization.glowColor;
    ctx.lineWidth = 10;
    ctx.setLineDash([28, 18]);
    ctx.lineDashOffset = -performance.now() * 0.08;
    ctx.beginPath();
    ctx.moveTo(player.dockingFrom.x, player.dockingFrom.y);
    ctx.lineTo(player.dockingTo.x, player.dockingTo.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = player.customization.glowColor;
    ctx.beginPath();
    ctx.arc(player.dockingTo.x, player.dockingTo.y, 26 + Math.sin(performance.now() * 0.012) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private visible(pos: Vec2, camera: Camera, w: number, h: number, margin: number) {
    return Math.abs(pos.x - camera.x) * camera.zoom < w / 2 + margin && Math.abs(pos.y - camera.y) * camera.zoom < h / 2 + margin;
  }


  private drawZones() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(92, 145, 176, .16)";
    ctx.lineWidth = 6;
    ctx.strokeRect(-MAP_CONFIG.halfWidth, -MAP_CONFIG.halfHeight, MAP_CONFIG.worldWidth, MAP_CONFIG.worldHeight);
    ctx.strokeStyle = "rgba(255, 209, 102, .2)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(MAP_CONFIG.centerX, MAP_CONFIG.centerY, MAP_CONFIG.centerZoneRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(167, 139, 250, .065)";
    ctx.beginPath();
    ctx.arc(MAP_CONFIG.centerX, MAP_CONFIG.centerY, MAP_CONFIG.asteroidBeltInnerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(76, 201, 240, .06)";
    ctx.strokeStyle = "rgba(92, 145, 176, .16)";
    ctx.beginPath();
    ctx.arc(MAP_CONFIG.centerX, MAP_CONFIG.centerY, MAP_CONFIG.asteroidBeltOuterRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawPlanet(planet: Planet) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(planet.pos.x, planet.pos.y);
    ctx.shadowColor = planet.color;
    ctx.shadowBlur = planet.rare ? 32 : 16;
    const g = ctx.createRadialGradient(-planet.radius * 0.3, -planet.radius * 0.35, planet.radius * 0.08, 0, 0, planet.radius);
    g.addColorStop(0, "rgba(255,255,255,.7)");
    g.addColorStop(0.28, planet.color);
    g.addColorStop(1, "#020617");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = planet.owner === "player" ? "#4cc9f0" : planet.owner === "enemy" ? "#ff6b78" : "rgba(180,196,210,.42)";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  private drawProjectile(p: Projectile) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.kind === "gravity" ? 10 : 5;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = clamp(p.lifetime / p.maxLifetime + 0.25, 0.2, 1);
    if (p.kind === "rail") {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.pos.x - p.vel.x * 0.035, p.pos.y - p.vel.y * 0.035);
      ctx.lineTo(p.pos.x, p.pos.y);
      ctx.stroke();
    } else if (p.kind === "missile") {
      const angle = Math.atan2(p.vel.y, p.vel.x);
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(p.radius * 1.7, 0);
      ctx.lineTo(-p.radius, p.radius * 0.72);
      ctx.lineTo(-p.radius * 0.55, 0);
      ctx.lineTo(-p.radius, -p.radius * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(226, 210, 150, .62)";
      ctx.beginPath();
      ctx.moveTo(-p.radius * 1.2, 0);
      ctx.lineTo(-p.radius * 2.2, 0);
      ctx.stroke();
    } else if (p.kind === "mine") {
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(performance.now() * 0.003);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.moveTo(Math.cos(a) * p.radius * 0.7, Math.sin(a) * p.radius * 0.7);
        ctx.lineTo(Math.cos(a) * p.radius * 1.55, Math.sin(a) * p.radius * 1.55);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "gravity") {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * 1.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "split" || p.kind === "drone" || p.kind === "orbit") {
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(Math.atan2(p.vel.y, p.vel.x));
      ctx.beginPath();
      ctx.moveTo(p.radius * 1.25, 0);
      ctx.lineTo(-p.radius * 0.72, p.radius * 0.72);
      ctx.lineTo(-p.radius * 0.2, 0);
      ctx.lineTo(-p.radius * 0.72, -p.radius * 0.72);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMiningLaser(player: Player) {
    const ctx = this.ctx;
    const direction = { x: Math.cos(player.miningLaserAngle), y: Math.sin(player.miningLaserAngle) };
    const start = {
      x: player.pos.x + direction.x * player.radius * 1.64,
      y: player.pos.y + direction.y * player.radius * 1.64,
    };
    const end = {
      x: start.x + direction.x * TUNING.miningLaserRange,
      y: start.y + direction.y * TUNING.miningLaserRange,
    };
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff7a3d";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "rgba(255, 122, 61, .84)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.shadowColor = "#fff4e8";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#fff4e8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(start.x + direction.x * 12, start.y + direction.y * 12);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawDrone(d: Drone, color: string) {
    const ctx = this.ctx;
    ctx.save();
    if (d.trail.length > 1) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.36;
      ctx.beginPath();
      ctx.moveTo(d.pos.x, d.pos.y);
      d.trail.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.translate(d.pos.x, d.pos.y);
    const speedAngle = Math.atan2(d.vy, d.vx);
    if (Math.hypot(d.vx, d.vy) > 12) ctx.rotate(speedAngle);
    ctx.shadowColor = color;
    ctx.shadowBlur = d.mode === "move_to_cursor" || d.mode === "auto_farm" ? 8 : 5;
    ctx.fillStyle = d.mode === "repel_from_cursor" ? "#4cc9f0" : color;
    ctx.strokeStyle = "rgba(218, 224, 228, .62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, 8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawSpawnShield(pos: Vec2, radius: number, color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.46;
    ctx.shadowBlur = 3;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawDestroyedShip(player: Player) {
    const ctx = this.ctx;
    const elapsed = Math.max(0, (performance.now() - player.destroyedAt) / 1000);
    const pulse = 1 + Math.sin(elapsed * 8) * 0.08;
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);
    ctx.rotate(player.angle);
    ctx.shadowColor = "#b66f75";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(182, 111, 117, .82)";
    ctx.strokeStyle = "rgba(226, 205, 205, .68)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 1.15 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = player.customization.glowColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(148, 163, 184, .9)";
    for (let i = 0; i < 7; i += 1) {
      const a = (Math.PI * 2 * i) / 7 + elapsed * 0.25;
      const d = player.radius * (1.4 + i * 0.14 + Math.min(elapsed, 4) * 0.32);
      ctx.save();
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
      ctx.rotate(a + elapsed);
      ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawPlayerThrusters(player: Player) {
    const forwardPower = player.thrustLocal.forward;
    const strafePower = player.thrustLocal.strafe;
    const effective = getEffectivePlayerStats(player.stats, player.baseFrameId);
    const visualProfile = getPlayerVisualProfile(player);
    this.drawThrusterPlumes({
      x: player.pos.x,
      y: player.pos.y,
      angle: player.angle,
      // Thrusters attach to the rendered hull, which can be larger than the
      // gameplay collision radius for visually scaled ships.
      radius: 24 * visualProfile.sizeScale,
      forwardPower,
      strafePower,
      visualScale: effective.movementSpeed.thrusterVisualScale,
      trailLength: effective.movementSpeed.thrusterTrailLength,
      glowScale: effective.movementSpeed.thrusterGlowIntensity,
      layout: player.currentShipId === "space_pod" ? "pod" : "dual",
    });
  }

  private drawThrusterPlumes(args: {
    x: number;
    y: number;
    angle: number;
    radius: number;
    forwardPower: number;
    strafePower: number;
    visualScale: number;
    trailLength: number;
    glowScale: number;
    layout: "pod" | "dual";
  }) {
    const { x, y, angle, radius: r, forwardPower, strafePower, visualScale, trailLength, glowScale, layout } = args;
    if (Math.abs(forwardPower) < 0.05 && Math.abs(strafePower) < 0.05) return;
    const ctx = this.ctx;
    const blue = "#39c8ff";
    const blueMid = "rgba(57,200,255,.62)";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = blue;
    ctx.shadowBlur = 13 * glowScale;

    const plume = (startX: number, startY: number, endX: number, endY: number, power: number, width: number) => {
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, "#effdff");
      gradient.addColorStop(0.14, blue);
      gradient.addColorStop(0.52, blueMid);
      gradient.addColorStop(1, "rgba(57,200,255,0)");
      ctx.globalAlpha = clamp(Math.abs(power), 0, 1);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width * visualScale * (0.72 + Math.abs(power) * 0.7);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    };

    if (layout === "pod") {
      if (forwardPower > 0.05) {
        plume(-r * 1.58, 0, -r * (2.35 + forwardPower * 1.35) * trailLength, 0, forwardPower, r * 0.13);
      }
      if (forwardPower < -0.05) {
        plume(r * 1.48, 0, r * (1.88 + Math.abs(forwardPower) * 0.62), 0, forwardPower, r * 0.075);
      }
      if (strafePower > 0.05) {
        plume(-r * 0.42, -r * 0.46, -r * 0.42, -r * (0.78 + strafePower * 0.32), strafePower, r * 0.055);
      }
      if (strafePower < -0.05) {
        plume(-r * 0.42, r * 0.46, -r * 0.42, r * (0.78 + Math.abs(strafePower) * 0.32), strafePower, r * 0.055);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }

    if (forwardPower > 0.05) {
      plume(-r * 1.72, -r * 0.29, -r * (2.15 + forwardPower * 1.15) * trailLength, -r * 0.34, forwardPower, 6);
      plume(-r * 1.72, r * 0.29, -r * (2.15 + forwardPower * 1.15) * trailLength, r * 0.34, forwardPower, 6);
    }
    if (forwardPower < -0.05) {
      plume(r * 1.55, -r * 0.16, r * (1.9 + Math.abs(forwardPower) * 0.58), -r * 0.18, forwardPower, 3.5);
      plume(r * 1.55, r * 0.16, r * (1.9 + Math.abs(forwardPower) * 0.58), r * 0.18, forwardPower, 3.5);
    }
    if (strafePower > 0.05) {
      plume(-r * 0.92, -r * 0.72, -r * 0.96, -r * (1.32 + strafePower * 0.48), strafePower, 4);
      plume(r * 0.56, -r * 0.43, r * 0.6, -r * (0.86 + strafePower * 0.38), strafePower, 3);
    }
    if (strafePower < -0.05) {
      plume(-r * 0.92, r * 0.72, -r * 0.96, r * (1.32 + Math.abs(strafePower) * 0.48), strafePower, 4);
      plume(r * 0.56, r * 0.43, r * 0.6, r * (0.86 + Math.abs(strafePower) * 0.38), strafePower, 3);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawPlayerAttachments(player: Player) {
    const ctx = this.ctx;
    const weaponType = player.ship.node.weaponType;
    if (weaponType === "plasma") return;
    const r = player.radius;
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);
    ctx.rotate(player.angle);
    ctx.shadowColor = player.customization.glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(226,232,240,.82)";
    ctx.fillStyle = "rgba(15,23,42,.92)";
    ctx.lineWidth = 2;
    if (weaponType === "rockets") {
      [-1, 1].forEach((side) => {
        ctx.fillRect(-r * 0.34, side * r * 0.55 - 5, r * 0.74, 10);
        ctx.strokeRect(-r * 0.34, side * r * 0.55 - 5, r * 0.74, 10);
      });
    } else if (weaponType === "laser" || weaponType === "sniper") {
      ctx.beginPath();
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(r * (weaponType === "sniper" ? 1.95 : 1.55), 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.55, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (weaponType === "drones") {
      ctx.strokeRect(-r * 0.48, -r * 0.36, r * 0.62, r * 0.72);
    } else if (weaponType === "machine_gun") {
      [-0.28, 0, 0.28].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(r * 0.66, offset * r);
        ctx.lineTo(r * 1.35, offset * r);
        ctx.stroke();
      });
    } else if (weaponType === "mines") {
      ctx.strokeRect(-r * 1.15, -r * 0.3, r * 0.48, r * 0.6);
    } else if (weaponType === "tank" || weaponType === "cannon") {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r * 0.42, 0);
      ctx.lineTo(r * 1.55, 0);
      ctx.stroke();
    } else if (weaponType === "force_field") {
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(90,166,200,.32)";
      ctx.stroke();
    } else if (weaponType === "arc_lightning") {
      ctx.strokeStyle = "rgba(142,128,184,.68)";
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.45);
      ctx.lineTo(r * 0.55, 0);
      ctx.lineTo(r * 0.3, r * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemyLabel(pos: Vec2, radius: number, label: string) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(254,226,226,.72)";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(label, pos.x - radius, pos.y - radius - 12);
  }

  private drawClassAttachments(pos: Vec2, angle: number, radius: number, label: string, glow: string) {
    const ctx = this.ctx;
    const name = label.toLowerCase();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(254, 226, 226, .82)";
    ctx.fillStyle = "rgba(15, 23, 42, .84)";
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    if (name.includes("sniper") || name.includes("longshot")) {
      ctx.beginPath();
      ctx.moveTo(radius * 0.7, 0);
      ctx.lineTo(radius * 1.85, 0);
      ctx.stroke();
    } else if (name.includes("drone") || name.includes("carrier")) {
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.arc(-radius * 0.18, side * radius * 0.84, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else if (name.includes("scatter") || name.includes("raider")) {
      [-0.34, 0, 0.34].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(radius * 0.55, offset * radius);
        ctx.lineTo(radius * 1.25, offset * radius);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  private drawShip(pos: Vec2, angle: number, radius: number, color: string, glow: string, kind: "player" | "enemy", label: string, decal = "none", wing = "delta", cockpit = "needle") {
    const ctx = this.ctx;
    const name = label.toLowerCase();
    const heavy = name.includes("tank") || name.includes("iron") || name.includes("fortress") || name.includes("bastion") || name.includes("bulwark");
    const sniper = name.includes("sniper") || name.includes("longshot") || name.includes("rail");
    const carrier = name.includes("drone") || name.includes("carrier") || name.includes("orbital");
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.shadowColor = glow;
    ctx.shadowBlur = kind === "player" ? 24 : 12;
    ctx.fillStyle = color;
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const nose = radius * (sniper ? 1.75 : heavy ? 1.08 : 1.35);
    const tail = radius * (heavy ? -1.05 : -1.18);
    const wingSpan = radius * (heavy ? 1.05 : carrier ? 0.96 : wing === "swept" ? 0.72 : 0.84);
    const innerSpan = radius * (wing === "fork" ? 0.38 : 0.2);
    ctx.moveTo(nose, 0);
    if (wing === "fork" && kind === "player") {
      ctx.lineTo(radius * 0.24, wingSpan * 0.42);
      ctx.lineTo(-radius * 0.94, wingSpan);
      ctx.lineTo(-radius * 0.54, innerSpan);
      ctx.lineTo(tail, radius * 0.22);
      ctx.lineTo(tail, -radius * 0.22);
      ctx.lineTo(-radius * 0.54, -innerSpan);
      ctx.lineTo(-radius * 0.94, -wingSpan);
      ctx.lineTo(radius * 0.24, -wingSpan * 0.42);
    } else if (heavy) {
      ctx.lineTo(radius * 0.32, wingSpan);
      ctx.lineTo(-radius * 0.86, wingSpan * 0.72);
      ctx.lineTo(tail, radius * 0.34);
      ctx.lineTo(tail, -radius * 0.34);
      ctx.lineTo(-radius * 0.86, -wingSpan * 0.72);
      ctx.lineTo(radius * 0.32, -wingSpan);
    } else {
      ctx.lineTo(-radius * (wing === "swept" ? 0.36 : 0.72), wingSpan);
      ctx.lineTo(-radius * 0.42, innerSpan);
      ctx.lineTo(tail, 0);
      ctx.lineTo(-radius * 0.42, -innerSpan);
      ctx.lineTo(-radius * (wing === "swept" ? 0.36 : 0.72), -wingSpan);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 1.2;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.42, side * radius * 0.18);
      ctx.lineTo(radius * 0.82, side * radius * 0.08);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(255,255,255,.76)";
    ctx.beginPath();
    if (cockpit === "split" && kind === "player") {
      ctx.ellipse(radius * 0.12, -radius * 0.12, radius * 0.18, radius * 0.09, 0, 0, Math.PI * 2);
      ctx.ellipse(radius * 0.12, radius * 0.12, radius * 0.18, radius * 0.09, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(radius * 0.2, 0, radius * (cockpit === "dome" ? 0.3 : 0.24), radius * (cockpit === "dome" ? 0.2 : 0.12), 0, 0, Math.PI * 2);
    }
    ctx.fill();
    if (decal !== "none") {
      ctx.strokeStyle = decal === "stripe" ? "#ffffff" : glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, 0);
      ctx.lineTo(radius * 0.7, 0);
      ctx.stroke();
    }
    ctx.restore();
    if (kind === "enemy") {
      ctx.fillStyle = "rgba(226,232,240,.72)";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(label, pos.x - radius, pos.y - radius - 12);
    }
  }

  private drawVignette(w: number, h: number) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.32)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
