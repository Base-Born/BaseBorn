import type { WeaponBranch, WeaponType } from "../data/shipUpgradeTree";

export type HullShapeType = "arrow" | "sleek" | "wide" | "rounded" | "fortress" | "carrier" | "rail" | "mothership";
export type WingShapeType = "none" | "delta" | "swept" | "wide" | "needle" | "armor" | "command";
export type CockpitShapeType = "line" | "dome" | "split" | "lens" | "bridge";
export type TrailStyleType = "ion" | "rocket" | "repair" | "boost" | "phase" | "heavy" | "electric";
export type ShieldStyleType = "bubble" | "ring" | "fortress";
export type ShipAnimationStyle = "idle" | "float" | "pulse" | "electric" | "command";
export type WeaponMountType = "pod" | "lens" | "arm" | "thruster" | "armor" | "bay" | "barrel" | "ring" | "mine" | "coil";

export type WeaponMountDefinition = {
  type: WeaponMountType;
  x: number;
  y: number;
  scale: number;
  mirror?: boolean;
};

export type BranchVisualLanguage = {
  weaponType: WeaponType;
  hullShape: HullShapeType;
  wingShape: WingShapeType;
  cockpitShape: CockpitShapeType;
  trailStyle: TrailStyleType;
  shieldStyle?: ShieldStyleType;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  mountType: WeaponMountType;
  tags: string[];
};

export const branchVisuals: Record<WeaponBranch | "Core", BranchVisualLanguage> = {
  Core: { weaponType: "plasma", hullShape: "arrow", wingShape: "delta", cockpitShape: "line", trailStyle: "ion", primaryColor: "#2fbce1", secondaryColor: "#263946", accentColor: "#eef7ff", glowColor: "#4cc9f0", mountType: "lens", tags: ["starter", "simple"] },
  Rockets: { weaponType: "rockets", hullShape: "wide", wingShape: "wide", cockpitShape: "split", trailStyle: "rocket", primaryColor: "#e07f3f", secondaryColor: "#633f2f", accentColor: "#ffd166", glowColor: "#ff935c", mountType: "pod", tags: ["missile", "wide", "burst"] },
  Laser: { weaponType: "laser", hullShape: "sleek", wingShape: "swept", cockpitShape: "lens", trailStyle: "ion", primaryColor: "#4cc9f0", secondaryColor: "#314f74", accentColor: "#d2c8ff", glowColor: "#68a7ff", mountType: "lens", tags: ["beam", "lens", "precision"] },
  "Repair Beam": { weaponType: "repair_beam", hullShape: "rounded", wingShape: "command", cockpitShape: "dome", trailStyle: "repair", shieldStyle: "ring", primaryColor: "#6edb8f", secondaryColor: "#2d6a50", accentColor: "#f0fff4", glowColor: "#76dc92", mountType: "arm", tags: ["support", "repair", "smooth"] },
  Booster: { weaponType: "booster", hullShape: "sleek", wingShape: "delta", cockpitShape: "line", trailStyle: "boost", primaryColor: "#e8b54d", secondaryColor: "#654a2e", accentColor: "#ff6b78", glowColor: "#ffd166", mountType: "thruster", tags: ["ram", "engine", "boost"] },
  Speedster: { weaponType: "speedster", hullShape: "sleek", wingShape: "needle", cockpitShape: "line", trailStyle: "phase", primaryColor: "#5ed0ef", secondaryColor: "#2b6f82", accentColor: "#91e8a8", glowColor: "#4cc9f0", mountType: "lens", tags: ["fast", "thin", "phase"] },
  Tank: { weaponType: "tank", hullShape: "fortress", wingShape: "armor", cockpitShape: "bridge", trailStyle: "heavy", shieldStyle: "fortress", primaryColor: "#aeb8c3", secondaryColor: "#303c49", accentColor: "#68a7ff", glowColor: "#b7c7d8", mountType: "armor", tags: ["armor", "heavy", "shield"] },
  Drones: { weaponType: "drones", hullShape: "carrier", wingShape: "command", cockpitShape: "bridge", trailStyle: "ion", shieldStyle: "ring", primaryColor: "#a78bfa", secondaryColor: "#315b6f", accentColor: "#4cc9f0", glowColor: "#b58cff", mountType: "bay", tags: ["carrier", "drone", "hive"] },
  "Machine Gun": { weaponType: "machine_gun", hullShape: "wide", wingShape: "wide", cockpitShape: "split", trailStyle: "ion", primaryColor: "#ffd166", secondaryColor: "#315b6f", accentColor: "#9edbf0", glowColor: "#d8a928", mountType: "barrel", tags: ["gatling", "barrels", "suppression"] },
  "Force Field": { weaponType: "force_field", hullShape: "rounded", wingShape: "command", cockpitShape: "dome", trailStyle: "ion", shieldStyle: "bubble", primaryColor: "#68a7ff", secondaryColor: "#41538a", accentColor: "#d2c8ff", glowColor: "#8fb5ff", mountType: "ring", tags: ["shield", "ring", "defense"] },
  Mines: { weaponType: "mines", hullShape: "carrier", wingShape: "armor", cockpitShape: "split", trailStyle: "heavy", primaryColor: "#d99a3e", secondaryColor: "#5f4166", accentColor: "#ffd166", glowColor: "#e8b54d", mountType: "mine", tags: ["mine", "rear", "trap"] },
  Sniper: { weaponType: "sniper", hullShape: "rail", wingShape: "needle", cockpitShape: "lens", trailStyle: "ion", primaryColor: "#d7e8f7", secondaryColor: "#355985", accentColor: "#9edbf0", glowColor: "#b7c7d8", mountType: "barrel", tags: ["railgun", "long", "precision"] },
  Cannon: { weaponType: "cannon", hullShape: "fortress", wingShape: "armor", cockpitShape: "bridge", trailStyle: "heavy", primaryColor: "#d95f5f", secondaryColor: "#343d48", accentColor: "#ffd166", glowColor: "#ff6b78", mountType: "barrel", tags: ["cannon", "siege", "recoil"] },
  "Arc Lightning": { weaponType: "arc_lightning", hullShape: "sleek", wingShape: "swept", cockpitShape: "lens", trailStyle: "electric", shieldStyle: "ring", primaryColor: "#9b7ef0", secondaryColor: "#3f386c", accentColor: "#9edbf0", glowColor: "#a78bfa", mountType: "coil", tags: ["coil", "electric", "storm"] },
};
