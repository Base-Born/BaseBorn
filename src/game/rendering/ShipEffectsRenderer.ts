import type { ShipVisualProfile } from "./ShipVisualProfiles";

export function drawShipEffects(ctx: CanvasRenderingContext2D, profile: ShipVisualProfile, radius: number, animationTime: number) {
  const pulse = 0.5 + Math.sin(animationTime * 0.004) * 0.5;
  if (profile.shieldStyle) {
    ctx.save();
    ctx.strokeStyle = profile.shieldStyle === "fortress" ? "rgba(139,153,168,.28)" : profile.glowColor;
    ctx.globalAlpha = profile.variantType.toString().startsWith("mother") ? 0.28 : 0.16;
    ctx.lineWidth = profile.shieldStyle === "bubble" ? 2 : 1.5;
    ctx.setLineDash(profile.shieldStyle === "fortress" ? [10, 8] : []);
    ctx.beginPath();
    ctx.arc(0, 0, radius * (profile.variantType.toString().startsWith("mother") ? 2.1 : 1.45) * (1 + pulse * 0.025), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (profile.animationStyle === "electric") {
    ctx.save();
    ctx.strokeStyle = profile.accentColor;
    ctx.globalAlpha = 0.24 + pulse * 0.18;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i += 1) {
      const y = (i - 1) * radius * 0.42;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.2, y);
      ctx.lineTo(radius * 0.16, y + Math.sin(animationTime * 0.006 + i) * radius * 0.16);
      ctx.lineTo(radius * 0.44, y - Math.cos(animationTime * 0.005 + i) * radius * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }
}
