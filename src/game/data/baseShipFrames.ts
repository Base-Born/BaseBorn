import type { StatKey } from "./stats";
import type { ModuleSlotType } from "./stationTypes";

export type BaseFrameType = "balanced" | "tank" | "speed" | "tech";

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
    name: "Balanced Ship",
    role: "Generalist frame",
    description: "A reliable base frame with no major weakness and flexible growth.",
    strengths: ["Stable health and shield", "Good movement", "Flexible module growth"],
    weaknesses: ["No extreme specialization"],
    recommendedPlaystyle: "Best for players who want to farm, fight, and build safely before choosing a deeper role.",
    statBias: { healthMultiplier: 1.05, shieldMultiplier: 1.05, bodyDamageMultiplier: 1, movementMultiplier: 1.05, accelerationMultiplier: 1 },
    slotBias: { flex: 1 },
    visualTheme: { primary: "#2fbce1", accent: "#eef7ff", glow: "#4cc9f0" },
    upgradeScaling: {
      autonomousRepair: 1.05,
      maxHealth: 1.05,
      maxShield: 1.05,
      bodyDamage: 1.05,
      movementSpeed: 1.05,
      bulletSpeed: 1.05,
      bulletDamage: 1.05,
      reloadSpeed: 1.05,
    },
    frameBonuses: ["+5% health", "+5% shield", "+5% movement", "+5% upgrade efficiency"],
  },
  {
    id: "tank",
    name: "Tank Ship",
    role: "Defensive frame",
    description: "A heavy platform with stronger hull, shields, and collision presence.",
    strengths: ["High durability", "Stronger ram damage", "Better defensive scaling"],
    weaknesses: ["Slower movement", "Less evasive"],
    recommendedPlaystyle: "Best for players who want to survive longer fights, body-block, and build defensive modules.",
    statBias: { healthMultiplier: 1.25, shieldMultiplier: 1.2, bodyDamageMultiplier: 1.15, movementMultiplier: 0.9, accelerationMultiplier: 0.92 },
    slotBias: { defense: 1 },
    visualTheme: { primary: "#aeb8c3", accent: "#68a7ff", glow: "#b7c7d8" },
    upgradeScaling: {
      maxHealth: 1.2,
      maxShield: 1.15,
      bodyDamage: 1.15,
      movementSpeed: 0.9,
    },
    frameBonuses: ["+25% health", "+20% shield", "+15% body damage", "-10% movement"],
  },
  {
    id: "speed",
    name: "Speed Ship",
    role: "Mobility frame",
    description: "A light frame with stronger thrust, better escape tools, and faster farming routes.",
    strengths: ["High movement speed", "Stronger acceleration", "Better bullet/drone speed scaling"],
    weaknesses: ["Lower health", "Slightly lower shield"],
    recommendedPlaystyle: "Best for hit-and-run combat, dodging, fast mining routes, and aggressive movement builds.",
    statBias: { healthMultiplier: 0.9, shieldMultiplier: 0.95, bodyDamageMultiplier: 1, movementMultiplier: 1.22, accelerationMultiplier: 1.15 },
    slotBias: { engine: 1 },
    visualTheme: { primary: "#5ed0ef", accent: "#91e8a8", glow: "#4cc9f0" },
    upgradeScaling: {
      movementSpeed: 1.25,
      bulletSpeed: 1.1,
      maxHealth: 0.9,
    },
    frameBonuses: ["+22% movement", "+15% acceleration", "stronger thruster visuals", "-10% health"],
  },
  {
    id: "tech",
    name: "Tech Ship",
    role: "Equipment frame",
    description: "A build-heavy platform with more module flexibility and stronger module scaling.",
    strengths: ["Best module scaling", "Extra utility capacity", "Strong weapon/drone compatibility"],
    weaknesses: ["Slightly lower raw health"],
    recommendedPlaystyle: "Best for players who want complex weapon sets, drones, crafted modules, and utility builds.",
    statBias: { healthMultiplier: 0.95, shieldMultiplier: 1, bodyDamageMultiplier: 1, movementMultiplier: 1, accelerationMultiplier: 1 },
    slotBias: { weapon: 1, utility: 1 },
    visualTheme: { primary: "#a78bfa", accent: "#4cc9f0", glow: "#b58cff" },
    upgradeScaling: {
      bulletSpeed: 1.15,
      bulletDamage: 1.15,
      reloadSpeed: 1.15,
      maxHealth: 0.95,
    },
    frameBonuses: ["+module capacity", "+15% module scaling", "+utility slots", "-5% health"],
  },
];

export function getBaseShipFrame(frameId: BaseFrameType | string | null | undefined) {
  return BASE_SHIP_FRAMES.find((frame) => frame.id === frameId) ?? BASE_SHIP_FRAMES[0];
}

export function getBaseFrameUpgradeMultiplier(frame: BaseShipFrame, statKey: StatKey) {
  return frame.upgradeScaling[statKey] ?? 1;
}
