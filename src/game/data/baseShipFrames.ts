import type { StatKey } from "./stats";
import type { ModuleSlotType } from "./stationTypes";

export type BaseFrameType = "balanced";

export type BaseShipFrame = {
  id: BaseFrameType;
  name: string;
  role: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  recommendedPlaystyle: string;
  statBias: {
    healthMultiplier: number;
    shieldMultiplier: number;
    bodyDamageMultiplier: number;
    movementMultiplier: number;
    accelerationMultiplier: number;
  };
  slotBias: Partial<Record<ModuleSlotType | "flex", number>>;
  visualTheme: {
    primary: string;
    accent: string;
    glow: string;
  };
  upgradeScaling: Partial<Record<StatKey, number>>;
  frameBonuses: string[];
};

export const BASE_SHIP_FRAMES: BaseShipFrame[] = [
  {
    id: "balanced",
    name: "Base Spacecraft",
    role: "Universal hull",
    description: "The single universal hull. Levels improve its core systems while evolution changes its mounted equipment.",
    strengths: ["Stable health and shield", "Good movement", "Flexible module growth"],
    weaknesses: ["No extreme specialization"],
    recommendedPlaystyle: "Best for players who want to farm, fight, and build safely before choosing a deeper role.",
    statBias: { healthMultiplier: 1.05, shieldMultiplier: 1.05, bodyDamageMultiplier: 1, movementMultiplier: 1.05, accelerationMultiplier: 1 },
    slotBias: { flex: 1 },
    visualTheme: { primary: "#2fbce1", accent: "#eef7ff", glow: "#4cc9f0" },
    upgradeScaling: {
      autonomousRepair: 1.05,
      maxHealth: 1.05,
      bulletPenetration: 1.05,
      bodyDamage: 1.05,
      movementSpeed: 1.05,
      bulletSpeed: 1.05,
      bulletDamage: 1.05,
      reloadSpeed: 1.05,
    },
    frameBonuses: ["Universal hull", "Level-based core tuning", "Evolution-mounted equipment"],
  },
];

export function getBaseShipFrame(frameId: BaseFrameType | string | null | undefined) {
  return BASE_SHIP_FRAMES.find((frame) => frame.id === frameId) ?? BASE_SHIP_FRAMES[0];
}

export function getBaseFrameUpgradeMultiplier(frame: BaseShipFrame, statKey: StatKey) {
  return frame.upgradeScaling[statKey] ?? 1;
}
