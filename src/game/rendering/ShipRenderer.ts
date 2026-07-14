import type { Customization } from "../types";
import type { ShipVisualProfile } from "./ShipVisualProfiles";
import { drawShipEffects } from "./ShipEffectsRenderer";

type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  rotation: number;
  visualProfile: ShipVisualProfile;
  playerCustomization?: Customization;
  animationTime: number;
};

export class ShipRenderer {
  drawShip(args: DrawArgs) {
    const { ctx, x, y, rotation, visualProfile: profile, playerCustomization, animationTime } = args;
    const baseRadius = 24 * profile.sizeScale;
    const primary = playerCustomization?.shipColor ?? profile.primaryColor;
    const glow = playerCustomization?.glowColor ?? profile.glowColor;
    const accent = playerCustomization?.projectileColor ?? profile.accentColor;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = glow;
    ctx.shadowBlur = 3 + profile.detailLevel * 0.8;
    drawShipEffects(ctx, profile, baseRadius, animationTime);
    if (profile.variantType.toString().startsWith("mother")) this.drawMothership(ctx, profile, baseRadius, primary, accent);
    else if (profile.branch === "Core") this.drawBaseShip(ctx, profile, baseRadius, primary, accent, animationTime);
    else this.drawBranchShip(ctx, profile, baseRadius, primary, accent);
    this.drawBuildIdentity(ctx, profile, baseRadius, animationTime);
    this.drawWeaponMounts(ctx, profile, baseRadius, accent);
    ctx.restore();
  }

  private drawBaseShip(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, r: number, primary: string, accent: string, animationTime: number) {
    // The starter craft is intentionally more detailed than the old six-point
    // polygon. Its silhouette and material language follow the Base Ship
    // concept: a compact armored fuselage, long swept wings, inset cyan systems,
    // warm service lights, and a powerful exposed ion engine.
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const reactorPulse = .72 + Math.sin(animationTime * .0022) * .18;
    this.drawBaseShipEngine(ctx, r, profile.glowColor, animationTime);

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

    const wingGradient = ctx.createLinearGradient(-r * .72, 0, r * .65, 0);
    wingGradient.addColorStop(0, "#101820");
    wingGradient.addColorStop(.48, "#56636c");
    wingGradient.addColorStop(.76, "#b8c1c7");
    wingGradient.addColorStop(1, "#333e47");
    ctx.fillStyle = wingGradient;
    ctx.strokeStyle = "#111b24";
    ctx.lineWidth = Math.max(1.5, r * .065);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * .52, side * r * .27);
      ctx.lineTo(r * .08, side * r * .48);
      ctx.lineTo(-r * .52, side * r * 1.18);
      ctx.lineTo(-r * 1.02, side * r * 1.06);
      ctx.lineTo(-r * .52, side * r * .29);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reinforced leading edge and panel breaks keep the wings readable at
      // gameplay scale without relying on a large texture.
      ctx.strokeStyle = "rgba(220,232,239,.55)";
      ctx.lineWidth = Math.max(1, r * .025);
      ctx.beginPath();
      ctx.moveTo(r * .34, side * r * .34);
      ctx.lineTo(-r * .52, side * r * 1.03);
      ctx.lineTo(-r * .83, side * r * .96);
      ctx.stroke();
      ctx.strokeStyle = "rgba(8,15,21,.75)";
      ctx.beginPath();
      ctx.moveTo(-r * .13, side * r * .5);
      ctx.lineTo(-r * .39, side * r * .73);
      ctx.moveTo(-r * .47, side * r * .34);
      ctx.lineTo(-r * .67, side * r * .72);
      ctx.stroke();
    }

    // Dark mechanical undercarriage visible around the main armored shell.
    ctx.fillStyle = "#111a22";
    ctx.strokeStyle = "#070d12";
    ctx.lineWidth = Math.max(1.5, r * .055);
    ctx.beginPath();
    ctx.moveTo(r * 1.29, 0);
    ctx.bezierCurveTo(r * .93, -r * .39, -r * .37, -r * .5, -r * .91, -r * .3);
    ctx.lineTo(-r * 1.08, 0);
    ctx.lineTo(-r * .91, r * .3);
    ctx.bezierCurveTo(-r * .37, r * .5, r * .93, r * .39, r * 1.29, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const hullGradient = ctx.createLinearGradient(0, -r * .48, 0, r * .48);
    hullGradient.addColorStop(0, "#eff3f5");
    hullGradient.addColorStop(.2, "#8e9aa3");
    hullGradient.addColorStop(.48, "#38434c");
    hullGradient.addColorStop(.72, "#aeb8be");
    hullGradient.addColorStop(1, "#29343d");
    ctx.fillStyle = hullGradient;
    ctx.strokeStyle = "#17232c";
    ctx.lineWidth = Math.max(1.5, r * .06);
    ctx.beginPath();
    ctx.moveTo(r * 1.34, 0);
    ctx.bezierCurveTo(r * 1.06, -r * .22, r * .68, -r * .36, r * .12, -r * .39);
    ctx.bezierCurveTo(-r * .35, -r * .43, -r * .73, -r * .31, -r * .94, -r * .17);
    ctx.lineTo(-r * 1.04, 0);
    ctx.lineTo(-r * .94, r * .17);
    ctx.bezierCurveTo(-r * .73, r * .31, -r * .35, r * .43, r * .12, r * .39);
    ctx.bezierCurveTo(r * .68, r * .36, r * 1.06, r * .22, r * 1.34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Raised dorsal spine and cockpit canopy.
    const spineGradient = ctx.createLinearGradient(-r * .62, 0, r * 1.12, 0);
    spineGradient.addColorStop(0, "#26323b");
    spineGradient.addColorStop(.42, "#7c8992");
    spineGradient.addColorStop(.75, "#d6dde1");
    spineGradient.addColorStop(1, "#58656d");
    ctx.fillStyle = spineGradient;
    ctx.strokeStyle = "rgba(9,17,24,.9)";
    ctx.lineWidth = Math.max(1, r * .035);
    ctx.beginPath();
    ctx.moveTo(r * 1.16, 0);
    ctx.lineTo(r * .76, -r * .17);
    ctx.lineTo(-r * .53, -r * .2);
    ctx.lineTo(-r * .72, 0);
    ctx.lineTo(-r * .53, r * .2);
    ctx.lineTo(r * .76, r * .17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const canopy = ctx.createRadialGradient(r * .45, -r * .06, 0, r * .45, 0, r * .25);
    canopy.addColorStop(0, "#d9fbff");
    canopy.addColorStop(.25, accent);
    canopy.addColorStop(.62, "#1d7696");
    canopy.addColorStop(1, "#071722");
    ctx.fillStyle = canopy;
    ctx.strokeStyle = "#bdefff";
    ctx.shadowColor = profile.glowColor;
    ctx.shadowBlur = r * (.16 + reactorPulse * .1);
    ctx.beginPath();
    ctx.ellipse(r * .47, 0, r * .22, r * .145, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawBaseShipArmorDetail(ctx, r, primary, profile.glowColor, animationTime);
    ctx.restore();
  }

  private drawBaseShipEngine(ctx: CanvasRenderingContext2D, r: number, glow: string, animationTime: number) {
    ctx.save();
    const breath = .5 + Math.sin(animationTime * .00235) * .5;
    const tremor = Math.sin(animationTime * .011) * .035 + Math.sin(animationTime * .017) * .018;
    const plumeLength = 1.72 + breath * .34 + tremor;
    const plumeWidth = .085 + breath * .045;

    for (const side of [-1, 1]) {
      const y = side * r * .17;
      const phase = animationTime * .00235 + (side > 0 ? .34 : 0);
      const localBreath = .56 + Math.sin(phase) * .18;
      const tailX = -r * (plumeLength + (side > 0 ? .04 : 0));
      const plume = ctx.createLinearGradient(tailX, y, -r * .72, y);
      plume.addColorStop(0, "rgba(62,186,255,0)");
      plume.addColorStop(.27, "rgba(56,184,255,.16)");
      plume.addColorStop(.72, glow);
      plume.addColorStop(1, "#f2fdff");
      ctx.fillStyle = plume;
      ctx.globalAlpha = .68 + localBreath * .28;
      ctx.shadowColor = glow;
      ctx.shadowBlur = r * (.3 + breath * .28);
      ctx.beginPath();
      ctx.moveTo(-r * .79, y - r * plumeWidth);
      ctx.bezierCurveTo(-r * 1.15, y - r * plumeWidth * 1.15, tailX + r * .18, y - r * .16, tailX, y);
      ctx.bezierCurveTo(tailX + r * .18, y + r * .16, -r * 1.15, y + r * plumeWidth * 1.15, -r * .79, y + r * plumeWidth);
      ctx.closePath();
      ctx.fill();

      // A handful of traveling ion motes keeps the exhaust alive at idle.
      ctx.fillStyle = "#bff5ff";
      for (let i = 0; i < 3; i += 1) {
        const travel = (animationTime * .00072 + i * .31 + (side > 0 ? .17 : 0)) % 1;
        const px = -r * (.98 + travel * (plumeLength - .84));
        const py = y + Math.sin(animationTime * .006 + i * 2.1 + side) * r * .055 * travel;
        ctx.globalAlpha = (1 - travel) * .62;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(.7, r * (.018 + (1 - travel) * .012)), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#101a22";
      ctx.strokeStyle = "#8fabb9";
      ctx.lineWidth = Math.max(1, r * .035);
      ctx.beginPath();
      ctx.ellipse(-r * .88, y, r * .17, r * .15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const core = ctx.createRadialGradient(-r * .93, y, 0, -r * .93, y, r * .12);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(.32, "#dffaff");
      core.addColorStop(.7, glow);
      core.addColorStop(1, "#126486");
      ctx.fillStyle = core;
      ctx.shadowColor = glow;
      ctx.shadowBlur = r * (.25 + localBreath * .34);
      ctx.beginPath();
      ctx.ellipse(-r * .93, y, r * (.075 + localBreath * .012), r * (.085 + localBreath * .015), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBaseShipArmorDetail(ctx: CanvasRenderingContext2D, r: number, primary: string, glow: string, animationTime: number) {
    ctx.save();
    ctx.lineWidth = Math.max(1, r * .022);
    ctx.strokeStyle = "rgba(8,15,21,.7)";
    [-.55, -.22, .12, .48, .82].forEach((x, index) => {
      const half = (.29 - Math.abs(x - .08) * .07) * r;
      ctx.beginPath();
      ctx.moveTo(x * r, -half);
      ctx.lineTo((x + .08) * r, 0);
      ctx.lineTo(x * r, half);
      ctx.stroke();
      if (index < 4) {
        ctx.beginPath();
        ctx.moveTo((x + .08) * r, 0);
        ctx.lineTo((x + .24) * r, 0);
        ctx.stroke();
      }
    });

    // Custom ship color is retained as restrained hull trim instead of making
    // the whole craft look like a flat neon polygon.
    ctx.strokeStyle = primary;
    ctx.globalAlpha = .8;
    ctx.lineWidth = Math.max(1.2, r * .04);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * .42, side * r * .24);
      ctx.lineTo(r * .23, side * r * .29);
      ctx.stroke();
    }

    const systemPulse = .66 + Math.sin(animationTime * .0031) * .22;
    ctx.globalAlpha = systemPulse;
    ctx.fillStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * (.12 + systemPulse * .22);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(-r * .22, side * r * .29 - r * .035, r * .27, r * .07, r * .02);
      ctx.fill();

      // Energy appears to travel out through the long wing channels.
      const travel = (animationTime * .00055 + (side > 0 ? .42 : 0)) % 1;
      const wingX = r * (.08 - travel * .72);
      const wingY = side * r * (.46 + travel * .5);
      ctx.globalAlpha = .35 + (1 - Math.abs(.5 - travel) * 2) * .65;
      ctx.beginPath();
      ctx.roundRect(wingX - r * .08, wingY - r * .025, r * .16, r * .05, r * .02);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Independently phased blue status lights make the hull read as a powered
    // machine rather than a single uniformly glowing icon.
    const leds: Array<[number, number, number]> = [
      [-.58, -.28, 0], [-.58, .28, .9], [-.2, -.36, 1.8], [-.2, .36, 2.7],
      [.2, -.34, 3.6], [.2, .34, 4.5], [.78, -.18, 5.4], [.78, .18, 6.3],
    ];
    for (const [x, y, phase] of leds) {
      const ledPulse = .42 + (.5 + Math.sin(animationTime * .0042 + phase) * .5) * .58;
      ctx.globalAlpha = ledPulse;
      ctx.fillStyle = "#9eeeff";
      ctx.shadowColor = glow;
      ctx.shadowBlur = r * (.08 + ledPulse * .18);
      ctx.beginPath();
      ctx.arc(x * r, y * r, Math.max(1, r * .035), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff9b37";
    [[-.69, -.2], [-.69, .2], [.72, -.19], [.72, .19]].forEach(([x, y], index) => {
      ctx.globalAlpha = .56 + (.5 + Math.sin(animationTime * .002 + index * 1.4) * .5) * .36;
      ctx.beginPath();
      ctx.roundRect(x * r, y * r - r * .025, r * .12, r * .05, r * .02);
      ctx.fill();
    });
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
