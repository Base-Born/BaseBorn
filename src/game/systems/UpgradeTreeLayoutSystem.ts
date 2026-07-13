import {
  upgradeBranchOrder,
  upgradeLevels,
  type ShipNode,
  type WeaponBranch,
} from "../data/shipUpgradeTree";

export type UpgradeTreeMode = "overview" | "focus";

export interface UpgradeTreeLayoutOptions {
  mode: UpgradeTreeMode;
  selectedBranch: WeaponBranch | null;
  currentShipId: string;
}

export interface PositionedUpgradeNode extends ShipNode {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  compact: boolean;
  column: number;
  laneY: number;
  previewOnly: boolean;
}

const radialCenter = { x: 820, y: 820 };
const ringRadii = new Map<number, number>([
  [1, 0],
  [15, 136],
  [30, 224],
  [45, 312],
  [60, 400],
  [75, 488],
  [90, 576],
  [100, 664],
]);

export function calculateUpgradeTreeLayout(nodes: ShipNode[], options: UpgradeTreeLayoutOptions): PositionedUpgradeNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pathIds = getUpgradePathNodeIds(options.currentShipId, nodes);

  return nodes.map((node): PositionedUpgradeNode => {
    const isRoot = node.id === "base_ship";
    const isPath = pathIds.has(node.id);
    const branchIndex = node.branch === "Core" ? 0 : Math.max(0, upgradeBranchOrder.indexOf(node.branch));
    const displayPriority = node.layout?.displayPriority ?? node.displayPriority ?? 0;
    const compact = !isRoot;
    const previewOnly = false;
    const size = getNodeSize(node);
    const point = getRadialPoint(node, branchIndex, displayPriority, nodes);
    const visible = true;
    const opacity = isRoot || isPath ? 1 : 0.52;

    return {
      ...node,
      x: point.x - size.width / 2,
      y: point.y - size.height / 2,
      width: size.width,
      height: size.height,
      visible,
      opacity,
      compact,
      column: getColumn(node.levelRequired),
      laneY: point.y,
      previewOnly,
    };
  });
}

function getRadialPoint(node: ShipNode, branchIndex: number, displayPriority: number, nodes: ShipNode[]) {
  if (node.id === "base_ship") return radialCenter;
  const branchCount = upgradeBranchOrder.length;
  const baseAngle = (branchIndex / branchCount) * Math.PI * 2 - Math.PI / 2;
  const sameTier = nodes.filter((candidate) => candidate.branch === node.branch && candidate.levelRequired === node.levelRequired);
  const tierIndex = sameTier.findIndex((candidate) => candidate.id === node.id);
  const spreadIndex = tierIndex >= 0 ? tierIndex - (sameTier.length - 1) / 2 : displayPriority - 1;
  const spread = node.levelRequired === 15 ? 0 : 0.055;
  const angle = baseAngle + spreadIndex * spread;
  const radius = ringRadii.get(node.levelRequired) ?? 664;
  return {
    x: radialCenter.x + Math.cos(angle) * radius,
    y: radialCenter.y + Math.sin(angle) * radius,
  };
}

function getNodeSize(node: ShipNode) {
  if (node.id === "base_ship") return { width: 74, height: 74 };
  if (node.isMotherShipOption) return { width: 84, height: 84 };
  if (node.levelRequired >= 90) return { width: 66, height: 66 };
  if (node.levelRequired >= 75) return { width: 60, height: 60 };
  if (node.levelRequired >= 60) return { width: 54, height: 54 };
  if (node.levelRequired >= 45) return { width: 48, height: 48 };
  if (node.levelRequired >= 30) return { width: 42, height: 42 };
  return { width: 38, height: 38 };
}

function getColumn(levelRequired: number) {
  if (levelRequired <= 1) return 0;
  return upgradeLevels.indexOf(levelRequired as (typeof upgradeLevels)[number]) + 1;
}

export function getUpgradePathNodeIds(currentShipId: string, nodes: ShipNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path = new Set<string>();
  const visit = (id: string) => {
    if (path.has(id)) return;
    path.add(id);
    byId.get(id)?.parentIds.forEach(visit);
  };
  visit(currentShipId);
  return path;
}

export const upgradeTreeTierColumns = [
  { label: "Core", level: 1, x: radialCenter.x },
  ...upgradeLevels.map((level) => ({ label: `Lv ${level}`, level, x: radialCenter.x + (ringRadii.get(level) ?? 0) })),
];
