import type { Customization } from "../types";
import type { ShipVisualProfile } from "./ShipVisualProfiles";
import { drawShipEffects } from "./ShipEffectsRenderer";

type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  rotation: number;
  shipClassId?: string;
  visualProfile: ShipVisualProfile;
  playerCustomization?: Customization;
  animationTime: number;
};

export class ShipRenderer {
  private readonly spacecraftSprite: HTMLImageElement | null;
  private readonly spacePodSprite: HTMLImageElement | null;
  private spacecraftSpriteWithTransparency: HTMLCanvasElement | null = null;

  constructor() {
    if (typeof Image === "undefined") {
      this.spacecraftSprite = null;
      this.spacePodSprite = null;
      return;
    }
    this.spacecraftSprite = new Image();
    this.spacecraftSprite.decoding = "async";
    this.spacecraftSprite.addEventListener("load", () => this.prepareTransparentSpacecraftSprite());
    this.spacecraftSprite.src = "/assets/starter/claimed-spacecraft-no-gun.png?v=4";
    this.spacePodSprite = new Image();
    this.spacePodSprite.decoding = "async";
    this.spacePodSprite.src = "/assets/starter/space-pod.png?v=3";
  }

  drawShip(args: DrawArgs) {
    const { ctx, x, y, rotation, shipClassId, visualProfile: profile, playerCustomization, animationTime } = args;
    const baseRadius = 24 * profile.sizeScale;
    const primary = playerCustomization?.shipColor ?? profile.primaryColor;
    const glow = playerCustomization?.glowColor ?? profile.glowColor;
    const accent = playerCustomization?.projectileColor ?? profile.accentColor;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = glow;
    ctx.shadowBlur = 3 + profile.detailLevel * 0.8;
    if (shipClassId === "space_pod" || profile.id.startsWith("starter_pod")) {
      this.drawSpacePod(ctx, baseRadius, glow, animationTime, profile.buildIdentity?.thrusterTier ?? 0);
      ctx.restore();
      return;
    }
    drawShipEffects(ctx, profile, baseRadius, animationTime);
    if (profile.variantType.toString().startsWith("mother")) this.drawMothership(ctx, profile, baseRadius, primary, accent);
    // Every player evolution keeps the supplied modular spacecraft hull. The
    // weapon mounts change with the class; only non-player entities use the
    // procedural silhouettes below.
    else if (playerCustomization || profile.branch === "Core") this.drawBaseShip(ctx, profile, baseRadius, animationTime);
    else this.drawBranchShip(ctx, profile, baseRadius, primary, accent);
    this.drawBuildIdentity(ctx, profile, baseRadius, animationTime);
    this.drawWeaponMounts(ctx, profile, baseRadius, accent);
    ctx.restore();
  }

  private prepareTransparentSpacecraftSprite() {
    if (!this.spacecraftSprite?.naturalWidth || typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = this.spacecraftSprite.naturalWidth;
    canvas.height = this.spacecraftSprite.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(this.spacecraftSprite, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue = new Int32Array(canvas.width * canvas.height);
    let head = 0;
    let tail = 0;
    const addBackgroundPixel = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      const pixelIndex = y * canvas.width + x;
      if (visited[pixelIndex]) return;
      const channelIndex = pixelIndex * 4;
      if (pixels[channelIndex] > 18 || pixels[channelIndex + 1] > 18 || pixels[channelIndex + 2] > 18) return;
      visited[pixelIndex] = 1;
      queue[tail++] = pixelIndex;
    };
    for (let x = 0; x < canvas.width; x += 1) {
      addBackgroundPixel(x, 0);
      addBackgroundPixel(x, canvas.height - 1);
    }
    for (let y = 1; y < canvas.height - 1; y += 1) {
      addBackgroundPixel(0, y);
      addBackgroundPixel(canvas.width - 1, y);
    }
    while (head < tail) {
      const pixelIndex = queue[head++];
      pixels[pixelIndex * 4 + 3] = 0;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      addBackgroundPixel(x - 1, y);
      addBackgroundPixel(x + 1, y);
      addBackgroundPixel(x, y - 1);
      addBackgroundPixel(x, y + 1);
    }
    context.putImageData(image, 0, 0);
    this.spacecraftSpriteWithTransparency = canvas;
  }

  private drawSpacePod(ctx: CanvasRenderingContext2D, r: number, glow: string, animationTime: number, thrusterTier: number) {
    const spriteReady = Boolean(this.spacePodSprite?.complete && this.spacePodSprite.naturalWidth > 0);
    const pulse = 0.72 + Math.sin(animationTime * 0.004) * 0.16;
    ctx.save();
    ctx.rotate(Math.PI / 2);
    if (spriteReady && this.spacePodSprite) {
      const height = r * 4.55;
      const width = height * (this.spacePodSprite.naturalWidth / this.spacePodSprite.naturalHeight);
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = r * 0.34;
      ctx.drawImage(this.spacePodSprite, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = "#d8dcdd";
      ctx.strokeStyle = "#19242b";
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, -r * 2.1);
      ctx.bezierCurveTo(r, -r * 1.35, r, r * 1.25, 0, r * 2.15);
      ctx.bezierCurveTo(-r, r * 1.25, -r, -r * 1.35, 0, -r * 2.1);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    this.drawPodThrusterHardware(ctx, r, glow, thrusterTier, animationTime);

    // A compact nose emitter makes the pod's mining tool readable without
    // changing the supplied hull silhouette.
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#dffcff";
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 0.55;
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.arc(r * 1.64, 0, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawPodThrusterHardware(ctx: CanvasRenderingContext2D, r: number, glow: string, tier: number, animationTime: number) {
    const level = Math.max(0, Math.min(3, Math.floor(tier)));
    if (level <= 0) return;
    const pulse = 0.72 + Math.sin(animationTime * 0.004 + level) * 0.16;
    ctx.save();
    ctx.strokeStyle = glow;
    ctx.fillStyle = "rgba(223,252,255,.86)";
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * (0.18 + level * 0.05);
    ctx.lineWidth = Math.max(1.2, r * 0.025);
    for (let index = 0; index < level; index += 1) {
      const x = -r * (1.47 + index * 0.1);
      ctx.globalAlpha = pulse * (0.72 + index * 0.12);
      ctx.beginPath();
      ctx.ellipse(x, 0, r * 0.08, r * (0.2 + level * 0.018), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (level >= 2) {
      ctx.globalAlpha = pulse;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(-r * 1.48, side * r * 0.16, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBaseShip(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, animationTime: number) {
    // The recovered spacecraft asset is the single canonical player hull.
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const reactorPulse = .72 + Math.sin(animationTime * .0022) * .18;
    const spriteReady = Boolean(this.spacecraftSpriteWithTransparency);

    // A low, breathing reactor wash reaches the nearby armor without turning
    // the whole silhouette into a neon glow.
    ctx.save();
    ctx.globalAlpha = .13 + reactorPulse * .09;
    const reactorWash = ctx.createRadialGradient(-r * .48, 0, r * .04, -r * .48, 0, r * .92);
    reactorWash.addColorStop(0, profile.glowColor);
    reactorWash.addColorStop(.46, "rgba(44,172,225,.3)");
    reactorWash.addColorStop(1, "rgba(44,172,225,0)");
    ctx.fillStyle = reactorWash;
    ctx.beginPath();
    ctx.ellipse(-r * .48, 0, r * .98, r * .78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (spriteReady && this.spacecraftSpriteWithTransparency) {
      const spriteSize = r * 4.7;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.92)";
      ctx.shadowBlur = r * .3;
      // Source artwork faces upward; gameplay forward is positive X.
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(this.spacecraftSpriteWithTransparency, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
      this.drawBaseShipSpriteLighting(ctx, r, profile.glowColor, animationTime);
      ctx.restore();
      return;
    }

    // Lightweight fallback matches the new round spacecraft silhouette. It is
    // intentionally not a second ship design, so a slow image request cannot
    // flash the retired winged craft.
    ctx.fillStyle = "#d8dde0";
    ctx.strokeStyle = "#17232c";
    ctx.lineWidth = Math.max(1.5, r * .08);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#222c33";
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = profile.glowColor;
    ctx.globalAlpha = reactorPulse;
    ctx.beginPath();
    ctx.arc(0, 0, r * .78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  private drawBaseShipSpriteLighting(ctx: CanvasRenderingContext2D, r: number, glow: string, animationTime: number) {
    const pulse = .66 + Math.sin(animationTime * .0023) * .16;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "#dffcff";
    ctx.strokeStyle = glow;
    ctx.shadowColor = glow;
    ctx.lineWidth = Math.max(1, r * .025);

    // Keep the supplied hull readable with restrained, embedded status lights.
    // No orbit, shield circle, or traveling particles are added around it.
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      const ledPulse = pulse * (.74 + Math.sin(animationTime * .003 + index) * .12);
      ctx.globalAlpha = ledPulse;
      ctx.shadowBlur = r * .12;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r * .9, Math.sin(angle) * r * .9, Math.max(1, r * .025), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = pulse * .34;
    ctx.shadowBlur = r * .18;
    ctx.beginPath();
    ctx.arc(0, 0, r * .54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawBranchShip(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, primary: string, accent: string) {
    const heavy = profile.variantType === "heavy";
    const light = profile.variantType === "light";
    const nose = profile.hullShape === "rail" ? 1.95 : profile.hullShape === "fortress" ? 1.08 : profile.hullShape === "rounded" ? 1.14 : 1.42;
    const tail = profile.hullShape === "carrier" || heavy ? -1.16 : -1.28;
    const span = profile.wingShape === "needle" ? 0.48 : profile.wingShape === "armor" ? 1.12 : profile.wingShape === "wide" ? 1.08 : light ? 0.7 : 0.88;
    const points: [number, number][] = profile.hullShape === "fortress"
      ? [[nose, 0], [0.46, span], [-0.72, span * 0.74], [tail, 0.4], [tail, -0.4], [-0.72, -span * 0.74], [0.46, -span]]
      : profile.hullShape === "rounded"
        ? [[nose, 0], [0.26, span * 0.78], [-0.78, span * 0.68], [tail, 0.28], [tail, -0.28], [-0.78, -span * 0.68], [0.26, -span * 0.78]]
        : profile.hullShape === "carrier"
          ? [[nose, 0], [0.18, span], [-0.98, span * 0.9], [tail, 0.54], [tail * 0.82, 0], [tail, -0.54], [-0.98, -span * 0.9], [0.18, -span]]
          : [[nose, 0], [-0.28, span], [-0.52, 0.18], [tail, 0], [-0.52, -0.18], [-0.28, -span]];
    this.poly(ctx, points, r, primary, profile.glowColor);
    if (profile.detailLevel >= 3) this.armorLines(ctx, r, profile, accent);
    this.cockpit(ctx, r, profile.cockpitShape, accent);
    this.engine(ctx, r, profile.trailStyle, light ? 1.35 : heavy ? 0.8 : 1);
  }

  private drawBuildIdentity(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, animationTime: number) {
    const build = profile.buildIdentity;
    if (!build) return;
    const pulse = 0.65 + Math.sin(animationTime * 0.006) * 0.25;
    ctx.save();
    if (build.armorTier > 0) {
      ctx.strokeStyle = build.roleAccent;
      ctx.fillStyle = "rgba(185,199,211,.28)";
      ctx.lineWidth = 1.5 + Math.min(3, build.armorTier * 0.4);
      const plateCount = Math.min(4, 1 + build.armorTier);
      for (let i = 0; i < plateCount; i += 1) {
        const x = (-0.5 + i * 0.32) * r;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.roundRect(x - r * .18, side * r * (.48 + i % 2 * .08) - r * .1, r * .36, r * .2, r * .05);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    if (build.ramTier > 0) {
      ctx.fillStyle = build.roleAccent;
      ctx.globalAlpha = .5 + Math.min(.4, build.ramTier * .08);
      ctx.beginPath();
      ctx.moveTo(r * (1.35 + build.ramTier * .08), 0);
      ctx.lineTo(r * .72, r * .2);
      ctx.lineTo(r * .88, 0);
      ctx.lineTo(r * .72, -r * .2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const module of build.moduleGeometry) {
      const x = module.x * r, y = module.y * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = module.accent;
      ctx.strokeStyle = "#dff8ff";
      ctx.lineWidth = 1;
      ctx.shadowColor = module.accent;
      ctx.shadowBlur = 4;
      if (module.geometry === "barrel" || module.geometry === "drill") {
        ctx.fillRect(-r * .06, -r * .08, r * (module.geometry === "drill" ? .42 : .3), r * .16);
        if (module.geometry === "drill") { ctx.beginPath(); ctx.moveTo(r*.45,0); ctx.lineTo(r*.28,r*.15); ctx.lineTo(r*.28,-r*.15); ctx.closePath(); ctx.fill(); }
      } else if (module.geometry === "pod" || module.geometry === "tank") {
        ctx.beginPath(); ctx.roundRect(-r*.16,-r*.14,r*.34,r*.28,r*.07); ctx.fill(); ctx.stroke();
        if (module.geometry === "pod") { ctx.fillStyle="#08111d";ctx.fillRect(r*.05,-r*.09,r*.08,r*.06);ctx.fillRect(r*.05,r*.03,r*.08,r*.06); }
      } else if (module.geometry === "emitter") {
        ctx.beginPath(); ctx.arc(0,0,r*.13,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha=.28*pulse;ctx.beginPath();ctx.arc(0,0,r*.24,0,Math.PI*2);ctx.stroke();
      } else if (module.geometry === "thruster") {
        ctx.fillRect(-r*.16,-r*.11,r*.26,r*.22);ctx.globalAlpha=.45*pulse;ctx.fillStyle=module.accent;ctx.fillRect(-r*.42,-r*.06,r*.3,r*.12);
      } else {
        ctx.rotate(animationTime*.001);ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;const px=Math.cos(a)*r*.16,py=Math.sin(a)*r*.16;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.restore();
    }
    if (build.shieldTier > 0) {
      ctx.strokeStyle = build.roleAccent;
      ctx.globalAlpha = .16 + build.shieldTier * .025;
      ctx.lineWidth = 1 + build.shieldTier * .25;
      ctx.setLineDash(build.shieldTier >= 4 ? [r*.18,r*.1] : []);
      ctx.beginPath();ctx.arc(0,0,r*(1.35+build.shieldTier*.06),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    for (let i = 0; i < build.repairDroneCount; i += 1) {
      const a = animationTime * .0015 + i * Math.PI;
      const x = Math.cos(a) * r * 1.45, y = Math.sin(a) * r * .95;
      ctx.fillStyle="#6edb8f";ctx.beginPath();ctx.arc(x,y,r*.09,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.35;ctx.strokeStyle="#6edb8f";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x*.55,y*.55);ctx.stroke();ctx.globalAlpha=1;
    }
    const damage = { healthy:0, lightly_damaged:.2, damaged:.42, heavily_damaged:.68, critical:.9, destroyed:1 }[build.damageState];
    if (damage > 0) {
      ctx.strokeStyle = damage > .65 ? "#ff6b78" : "#ffb36b";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = .4 + damage * .45;
      const cracks = Math.ceil(damage * 6);
      for (let i=0;i<cracks;i+=1) {
        const seed=(i*1.618)%1;const x=(-.45+seed*.9)*r;const y=(i%2?1:-1)*(.12+seed*.38)*r;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+r*.12,y+(i%2?-.16:.16)*r);ctx.lineTo(x+r*.2,y+(i%3?-.05:.08)*r);ctx.stroke();
      }
      if (damage>.4) { ctx.fillStyle=damage>.68?"rgba(255,80,90,.6)":"rgba(255,180,90,.45)";for(let i=0;i<Math.ceil(damage*3);i++){const a=animationTime*.006+i*2.1;ctx.beginPath();ctx.arc(-r*.25+Math.cos(a)*r*.18,(i-1)*r*.24,r*.035*(1+pulse),0,Math.PI*2);ctx.fill();} }
    }
    ctx.restore();
  }
  drawMothership(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, primary: string, accent: string) {
    this.poly(ctx, this.getMothershipHullPoints(profile), r, primary, profile.glowColor);
    this.poly(ctx, this.getMothershipCorePoints(profile), r, profile.secondaryColor, accent, 0.86);
    this.drawMothershipCrown(ctx, profile, r, accent);
    ctx.fillStyle = accent;
    [-0.72, -0.32, 0.08].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x * r, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    });
    this.cockpit(ctx, r, "bridge", accent);
    this.engine(ctx, r, profile.trailStyle, 1.6);
  }

  private getMothershipHullPoints(profile: ShipVisualProfile): [number, number][] {
    const style = this.mothershipStyle(profile);
    const isLight = profile.variantType === "mother_light";
    const isHeavy = profile.variantType === "mother_heavy";
    const nose = (isLight ? 1.72 : isHeavy ? 1.04 : 1.34) + (style % 3) * 0.08;
    const fore = 0.74 - (style % 4) * 0.07;
    const mid = -0.12 - (style % 5) * 0.08;
    const rear = -0.84 - (style % 6) * 0.06;
    const tail = -1.34 - (style % 4) * 0.09;
    const span = (isLight ? 0.46 : isHeavy ? 0.88 : 0.66) + (style % 5) * 0.055;
    const rearSpan = span * (isHeavy ? 1.18 : isLight ? 0.78 : 1);
    const notch = -1.02 - (style % 3) * 0.11;

    switch (style % 13) {
      case 0: return [[nose, 0], [fore, span * 0.58], [mid, span], [rear, rearSpan * 0.72], [tail, span * 0.24], [notch, 0], [tail, -span * 0.24], [rear, -rearSpan * 0.72], [mid, -span], [fore, -span * 0.58]];
      case 1: return [[nose, 0], [0.52, span * 0.32], [0.28, span * 0.92], [-0.44, span * 0.68], [tail, span * 0.52], [notch, 0], [tail, -span * 0.52], [-0.44, -span * 0.68], [0.28, -span * 0.92], [0.52, -span * 0.32]];
      case 2: return [[nose * 0.92, 0], [0.58, span * 0.78], [-0.18, span * 1.04], [-0.78, span * 0.92], [tail, span * 0.34], [notch, 0], [tail, -span * 0.34], [-0.78, -span * 0.92], [-0.18, -span * 1.04], [0.58, -span * 0.78]];
      case 3: return [[nose, 0], [0.5, span * 0.4], [0.05, span * 0.52], [-0.12, span * 1.08], [tail, span * 0.72], [notch, 0], [tail, -span * 0.72], [-0.12, -span * 1.08], [0.05, -span * 0.52], [0.5, -span * 0.4]];
      case 4: return [[nose * 1.08, 0], [0.42, span * 0.32], [-0.18, span * 0.44], [-0.52, span * 0.9], [tail, span * 0.42], [notch, 0], [tail, -span * 0.42], [-0.52, -span * 0.9], [-0.18, -span * 0.44], [0.42, -span * 0.32]];
      case 5: return [[nose * 0.78, 0], [0.76, span * 0.96], [-0.16, span * 1.12], [-1.08, span * 0.86], [tail, span * 0.46], [notch, 0], [tail, -span * 0.46], [-1.08, -span * 0.86], [-0.16, -span * 1.12], [0.76, -span * 0.96]];
      case 6: return [[nose * 0.86, 0], [0.64, span * 0.58], [0.18, span * 1.16], [-0.42, span * 0.72], [tail, span * 0.92], [notch, 0], [tail, -span * 0.92], [-0.42, -span * 0.72], [0.18, -span * 1.16], [0.64, -span * 0.58]];
      case 7: return [[nose * 0.96, 0], [0.78, span * 0.38], [0.42, span * 0.86], [-0.38, span * 0.58], [tail, span * 0.34], [notch, 0], [tail, -span * 0.34], [-0.38, -span * 0.58], [0.42, -span * 0.86], [0.78, -span * 0.38]];
      case 8: return [[nose * 0.82, 0], [0.62, span * 0.76], [-0.08, span * 0.96], [-0.62, span * 0.62], [tail, span * 0.78], [notch, 0], [tail, -span * 0.78], [-0.62, -span * 0.62], [-0.08, -span * 0.96], [0.62, -span * 0.76]];
      case 9: return [[nose * 0.9, 0], [0.54, span * 0.54], [-0.3, span * 0.48], [-0.58, span * 1.08], [tail, span * 0.42], [notch, 0], [tail, -span * 0.42], [-0.58, -span * 1.08], [-0.3, -span * 0.48], [0.54, -span * 0.54]];
      case 10: return [[nose * 1.16, 0], [0.5, span * 0.22], [0.08, span * 0.42], [-0.24, span * 0.32], [tail, span * 0.22], [notch, 0], [tail, -span * 0.22], [-0.24, -span * 0.32], [0.08, -span * 0.42], [0.5, -span * 0.22]];
      case 11: return [[nose * 0.74, 0], [0.82, span], [0.0, span * 0.76], [-0.72, span * 1.04], [tail, span * 0.66], [notch, 0], [tail, -span * 0.66], [-0.72, -span * 1.04], [0.0, -span * 0.76], [0.82, -span]];
      default: return [[nose, 0], [0.46, span * 0.42], [0.14, span * 1.12], [-0.5, span * 0.62], [tail, span * 0.7], [notch, 0], [tail, -span * 0.7], [-0.5, -span * 0.62], [0.14, -span * 1.12], [0.46, -span * 0.42]];
    }
  }

  private getMothershipCorePoints(profile: ShipVisualProfile): [number, number][] {
    const style = this.mothershipStyle(profile);
    const width = profile.variantType === "mother_heavy" ? 0.56 : profile.variantType === "mother_light" ? 0.34 : 0.44;
    const length = 0.86 + (style % 4) * 0.06;
    return [[0.72, 0], [0.22, width], [-length, width * 0.82], [-length - 0.28, 0], [-length, -width * 0.82], [0.22, -width]];
  }

  private drawMothershipCrown(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, accent: string) {
    const style = this.mothershipStyle(profile);
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = profile.secondaryColor;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = Math.max(2, r * 0.035);
    if (style % 4 === 0) {
      ctx.beginPath();
      ctx.arc(-0.42 * r, 0, 0.42 * r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.42 * r, 0, 0.24 * r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (style % 4 === 1) {
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(-0.92 * r, side * 0.72 * r);
        ctx.lineTo(-1.26 * r, side * 1.12 * r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-1.34 * r, side * 1.18 * r, 0.08 * r, 0, Math.PI * 2);
        ctx.stroke();
      });
    } else if (style % 4 === 2) {
      ctx.fillRect(-1.18 * r, -0.52 * r, 0.26 * r, 1.04 * r);
      ctx.strokeRect(-1.18 * r, -0.52 * r, 0.26 * r, 1.04 * r);
      ctx.fillRect(0.24 * r, -0.42 * r, 0.18 * r, 0.84 * r);
      ctx.strokeRect(0.24 * r, -0.42 * r, 0.18 * r, 0.84 * r);
    } else {
      ctx.beginPath();
      ctx.moveTo(-0.32 * r, -0.88 * r);
      ctx.quadraticCurveTo(0.1 * r, 0, -0.32 * r, 0.88 * r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.76 * r, -0.7 * r);
      ctx.quadraticCurveTo(-0.46 * r, 0, -0.76 * r, 0.7 * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  private mothershipStyle(profile: ShipVisualProfile) {
    const order: Array<ShipVisualProfile["branch"]> = ["Rockets", "Laser", "Repair Beam", "Booster", "Speedster", "Tank", "Drones", "Machine Gun", "Force Field", "Mines", "Sniper", "Cannon", "Arc Lightning"];
    return Math.max(0, order.indexOf(profile.branch));
  }

  private drawWeaponMounts(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, accent: string) {
    ctx.save();
    ctx.lineWidth = Math.max(1.5, r * 0.045);
    ctx.strokeStyle = accent;
    ctx.fillStyle = profile.secondaryColor;
    for (const mount of profile.weaponMounts) {
      const sides = mount.mirror ? [1, -1] : [1];
      for (const side of sides) {
        const x = mount.x * r;
        const y = mount.y * side * r;
        ctx.save();
        ctx.translate(x, y);
        const s = mount.scale * r;
        if (mount.type === "pod" || mount.type === "mine" || mount.type === "bay") {
          ctx.fillRect(-s * 0.18, -s * 0.22, s * 0.54, s * 0.44);
          ctx.strokeRect(-s * 0.18, -s * 0.22, s * 0.54, s * 0.44);
        } else if (mount.type === "barrel") {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(s * 0.85, 0);
          ctx.stroke();
        } else if (mount.type === "lens" || mount.type === "ring") {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (mount.type === "coil") {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s * 0.28, 0, s * 0.14, 0, Math.PI * 2);
          ctx.stroke();
        } else if (mount.type === "thruster") {
          ctx.beginPath();
          ctx.moveTo(-s * 0.2, -s * 0.16);
          ctx.lineTo(s * 0.28, 0);
          ctx.lineTo(-s * 0.2, s * 0.16);
          ctx.stroke();
        } else {
          ctx.fillRect(-s * 0.2, -s * 0.14, s * 0.4, s * 0.28);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private poly(ctx: CanvasRenderingContext2D, points: [number, number][], r: number, fill: string, stroke: string, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.beginPath();
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x * r, y * r) : ctx.lineTo(x * r, y * r));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private cockpit(ctx: CanvasRenderingContext2D, r: number, shape: string, color: string) {
    ctx.save();
    ctx.fillStyle = "rgba(245,247,255,.82)";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, r * 0.025);
    if (shape === "bridge") ctx.roundRect(-r * 0.2, -r * 0.12, r * 0.52, r * 0.24, r * 0.06);
    else if (shape === "lens") ctx.ellipse(r * 0.38, 0, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
    else if (shape === "split") {
      ctx.ellipse(r * 0.16, -r * 0.14, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.16, r * 0.14, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    } else ctx.ellipse(r * 0.2, 0, r * 0.22, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private armorLines(ctx: CanvasRenderingContext2D, r: number, profile: ShipVisualProfile, accent: string) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = Math.max(1, r * 0.022);
    for (let i = 0; i < Math.min(5, profile.detailLevel); i += 1) {
      const x = (-0.62 + i * 0.28) * r;
      ctx.beginPath();
      ctx.moveTo(x, -r * 0.34);
      ctx.lineTo(x + r * 0.42, 0);
      ctx.lineTo(x, r * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  }

  private engine(ctx: CanvasRenderingContext2D, r: number, style: string, scale: number) {
    const color = style === "rocket" || style === "boost" ? "#c8793f" : style === "repair" ? "#76bf87" : style === "electric" ? "#8e80b8" : "#6faec6";
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.48;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, r * 0.05);
    [-0.22, 0.22].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(-r * 1.02, offset * r);
      ctx.lineTo(-r * (1.48 + scale * 0.2), offset * r);
      ctx.stroke();
    });
    ctx.restore();
  }
}
