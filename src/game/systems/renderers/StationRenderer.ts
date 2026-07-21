import { STATION_CONFIG } from "../../data/stationConfig";
import type { Station } from "../../data/stationTypes";
import { getStationVisualProfile, hasStationVisualUpgrade, seededUnit, type StationVisualProfile } from "../../data/stationVisuals";

export type StationRenderOptions = {
  now: number;
};

// Both supplied carrier textures use a 1254px square canvas, but their
// non-transparent hulls have different bounds. Normalize the docked texture
// to the derelict hull's measured height and visual center so changing state
// never makes the spacecraft jump or grow.
const STARTER_TEXTURE_SIZE = 1254;
const STARTER_HULL_WIDTH = 945;
const STARTER_HULL_HEIGHT = 1001;
const STARTER_HULL_CENTER = { x: 652.5, y: 594.5 };
const DOCKED_HULL_WIDTH = 992;
const DOCKED_HULL_HEIGHT = 1095;
const DOCKED_HULL_CENTER = { x: 634, y: 608.5 };
const baseWeaponPolygon = [
  { x: 956, y: 295 }, { x: 1014, y: 295 }, { x: 1020, y: 420 }, { x: 1033, y: 459 },
  { x: 1032, y: 565 }, { x: 1018, y: 610 }, { x: 985, y: 620 }, { x: 950, y: 606 },
  { x: 936, y: 565 }, { x: 938, y: 461 }, { x: 950, y: 420 },
];
const sniperWeaponPolygon = [
  { x: 969, y: 160 }, { x: 1038, y: 160 }, { x: 1048, y: 430 }, { x: 1068, y: 480 },
  { x: 1062, y: 668 }, { x: 1042, y: 735 }, { x: 1040, y: 892 }, { x: 970, y: 892 },
  { x: 968, y: 735 }, { x: 946, y: 668 }, { x: 942, y: 480 }, { x: 958, y: 430 },
];
const twinLeftWeaponPolygon = [
  { x: 202, y: 290 }, { x: 264, y: 290 }, { x: 276, y: 420 }, { x: 292, y: 458 },
  { x: 290, y: 568 }, { x: 272, y: 611 }, { x: 238, y: 621 }, { x: 203, y: 610 },
  { x: 186, y: 568 }, { x: 188, y: 458 }, { x: 198, y: 420 },
];
const twinRightWeaponPolygon = twinLeftWeaponPolygon.map((point) => ({ x: STARTER_TEXTURE_SIZE - point.x, y: point.y }));
const emptyWeaponMask = [
  { x: 946, y: 278 }, { x: 1024, y: 278 }, { x: 1036, y: 410 }, { x: 1052, y: 454 },
  { x: 1050, y: 592 }, { x: 1026, y: 640 }, { x: 985, y: 654 }, { x: 938, y: 638 },
  { x: 918, y: 592 }, { x: 920, y: 450 }, { x: 934, y: 408 },
];

function stationWeaponKind(station: Station): "base" | "sniper" | "twin" {
  const id = (station.turretClassId ?? "base_ship").toLowerCase();
  if (id.includes("sniper")) return "sniper";
  if (id.includes("twin") || id.includes("machine_gun_l15")) return "twin";
  return "base";
}

export class StationRenderer {
  private readonly derelictSprite: HTMLImageElement | null;
  private readonly claimedSprite: HTMLImageElement | null;
  private readonly emptyWeaponBaySprite: HTMLImageElement | null;
  private readonly sniperWeaponSprite: HTMLImageElement | null;
  private readonly twinWeaponSprite: HTMLImageElement | null;

  constructor() {
    if (typeof Image === "undefined") {
      this.derelictSprite = null;
      this.claimedSprite = null;
      this.emptyWeaponBaySprite = null;
      this.sniperWeaponSprite = null;
      this.twinWeaponSprite = null;
      return;
    }
    this.derelictSprite = new Image();
    this.derelictSprite.decoding = "async";
    this.derelictSprite.src = "/assets/starter/derelict-spacecraft.png";
    this.claimedSprite = new Image();
    this.claimedSprite.decoding = "async";
    this.claimedSprite.src = "/assets/starter/claimed-spacecraft.png";
    this.emptyWeaponBaySprite = new Image();
    this.emptyWeaponBaySprite.decoding = "async";
    this.emptyWeaponBaySprite.src = "/assets/starter/claimed-spacecraft-no-gun.png";
    this.sniperWeaponSprite = new Image();
    this.sniperWeaponSprite.decoding = "async";
    this.sniperWeaponSprite.src = "/assets/starter/upgrades/sniper-lv15.png";
    this.twinWeaponSprite = new Image();
    this.twinWeaponSprite.decoding = "async";
    this.twinWeaponSprite.src = "/assets/starter/upgrades/twin-lv15.png";
  }

  renderStation(ctx: CanvasRenderingContext2D, station: Station, options: StationRenderOptions) {
    const profile = getStationVisualProfile(station);
    if (this.renderStarterSpacecraft(ctx, station, profile, options)) {
      this.renderStationLabel(ctx, station, profile);
      return;
    }
    ctx.save();
    ctx.translate(station.pos.x, station.pos.y);
    ctx.rotate((profile.seed % 628) / 100);
    this.renderStationMassShadow(ctx, profile);
    this.renderStationShield(ctx, station, profile, options);
    this.renderStationDebris(ctx, profile, options);
    this.renderStationDockingArms(ctx, station, profile);
    this.renderStationModules(ctx, station, profile, options);
    this.renderStationHullRing(ctx, station, profile, options);
    this.renderOrbitalArchitecture(ctx, station, profile, options);
    this.renderStationLandingPads(ctx, station, profile, options);
    this.renderStationDefenses(ctx, station, profile, options);
    this.renderStationCore(ctx, station, profile, options);
    this.renderStationDamageDetails(ctx, profile, options);
    if (profile.isMothership || Math.hypot(station.vel.x, station.vel.y) > 8) {
      this.renderMothershipThrusters(ctx, station, profile, options);
      this.renderHyperdriveChargeEffect(ctx, station, profile, options);
    }
    ctx.restore();
    this.renderStationLabel(ctx, station, profile);
  }

  private renderStarterSpacecraft(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const hasDockedPod = station.landingPads.some((pad) => Boolean(pad.occupiedByPlayerId));
    const sprite = station.claimState === "claimed" && hasDockedPod ? this.claimedSprite : this.derelictSprite;
    if (!sprite?.complete || sprite.naturalWidth <= 0) return false;

    const size = STATION_CONFIG.spacecraftVisualRadius * 2;
    const isDockedTexture = sprite === this.claimedSprite;
    const sourceHullWidth = isDockedTexture ? DOCKED_HULL_WIDTH : STARTER_HULL_WIDTH;
    const sourceHullHeight = isDockedTexture ? DOCKED_HULL_HEIGHT : STARTER_HULL_HEIGHT;
    const sourceHullCenter = isDockedTexture ? DOCKED_HULL_CENTER : STARTER_HULL_CENTER;
    const drawWidth = size * (STARTER_HULL_WIDTH / sourceHullWidth);
    const drawHeight = size * (STARTER_HULL_HEIGHT / sourceHullHeight);
    const desiredCenterX = ((STARTER_HULL_CENTER.x - STARTER_TEXTURE_SIZE / 2) / STARTER_TEXTURE_SIZE) * size;
    const desiredCenterY = ((STARTER_HULL_CENTER.y - STARTER_TEXTURE_SIZE / 2) / STARTER_TEXTURE_SIZE) * size;
    const sourceCenterX = ((sourceHullCenter.x - STARTER_TEXTURE_SIZE / 2) / STARTER_TEXTURE_SIZE) * drawWidth;
    const sourceCenterY = ((sourceHullCenter.y - STARTER_TEXTURE_SIZE / 2) / STARTER_TEXTURE_SIZE) * drawHeight;
    const spriteOffsetX = desiredCenterX - sourceCenterX;
    const spriteOffsetY = desiredCenterY - sourceCenterY;
    const speed = Math.hypot(station.vel.x, station.vel.y);
    const forwardPower = Math.max(-1, Math.min(1, station.thrusterForward ?? -(station.driveInput?.y ?? 0)));
    const rotationPower = Math.max(-1, Math.min(1, station.thrusterRotation ?? (station.driveInput?.x ?? 0)));
    const velocityFacing = speed > 5 ? Math.atan2(station.vel.y, station.vel.x) + Math.PI / 2 : 0;
    const stationRotation = station.facingAngle ?? velocityFacing;
    ctx.save();
    ctx.translate(station.pos.x, station.pos.y);
    ctx.rotate(stationRotation);

    if (Math.abs(forwardPower) > 0.05 || Math.abs(rotationPower) > 0.05) {
      const boosterLevel = Math.max(1, station.upgradeState.boosterLevel);
      const upgradeScale = Math.min(2.1, 1 + (boosterLevel - 1) * 0.16 + station.level * 0.002 + profile.repairProgress * 0.18);
      const plume = (sx: number, sy: number, ex: number, ey: number, power: number, width: number) => {
        const gradient = ctx.createLinearGradient(sx, sy, ex, ey);
        gradient.addColorStop(0, "rgba(236,253,255,.98)");
        gradient.addColorStop(0.16, "rgba(72,209,255,.94)");
        gradient.addColorStop(0.58, "rgba(38,155,255,.64)");
        gradient.addColorStop(1, "rgba(38,155,255,0)");
        ctx.globalAlpha = Math.min(1, Math.abs(power));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width * upgradeScale * (0.72 + Math.abs(power) * 0.65);
        ctx.lineCap = "round";
        ctx.shadowColor = "#46d8ff";
        ctx.shadowBlur = 22 * upgradeScale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      };
      if (forwardPower > 0.05) {
        const start = station.radius * 1.02;
        const end = station.radius * (1.32 + forwardPower * 0.74) * upgradeScale;
        plume(0, start, 0, end, forwardPower, 22);
      } else if (forwardPower < -0.05) {
        const power = Math.abs(forwardPower);
        plume(-station.radius * 0.2, -station.radius * 0.8, -station.radius * 0.2, -station.radius * (1.1 + power * 0.38), power, 8);
        plume(station.radius * 0.2, -station.radius * 0.8, station.radius * 0.2, -station.radius * (1.1 + power * 0.38), power, 8);
      }
      if (rotationPower > 0.05) {
        plume(station.radius * 0.55, -station.radius * 0.55, station.radius * (0.84 + rotationPower * 0.22), -station.radius * 0.55, rotationPower, 6);
        plume(-station.radius * 0.55, station.radius * 0.55, -station.radius * (0.84 + rotationPower * 0.22), station.radius * 0.55, rotationPower, 6);
      } else if (rotationPower < -0.05) {
        const power = Math.abs(rotationPower);
        plume(-station.radius * 0.55, -station.radius * 0.55, -station.radius * (0.84 + power * 0.22), -station.radius * 0.55, power, 6);
        plume(station.radius * 0.55, station.radius * 0.55, station.radius * (0.84 + power * 0.22), station.radius * 0.55, power, 6);
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = station.claimState === "unclaimed" ? 0.84 : 1;
    ctx.shadowColor = station.underAttack ? "#ff6b78" : station.claimState === "claimed" ? "rgba(74,220,255,.7)" : "rgba(0,0,0,.9)";
    ctx.shadowBlur = station.claimState === "claimed" ? 12 : 24;
    ctx.drawImage(sprite, spriteOffsetX - drawWidth / 2, spriteOffsetY - drawHeight / 2, drawWidth, drawHeight);
    if (station.claimState === "claimed") {
      this.renderEmptyWeaponBays(ctx, station, drawWidth, drawHeight, spriteOffsetX, spriteOffsetY);
      this.renderStarterTurret(ctx, station, stationRotation, options, drawWidth, drawHeight, spriteOffsetX, spriteOffsetY);
    }

    if (station.claimState === "claimed") {
      const pulse = 0.5 + Math.sin(options.now * 0.004) * 0.12;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = station.underAttack ? "#ff6b78" : "#70e8ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, station.radius * 0.93, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  private renderEmptyWeaponBays(ctx: CanvasRenderingContext2D, station: Station, drawWidth: number, drawHeight: number, offsetX: number, offsetY: number) {
    const source = this.emptyWeaponBaySprite;
    if (!source?.complete || source.naturalWidth <= 0) return;
    const scaleX = drawWidth / STARTER_TEXTURE_SIZE, scaleY = drawHeight / STARTER_TEXTURE_SIZE;
    const left = offsetX - drawWidth / 2, top = offsetY - drawHeight / 2;
    const drawBay = (mirrored: boolean) => {
      ctx.save();
      ctx.beginPath();
      emptyWeaponMask.forEach((point, index) => {
        const sourceX = mirrored ? STARTER_TEXTURE_SIZE - point.x : point.x;
        const x = left + sourceX * scaleX;
        const y = top + point.y * scaleY;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      if (mirrored) {
        ctx.translate(left * 2 + drawWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(source, left, top, drawWidth, drawHeight);
      ctx.restore();
    };
    drawBay(false);
    if (stationWeaponKind(station) === "twin") drawBay(true);
  }

  private renderStarterTurret(ctx: CanvasRenderingContext2D, station: Station, stationRotation: number, options: StationRenderOptions, drawWidth: number, drawHeight: number, offsetX: number, offsetY: number) {
    const kind = stationWeaponKind(station);
    const relativeAim = (station.turretAngle ?? -Math.PI / 2) - stationRotation;
    const definitions = kind === "sniper"
      ? [{ sprite: this.sniperWeaponSprite, pivot: { x: 1003, y: 572 }, polygon: sniperWeaponPolygon, muzzleLength: 128 }]
      : kind === "twin"
        ? [
            { sprite: this.twinWeaponSprite, pivot: { x: 241, y: 548 }, polygon: twinLeftWeaponPolygon, muzzleLength: 82 },
            { sprite: this.twinWeaponSprite, pivot: { x: 1013, y: 548 }, polygon: twinRightWeaponPolygon, muzzleLength: 82 },
          ]
        : [{ sprite: this.claimedSprite, pivot: { x: 985, y: 548 }, polygon: baseWeaponPolygon, muzzleLength: 82 }];
    const scaleX = drawWidth / STARTER_TEXTURE_SIZE, scaleY = drawHeight / STARTER_TEXTURE_SIZE;
    const left = offsetX - drawWidth / 2, top = offsetY - drawHeight / 2;
    for (const definition of definitions) {
      const source = definition.sprite;
      if (!source?.complete || source.naturalWidth <= 0) continue;
      const mountX = left + definition.pivot.x * scaleX;
      const mountY = top + definition.pivot.y * scaleY;
      ctx.save();
      ctx.translate(mountX, mountY);
      ctx.rotate(relativeAim + Math.PI / 2);
      ctx.beginPath();
      definition.polygon.forEach((point, index) => {
        const x = (point.x - definition.pivot.x) * scaleX;
        const y = (point.y - definition.pivot.y) * scaleY;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.shadowColor = "rgba(76,220,255,.48)";
      ctx.shadowBlur = 7;
      ctx.drawImage(source, -definition.pivot.x * scaleX, -definition.pivot.y * scaleY, drawWidth, drawHeight);
      ctx.restore();
      if ((station.turretFiringUntil ?? 0) > options.now) {
        const localMuzzleAngle = relativeAim;
        const muzzleX = mountX + Math.cos(localMuzzleAngle) * definition.muzzleLength;
        const muzzleY = mountY + Math.sin(localMuzzleAngle) * definition.muzzleLength;
        ctx.save();
        ctx.translate(muzzleX, muzzleY);
        ctx.rotate(localMuzzleAngle);
        ctx.shadowColor = "#8df3ff";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "rgba(220,252,255,.96)";
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(20, 0);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderStationShield(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    if (!profile.shieldActive) return;
    const pulse = 0.5 + Math.sin(options.now * 0.0022 + profile.seed) * 0.5;
    const opacity = 0.08 + profile.shieldRatio * 0.16 + pulse * 0.025;
    const radius = Math.max(profile.outerRadius * 1.35, STATION_CONFIG.dockRadius * 0.22);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = profile.underAttack ? "rgba(255, 107, 120, 0.78)" : "rgba(76, 201, 240, 0.72)";
    ctx.fillStyle = profile.underAttack ? "rgba(255, 107, 120, 0.055)" : "rgba(76, 201, 240, 0.052)";
    ctx.lineWidth = 5;
    ctx.setLineDash([28, 22]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderStationMassShadow(ctx: CanvasRenderingContext2D, profile: StationVisualProfile) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 36;
    ctx.fillStyle = "rgba(6, 9, 13, 0.74)";
    ctx.strokeStyle = "rgba(185, 196, 205, 0.16)";
    ctx.lineWidth = profile.baseRadius * 0.035;
    drawPolygon(ctx, 0, 0, profile.outerRadius * 0.92, 12, Math.PI / 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private renderStationDebris(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, options: StationRenderOptions) {
    const count = profile.isClaimed ? Math.round(profile.damageLevel * 8) : Math.round(7 + profile.damageLevel * 12);
    ctx.save();
    ctx.fillStyle = "rgba(113, 119, 126, 0.72)";
    ctx.strokeStyle = "rgba(20, 24, 28, 0.68)";
    ctx.lineWidth = 2;
    for (let i = 0; i < count; i += 1) {
      const angle = seededUnit(profile.seed, i * 3) * Math.PI * 2;
      const orbit = profile.outerRadius * (1.24 + seededUnit(profile.seed, i * 7) * 0.52);
      const drift = Math.sin(options.now * 0.00045 + i) * profile.damageLevel * 2.5;
      const x = Math.cos(angle) * (orbit + drift);
      const y = Math.sin(angle) * (orbit - drift);
      const w = 8 + seededUnit(profile.seed, i * 11) * 18;
      const h = 4 + seededUnit(profile.seed, i * 13) * 10;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + seededUnit(profile.seed, i * 17) * 1.6);
      ctx.globalAlpha = 0.12 + profile.damageLevel * 0.34;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.restore();
  }

  private renderStationHullRing(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const segmentCount = 12;
    const completeSegments = Math.max(3, Math.round(segmentCount * (0.38 + profile.repairProgress * 0.62)));
    ctx.save();
    ctx.lineCap = "butt";
    for (let i = 0; i < segmentCount; i += 1) {
      const brokenGap = i >= completeSegments || seededUnit(profile.seed, i) < profile.damageLevel * 0.18;
      const start = (Math.PI * 2 * i) / segmentCount + 0.035;
      const end = (Math.PI * 2 * (i + 0.72)) / segmentCount;
      ctx.beginPath();
      ctx.arc(0, 0, profile.ringRadius, start, end);
      ctx.strokeStyle = brokenGap ? "rgba(83, 88, 94, 0.44)" : profile.isClaimed ? "rgba(110, 219, 143, 0.58)" : "rgba(180, 196, 210, 0.44)";
      ctx.lineWidth = brokenGap ? profile.baseRadius * 0.08 : profile.baseRadius * (0.13 + profile.repairProgress * 0.04);
      ctx.stroke();

      if (!brokenGap && profile.isFortified) {
        ctx.beginPath();
        ctx.arc(0, 0, profile.ringRadius + profile.baseRadius * 0.11, start + 0.035, end - 0.035);
        ctx.strokeStyle = "rgba(212, 222, 230, 0.22)";
        ctx.lineWidth = profile.baseRadius * 0.03;
        ctx.stroke();
      }
    }

    ctx.strokeStyle = station.underAttack ? "rgba(255, 107, 120, 0.55)" : "rgba(18, 23, 30, 0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, profile.ringRadius - profile.baseRadius * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, profile.ringRadius + profile.baseRadius * 0.14, 0, Math.PI * 2);
    ctx.stroke();

    if (hasStationVisualUpgrade(profile, "armor_plating")) {
      this.renderArmorPlates(ctx, profile, options);
    }
    ctx.restore();
  }

  private renderOrbitalArchitecture(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const pulse = 0.78 + Math.sin(options.now * 0.0024 + profile.seed) * 0.16;
    const operational = Math.max(0.16, profile.repairProgress);
    const cyan = profile.healthRatio <= 0.28 ? profile.warningColor : profile.coreColor;
    ctx.save();

    // Layered armored decks give the station the stepped, weighty silhouette of
    // the concept while keeping its actual gameplay radius unchanged.
    const deckGradient = ctx.createRadialGradient(
      -profile.baseRadius * .13,
      -profile.baseRadius * .16,
      profile.coreRadius * .34,
      0,
      0,
      profile.outerRadius,
    );
    deckGradient.addColorStop(0, "#9da9b1");
    deckGradient.addColorStop(.2, "#333e46");
    deckGradient.addColorStop(.44, "#111a21");
    deckGradient.addColorStop(.7, "#647079");
    deckGradient.addColorStop(.86, "#202a31");
    deckGradient.addColorStop(1, "#080e13");

    const decks = [
      { radius: profile.outerRadius * .82, width: profile.baseRadius * .17, alpha: .92 },
      { radius: profile.outerRadius * .64, width: profile.baseRadius * .2, alpha: .96 },
      { radius: profile.outerRadius * .43, width: profile.baseRadius * .18, alpha: 1 },
    ];
    for (const deck of decks) {
      ctx.globalAlpha = deck.alpha;
      ctx.strokeStyle = deckGradient;
      ctx.lineWidth = deck.width;
      ctx.beginPath();
      ctx.arc(0, 0, deck.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(222,231,236,.28)";
      ctx.lineWidth = Math.max(1.5, profile.baseRadius * .014);
      ctx.beginPath();
      ctx.arc(0, 0, deck.radius - deck.width * .42, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Luminous habitable window bands. Broken stations expose fewer lit bays;
    // repaired bases progressively regain a full cyan ring.
    ctx.globalAlpha = (.35 + operational * .55) * pulse;
    ctx.strokeStyle = cyan;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = profile.baseRadius * .09;
    ctx.lineCap = "butt";
    ctx.lineWidth = Math.max(2, profile.baseRadius * .035);
    ctx.setLineDash([
      profile.baseRadius * (.2 + operational * .11),
      profile.baseRadius * (.13 - operational * .04),
    ]);
    ctx.lineDashOffset = -(profile.seed % 19);
    for (const radius of [profile.outerRadius * .73, profile.outerRadius * .5]) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2 * (.42 + operational * .58));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Radial ribs divide the deck into believable manufactured sections.
    ctx.globalAlpha = .72;
    for (let i = 0; i < 16; i += 1) {
      if (!profile.isClaimed && seededUnit(profile.seed, i + 510) < profile.damageLevel * .3) continue;
      const angle = i * Math.PI / 8;
      ctx.strokeStyle = i % 4 === 0 ? "rgba(188,201,210,.55)" : "rgba(7,12,16,.88)";
      ctx.lineWidth = i % 4 === 0 ? profile.baseRadius * .035 : profile.baseRadius * .018;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * profile.outerRadius * .32, Math.sin(angle) * profile.outerRadius * .32);
      ctx.lineTo(Math.cos(angle) * profile.outerRadius * .88, Math.sin(angle) * profile.outerRadius * .88);
      ctx.stroke();
    }

    this.renderStationCommandTower(ctx, profile, cyan, pulse);

    // Small warm maintenance lights break up the cool palette in the same way
    // as the reference station's service bays.
    ctx.globalAlpha = .72 * operational;
    ctx.fillStyle = "#ff9b37";
    ctx.shadowColor = "#ff9b37";
    ctx.shadowBlur = 5;
    for (let i = 0; i < 10; i += 1) {
      const angle = i * Math.PI / 5 + .13;
      const radius = profile.outerRadius * (i % 2 ? .58 : .78);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.max(1.5, profile.baseRadius * .018), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderStationCommandTower(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, color: string, pulse: number) {
    const towerHeight = profile.coreRadius * (1.35 + profile.repairProgress * .38);
    const towerWidth = profile.coreRadius * .58;
    const riseX = -towerHeight * .22;
    const riseY = -towerHeight * .58;
    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,.48)";
    ctx.beginPath();
    ctx.ellipse(profile.coreRadius * .18, profile.coreRadius * .2, profile.coreRadius * 1.08, profile.coreRadius * .66, -.15, 0, Math.PI * 2);
    ctx.fill();

    const towerGradient = ctx.createLinearGradient(riseX - towerWidth, riseY, towerWidth, 0);
    towerGradient.addColorStop(0, "#101820");
    towerGradient.addColorStop(.42, "#7a8790");
    towerGradient.addColorStop(.64, "#26323a");
    towerGradient.addColorStop(1, "#080e13");
    ctx.fillStyle = towerGradient;
    ctx.strokeStyle = "rgba(205,217,225,.48)";
    ctx.lineWidth = Math.max(1.5, profile.baseRadius * .022);
    ctx.beginPath();
    ctx.moveTo(-towerWidth, profile.coreRadius * .42);
    ctx.lineTo(riseX - towerWidth * .36, riseY);
    ctx.lineTo(riseX + towerWidth * .3, riseY - profile.coreRadius * .13);
    ctx.lineTo(towerWidth, profile.coreRadius * .42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Stacked command decks.
    for (let i = 0; i < 3; i += 1) {
      const y = riseY * (.24 + i * .22);
      const width = towerWidth * (1.18 - i * .18);
      ctx.fillStyle = i % 2 ? "#1a252d" : "#56636c";
      ctx.strokeStyle = "rgba(211,223,230,.34)";
      ctx.beginPath();
      ctx.ellipse(riseX * (.22 + i * .23), y, width, profile.coreRadius * .2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.globalAlpha = .66 * pulse;
    ctx.shadowColor = color;
    ctx.shadowBlur = profile.baseRadius * .1;
    ctx.lineWidth = Math.max(2, profile.baseRadius * .026);
    ctx.beginPath();
    ctx.moveTo(riseX - towerWidth * .18, riseY * .78);
    ctx.lineTo(riseX + towerWidth * .22, riseY * .78);
    ctx.stroke();

    // Communications spires give the center a recognisable station skyline.
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(174,190,200,.74)";
    ctx.lineWidth = Math.max(1, profile.baseRadius * .014);
    const spires = [
      [riseX, riseY - profile.coreRadius * .75, profile.coreRadius * .82],
      [riseX - towerWidth * .72, riseY * .55, profile.coreRadius * .46],
      [riseX + towerWidth * .66, riseY * .48, profile.coreRadius * .38],
    ];
    for (const [x, y, height] of spires) {
      ctx.beginPath();
      ctx.moveTo(x, y + height * .5);
      ctx.lineTo(x, y - height * .5);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.globalAlpha = .72 * pulse;
      ctx.beginPath();
      ctx.arc(x, y - height * .5, Math.max(1.5, profile.baseRadius * .016), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderStationDockingArms(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile) {
    const armCount = Math.max(3, profile.armCount);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < armCount; i += 1) {
      const angle = (Math.PI * 2 * i) / armCount;
      const unlocked = i < profile.unlockedPadCount && station.repairStageIndex >= 5;
      const broken = !profile.isClaimed || seededUnit(profile.seed, i + 120) < profile.damageLevel * 0.28;
      const inner = profile.ringRadius * 0.78;
      const outer = profile.outerRadius * (unlocked ? 1.02 : 0.84);
      ctx.strokeStyle = broken ? "rgba(70, 74, 78, 0.62)" : unlocked ? "rgba(110, 219, 143, 0.58)" : "rgba(92, 98, 104, 0.58)";
      ctx.lineWidth = profile.baseRadius * (unlocked ? 0.075 : 0.055);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();

      ctx.strokeStyle = "rgba(9, 13, 18, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderStationLandingPads(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const armCount = Math.max(3, profile.armCount);
    ctx.save();
    for (let i = 0; i < armCount; i += 1) {
      const angle = (Math.PI * 2 * i) / armCount;
      const unlocked = i < profile.unlockedPadCount && station.repairStageIndex >= 5;
      const radius = profile.outerRadius * (unlocked ? 1.08 : 0.9);
      const padW = profile.baseRadius * 0.28;
      const padH = profile.baseRadius * 0.16;
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.rotate(angle);
      ctx.fillStyle = unlocked ? "rgba(22, 34, 37, 0.9)" : "rgba(28, 30, 32, 0.64)";
      ctx.strokeStyle = unlocked ? "rgba(110, 219, 143, 0.68)" : "rgba(100, 106, 112, 0.4)";
      ctx.lineWidth = 3;
      roundRect(ctx, -padW / 2, -padH / 2, padW, padH, 8);
      ctx.fill();
      ctx.stroke();
      if (unlocked) {
        ctx.globalAlpha = 0.32 + Math.sin(options.now * 0.002 + i) * 0.08;
        ctx.strokeStyle = "rgba(76, 201, 240, 0.78)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-padW * 0.3, 0);
        ctx.lineTo(padW * 0.3, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private renderStationModules(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    ctx.save();
    if (station.repairStageIndex >= 2 || profile.repairProgress > 0.2) {
      this.renderCargoModule(ctx, profile, -Math.PI / 2, station.repairStageIndex >= 2);
      this.renderCargoModule(ctx, profile, Math.PI / 2, station.repairStageIndex >= 2);
    }
    if (station.repairStageIndex >= 3) {
      this.renderCraftingModule(ctx, profile, 0, options);
    }
    if (station.repairStageIndex >= 6) {
      this.renderCommandModule(ctx, profile, Math.PI, options);
    }
    if (hasStationVisualUpgrade(profile, "shield_dome")) {
      this.renderShieldGenerator(ctx, profile, -Math.PI / 4, options);
    }
    if (hasStationVisualUpgrade(profile, "repair_drone_bay")) {
      this.renderRepairDroneBay(ctx, profile, Math.PI / 4, options);
    }
    ctx.restore();
  }

  private renderStationDefenses(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const slotCount = Math.max(6, station.defenseSlots.length);
    ctx.save();
    for (let i = 0; i < slotCount; i += 1) {
      const angle = (Math.PI * 2 * i) / slotCount + Math.PI / slotCount;
      const unlocked = i < station.defenseSlots.filter((slot) => slot.unlocked).length;
      const radius = profile.outerRadius * 0.88;
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.rotate(angle);
      ctx.fillStyle = unlocked ? "rgba(28, 34, 38, 0.92)" : "rgba(28, 30, 32, 0.54)";
      ctx.strokeStyle = unlocked ? "rgba(218, 228, 236, 0.38)" : "rgba(100, 106, 112, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, profile.baseRadius * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (unlocked && profile.activeDefenseCategories.length) {
        this.renderDefenseWeapon(ctx, profile, i, options);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private renderStationCore(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const pulse = 0.5 + Math.sin(options.now * (profile.underAttack ? 0.008 : 0.0025) + profile.seed) * 0.5;
    const coreColor = profile.healthRatio <= 0.35 ? profile.warningColor : profile.coreColor;
    ctx.save();
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 12 + profile.repairProgress * 20 + pulse * 6;
    ctx.fillStyle = profile.darkMetalColor;
    ctx.strokeStyle = profile.isClaimed ? "rgba(110, 219, 143, 0.62)" : "rgba(180, 196, 210, 0.38)";
    ctx.lineWidth = profile.baseRadius * 0.045;
    drawPolygon(ctx, 0, 0, profile.coreRadius * 1.52, 8, Math.PI / 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = 0.58 + profile.repairProgress * 0.26 + pulse * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, profile.coreRadius * (0.64 + profile.repairProgress * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(242, 247, 251, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, profile.coreRadius * 0.95, 0, Math.PI * 2 * Math.max(0.12, station.health / station.maxHealth));
    ctx.stroke();
    if (hasStationVisualUpgrade(profile, "core_defense_matrix")) {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.72)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, profile.coreRadius * (1.95 + pulse * 0.12), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderStationDamageDetails(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, options: StationRenderOptions) {
    if (profile.damageLevel < 0.12 && !profile.underAttack) return;
    ctx.save();
    ctx.lineCap = "round";
    const crackCount = Math.round(4 + profile.damageLevel * 11);
    for (let i = 0; i < crackCount; i += 1) {
      const angle = seededUnit(profile.seed, i + 220) * Math.PI * 2;
      const start = profile.coreRadius * (1.1 + seededUnit(profile.seed, i + 240) * 1.5);
      const len = profile.baseRadius * (0.16 + seededUnit(profile.seed, i + 260) * 0.34);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(255, 107, 120, 0.62)" : "rgba(17, 20, 24, 0.64)";
      ctx.lineWidth = i % 3 === 0 ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
      ctx.lineTo(Math.cos(angle + 0.1) * (start + len), Math.sin(angle + 0.1) * (start + len));
      ctx.stroke();
    }
    const sparkCount = profile.underAttack ? 7 : Math.round(profile.damageLevel * 5);
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = seededUnit(profile.seed, i + 320) * Math.PI * 2;
      const radius = profile.ringRadius + seededUnit(profile.seed, i + 340) * profile.baseRadius * 0.38;
      const flicker = 0.35 + Math.sin(options.now * 0.011 + i * 4) * 0.35;
      ctx.globalAlpha = Math.max(0, flicker);
      ctx.strokeStyle = "rgba(255, 147, 92, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.lineTo(Math.cos(angle) * (radius + 18), Math.sin(angle) * (radius + 18));
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderStationLabel(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile) {
    ctx.save();
    ctx.fillStyle = profile.isClaimed ? "rgba(110, 219, 143, 0.9)" : "rgba(218, 228, 236, 0.78)";
    ctx.strokeStyle = "rgba(4, 7, 12, 0.86)";
    ctx.lineWidth = 4;
    ctx.font = "800 15px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = profile.isMothership ? `Mothership Core Lv ${station.level}` : profile.isClaimed ? `Claimed Spacecraft Lv ${station.level}` : "Derelict Spacecraft";
    const y = station.pos.y - profile.outerRadius - 46;
    ctx.strokeText(label, station.pos.x, y);
    ctx.fillText(label, station.pos.x, y);
    ctx.restore();
  }

  private renderMothershipThrusters(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    const speed = Math.hypot(station.vel.x, station.vel.y);
    const direction = speed > 0.001 ? Math.atan2(station.vel.y, station.vel.x) : 0;
    const hyperdrive = station.hyperdrive.hyperdriveState === "warping" || station.hyperdrive.isPhasedDuringWarp;
    ctx.save();
    ctx.rotate(direction);
    ctx.globalAlpha = hyperdrive ? 0.88 : 0.42;
    for (let i = 0; i < 3; i += 1) {
      const x = -profile.outerRadius * 0.72;
      const y = (i - 1) * profile.baseRadius * 0.24;
      const len = profile.baseRadius * ((hyperdrive ? 0.55 : 0.22) + Math.sin(options.now * 0.006 + i) * 0.04 + Math.min(0.18, speed / 1200));
      const gradient = ctx.createLinearGradient(x, y, x - len * 2.5, y);
      gradient.addColorStop(0, hyperdrive ? "rgba(255, 209, 102, 0.82)" : "rgba(122, 154, 168, 0.66)");
      gradient.addColorStop(1, hyperdrive ? "rgba(255, 209, 102, 0)" : "rgba(122, 154, 168, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = profile.baseRadius * (hyperdrive ? 0.075 : 0.045);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 2.5, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderHyperdriveChargeEffect(ctx: CanvasRenderingContext2D, station: Station, profile: StationVisualProfile, options: StationRenderOptions) {
    if (station.hyperdrive.hyperdriveState !== "charging" && station.hyperdrive.hyperdriveState !== "ready") return;
    const phase = (options.now * 0.0018) % (Math.PI * 2);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 209, 102, 0.58)";
    ctx.lineWidth = 4;
    ctx.setLineDash([36, 24]);
    ctx.lineDashOffset = -phase * 24;
    ctx.beginPath();
    ctx.arc(0, 0, profile.outerRadius * 1.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderArmorPlates(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, _options: StationRenderOptions) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.save();
      ctx.translate(Math.cos(angle) * profile.outerRadius * 0.72, Math.sin(angle) * profile.outerRadius * 0.72);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(180, 196, 210, 0.34)";
      ctx.strokeStyle = "rgba(242, 247, 251, 0.24)";
      roundRect(ctx, -profile.baseRadius * 0.14, -profile.baseRadius * 0.045, profile.baseRadius * 0.28, profile.baseRadius * 0.09, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderCargoModule(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, angle: number, online: boolean) {
    const x = Math.cos(angle) * profile.outerRadius * 0.62;
    const y = Math.sin(angle) * profile.outerRadius * 0.62;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = online ? "rgba(64, 73, 74, 0.92)" : "rgba(50, 53, 56, 0.6)";
    ctx.strokeStyle = online ? "rgba(255, 209, 102, 0.38)" : "rgba(100, 106, 112, 0.3)";
    ctx.lineWidth = 3;
    roundRect(ctx, -profile.baseRadius * 0.16, -profile.baseRadius * 0.18, profile.baseRadius * 0.32, profile.baseRadius * 0.36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(18, 23, 30, 0.62)";
    ctx.lineWidth = 2;
    [-0.08, 0.08].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(-profile.baseRadius * 0.12, offset * profile.baseRadius);
      ctx.lineTo(profile.baseRadius * 0.12, offset * profile.baseRadius);
      ctx.stroke();
    });
    ctx.restore();
  }

  private renderCraftingModule(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, angle: number, options: StationRenderOptions) {
    const x = Math.cos(angle) * profile.outerRadius * 0.64;
    const y = Math.sin(angle) * profile.outerRadius * 0.64;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(32, 45, 52, 0.94)";
    ctx.strokeStyle = "rgba(76, 201, 240, 0.48)";
    ctx.lineWidth = 3;
    drawPolygon(ctx, 0, 0, profile.baseRadius * 0.22, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.38 + Math.sin(options.now * 0.003) * 0.08;
    ctx.fillStyle = "rgba(76, 201, 240, 0.72)";
    ctx.fillRect(-profile.baseRadius * 0.1, -2, profile.baseRadius * 0.2, 4);
    ctx.restore();
  }

  private renderCommandModule(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, angle: number, options: StationRenderOptions) {
    const x = Math.cos(angle) * profile.outerRadius * 0.58;
    const y = Math.sin(angle) * profile.outerRadius * 0.58;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(255, 209, 102, 0.48)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, profile.baseRadius * (0.16 + Math.sin(options.now * 0.002) * 0.01), 0, Math.PI * 1.65);
    ctx.stroke();
    ctx.fillStyle = "rgba(39, 40, 36, 0.9)";
    drawPolygon(ctx, 0, 0, profile.baseRadius * 0.12, 3, -Math.PI / 2);
    ctx.fill();
    ctx.restore();
  }

  private renderShieldGenerator(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, angle: number, options: StationRenderOptions) {
    const x = Math.cos(angle) * profile.outerRadius * 0.72;
    const y = Math.sin(angle) * profile.outerRadius * 0.72;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(76, 201, 240, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, profile.baseRadius * (0.12 + Math.sin(options.now * 0.003) * 0.01), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(76, 201, 240, 0.28)";
    ctx.beginPath();
    ctx.arc(0, 0, profile.baseRadius * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderRepairDroneBay(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, angle: number, options: StationRenderOptions) {
    const x = Math.cos(angle) * profile.outerRadius * 0.72;
    const y = Math.sin(angle) * profile.outerRadius * 0.72;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(36, 48, 42, 0.9)";
    ctx.strokeStyle = "rgba(110, 219, 143, 0.52)";
    roundRect(ctx, -profile.baseRadius * 0.13, -profile.baseRadius * 0.08, profile.baseRadius * 0.26, profile.baseRadius * 0.16, 6);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const orbit = profile.baseRadius * 0.25;
      const a = options.now * 0.0015 + i * Math.PI * 2 / 3;
      ctx.fillStyle = "rgba(110, 219, 143, 0.72)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * orbit, Math.sin(a) * orbit, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderDefenseWeapon(ctx: CanvasRenderingContext2D, profile: StationVisualProfile, index: number, options: StationRenderOptions) {
    const categories = profile.activeDefenseCategories;
    const category = categories[index % categories.length];
    const size = profile.baseRadius * 0.08;
    ctx.strokeStyle = "rgba(242, 247, 251, 0.62)";
    ctx.fillStyle = "rgba(18, 23, 30, 0.96)";
    ctx.lineWidth = 2;
    if (category === "missile_defense") {
      [-1, 1].forEach((side) => {
        roundRect(ctx, -size * 0.35, side * size * 0.15 - size * 0.18, size * 1.15, size * 0.32, 3);
        ctx.fill();
        ctx.stroke();
      });
    } else if (category === "core_defense_matrix") {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.78)";
      ctx.beginPath();
      ctx.arc(0, 0, size * (0.85 + Math.sin(options.now * 0.004) * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 1.55, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, points: number, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < points; i += 1) {
    const angle = rotation + (Math.PI * 2 * i) / points;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
