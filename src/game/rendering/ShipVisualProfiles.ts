import { branchVisuals, type CockpitShapeType, type HullShapeType, type ShieldStyleType, type ShipAnimationStyle, type TrailStyleType, type WeaponMountDefinition, type WingShapeType } from "./ShipModelDefinitions";
import { getShipNode, type ShipNode, type ShipVariantType, type WeaponBranch } from "../data/shipUpgradeTree";
import type { AlienDefenderType } from "../types";
import type { BuildVisualIdentity } from "./VehicleVisualProfile";

export type VisualVariantType = "base" | ShipVariantType;

export interface ShipVisualProfile {
  id: string;
  branch: WeaponBranch | "Core";
  levelRequired: number;
  tier: number;
  variantType: VisualVariantType;
  sizeScale: number;
  hullShape: HullShapeType;
  wingShape: WingShapeType;
  cockpitShape: CockpitShapeType;
  weaponMounts: WeaponMountDefinition[];
  glowColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  trailStyle: TrailStyleType;
  shieldStyle?: ShieldStyleType;
  animationStyle: ShipAnimationStyle;
  detailLevel: number;
  silhouetteTags: string[];
  buildIdentity?: BuildVisualIdentity;
}

const levelSize = new Map<number, number>([
  [1, 1],
  [15, 1.14],
  [30, 1.32],
  [45, 1.54],
  [60, 1.8],
  [75, 2.12],
  [90, 2.5],
  [100, 3.45],
]);

const variantScale: Record<VisualVariantType, number> = {
  base: 1,
  light: 1,
  balanced: 1.04,
  heavy: 1.08,
  mother_light: 1.18,
  mother_balanced: 1.36,
  mother_heavy: 1.56,
};

const hullCycle: HullShapeType[] = ["sleek", "wide", "rounded", "fortress", "carrier", "rail"];
const wingCycle: WingShapeType[] = ["delta", "swept", "wide", "needle", "armor", "command"];
const cockpitCycle: CockpitShapeType[] = ["line", "dome", "split", "lens", "bridge"];

function mountsFor(node: ShipNode): WeaponMountDefinition[] {
  const visual = branchVisuals[node.branch];
  const detail = Math.max(1, Math.min(6, node.tier - 1));
  const lane = node.laneIndex || 0;
  const light = node.variantType === "light" || node.variantType === "mother_light";
  const heavy = node.variantType === "heavy" || node.variantType === "mother_heavy";
  const mounts: WeaponMountDefinition[] = [{ type: visual.mountType, x: 0.4 + lane * 0.08, y: 0, scale: 0.78 + detail * 0.08 + (heavy ? 0.12 : 0) }];
  if (node.levelRequired >= 15) mounts.push({ type: visual.mountType, x: -0.12 - lane * 0.05, y: light ? 0.46 : heavy ? 0.76 : 0.62, scale: light ? 0.58 : heavy ? 0.84 : 0.72, mirror: true });
  if (node.levelRequired >= 45) mounts.push({ type: visual.mountType, x: -0.44 - lane * 0.05, y: light ? 0.7 : heavy ? 1.02 : 0.88, scale: light ? 0.5 : heavy ? 0.75 : 0.62, mirror: true });
  if (node.levelRequired >= 75) mounts.push({ type: visual.mountType, x: 0.08 + lane * 0.08, y: light ? 0.84 : heavy ? 1.22 : 1.02, scale: light ? 0.48 : heavy ? 0.72 : 0.58, mirror: true });
  if (node.levelRequired >= 100) {
    mounts.push({ type: visual.mountType, x: 0.74, y: 0.48, scale: 1, mirror: true });
    mounts.push({ type: "thruster", x: -0.9, y: 0.38, scale: 1.2, mirror: true });
  }
  return mounts;
}

function visualShapeFor(node: ShipNode, visual: typeof branchVisuals[WeaponBranch | "Core"]) {
  if (node.branch === "Core") {
    return { hullShape: visual.hullShape, wingShape: visual.wingShape, cockpitShape: visual.cockpitShape };
  }
  if (node.levelRequired >= 100) {
    return { hullShape: "mothership" as HullShapeType, wingShape: "command" as WingShapeType, cockpitShape: "bridge" as CockpitShapeType };
  }

  const variantOffset = node.variantType === "light" ? -1 : node.variantType === "heavy" ? 1 : 0;
  const shapeSeed = Math.max(0, node.branchIndex) * 3 + node.tier * 2 + node.laneIndex + variantOffset;
  const hullShape = node.variantType === "light"
    ? (node.levelRequired >= 60 ? "rail" : "sleek")
    : node.variantType === "heavy"
      ? (node.levelRequired >= 45 ? "fortress" : "wide")
      : hullCycle[shapeSeed % hullCycle.length];
  const wingShape = node.variantType === "light"
    ? (node.levelRequired >= 75 ? "needle" : "swept")
    : node.variantType === "heavy"
      ? (node.levelRequired >= 60 ? "armor" : "wide")
      : wingCycle[(shapeSeed + node.tier) % wingCycle.length];
  const cockpitShape = cockpitCycle[(shapeSeed + node.displayPriority + node.tier) % cockpitCycle.length];
  return { hullShape, wingShape, cockpitShape };
}

export function visualProfileIdForNode(node: ShipNode) {
  if (node.branch === "Core") return "core_base";
  return `${String(node.branch).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_l${node.levelRequired}_${node.variantType}`;
}

export function getShipVisualProfile(nodeOrId: ShipNode | string): ShipVisualProfile {
  const node = typeof nodeOrId === "string" ? getShipNode(nodeOrId) : nodeOrId;
  const branch = node.branch;
  const visual = branchVisuals[branch];
  const variantType: VisualVariantType = branch === "Core" ? "base" : node.variantType;
  const mother = node.levelRequired >= 100;
  const baseSize = levelSize.get(node.levelRequired) ?? (1 + Math.max(0, node.tier - 1) * 0.18);
  const shape = visualShapeFor(node, visual);
  const profile: ShipVisualProfile = {
    id: node.visualProfileId || visualProfileIdForNode(node),
    branch,
    levelRequired: node.levelRequired,
    tier: node.tier,
    variantType,
    sizeScale: (mother ? Math.max(3.45, baseSize) : baseSize) * variantScale[variantType],
    hullShape: shape.hullShape,
    wingShape: shape.wingShape,
    cockpitShape: shape.cockpitShape,
    weaponMounts: branch === "Core" ? [{ type: "lens", x: 0.42, y: 0, scale: 0.7 }] : mountsFor(node),
    glowColor: visual.glowColor,
    primaryColor: visual.primaryColor,
    secondaryColor: visual.secondaryColor,
    accentColor: visual.accentColor,
    trailStyle: visual.trailStyle,
    shieldStyle: mother ? visual.shieldStyle ?? "ring" : visual.shieldStyle,
    animationStyle: visual.trailStyle === "electric" ? "electric" : mother ? "command" : "float",
    detailLevel: branch === "Core" ? 1 : Math.min(9, Math.max(2, node.tier)),
    silhouetteTags: visual.tags.concat(variantType, mother ? "mothership" : "upgrade"),
  };
  if (node.id === "space_pod") {
    profile.id = "starter_pod";
    // The standalone pod texture has transparent padding. Match its visible
    // hull to the pod's footprint inside the claimed spacecraft sprite.
    profile.sizeScale = 2.24;
    profile.weaponMounts = [];
    profile.glowColor = "#70e8ff";
    profile.primaryColor = "#d6d8d5";
    profile.secondaryColor = "#20252a";
    profile.accentColor = "#9ff5ff";
    profile.detailLevel = 2;
    profile.silhouetteTags = ["starter", "pod", "mining_laser"];
  }
  return profile;
}

export function getAlienVisualProfile(type: AlienDefenderType): ShipVisualProfile {
  const language = type === "beam_guard" ? branchVisuals.Laser : type === "mine_warden" ? branchVisuals.Mines : type === "carrier" ? branchVisuals.Drones : type === "core_guardian" ? branchVisuals["Arc Lightning"] : branchVisuals["Force Field"];
  const mother = type === "core_guardian";
  return {
    id: `alien_${type}`,
    branch: "Arc Lightning",
    levelRequired: mother ? 100 : 45,
    tier: mother ? 8 : 4,
    variantType: mother ? "mother_heavy" : type === "interceptor" ? "light" : type === "carrier" ? "heavy" : "balanced",
    sizeScale: mother ? 2.55 : type === "carrier" ? 1.55 : type === "interceptor" ? 1.05 : 1.25,
    hullShape: mother ? "mothership" : type === "carrier" ? "carrier" : type === "interceptor" ? "sleek" : language.hullShape,
    wingShape: language.wingShape,
    cockpitShape: mother ? "bridge" : language.cockpitShape,
    weaponMounts: [
      { type: language.mountType, x: 0.42, y: 0, scale: 0.9 },
      { type: language.mountType, x: -0.24, y: 0.66, scale: 0.68, mirror: true },
      ...(mother ? [{ type: "coil" as const, x: 0.2, y: 1.04, scale: 0.82, mirror: true }] : []),
    ],
    glowColor: type === "core_guardian" ? "#9a6462" : language.glowColor,
    primaryColor: type === "core_guardian" ? "#6b3d3d" : language.primaryColor,
    secondaryColor: "#36384a",
    accentColor: type === "core_guardian" ? "#ded8d4" : language.accentColor,
    trailStyle: language.trailStyle,
    shieldStyle: mother ? "fortress" : language.shieldStyle,
    animationStyle: type === "core_guardian" ? "electric" : "pulse",
    detailLevel: mother ? 8 : 4,
    silhouetteTags: ["alien", type, mother ? "guardian" : "defender"],
  };
}
