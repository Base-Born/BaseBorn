import { getShipNode, REQUIRE_BASE_FOR_EVOLUTION, shipUpgradeTree, type ShipNode } from "../data/shipUpgradeTree";

export type UpgradeNodeState = "current" | "available" | "path" | "locked" | "planned";

export interface BaseAccess {
  baseLevel: number;
  hasMotherShipLab: boolean;
}

export interface EvolutionPlayerState {
  level: number;
  currentShipId: string;
}

export interface EvolutionChoice {
  node: ShipNode;
  state: "available" | "locked" | "current";
  lockReason?: string;
}

export function getBaseRequirement(levelRequired: number) {
  if (levelRequired >= 100) return { baseLevel: 7, needsMotherShipLab: true };
  if (levelRequired >= 90) return { baseLevel: 6, needsMotherShipLab: false };
  if (levelRequired >= 75) return { baseLevel: 5, needsMotherShipLab: false };
  if (levelRequired >= 60) return { baseLevel: 4, needsMotherShipLab: false };
  if (levelRequired >= 45) return { baseLevel: 3, needsMotherShipLab: false };
  if (levelRequired >= 30) return { baseLevel: 2, needsMotherShipLab: false };
  return { baseLevel: 1, needsMotherShipLab: false };
}

export function baseAccessForLevel(level: number): BaseAccess {
  return {
    baseLevel: level >= 100 ? 7 : level >= 90 ? 6 : level >= 75 ? 5 : level >= 60 ? 4 : level >= 45 ? 3 : level >= 30 ? 2 : 1,
    hasMotherShipLab: level >= 100,
  };
}

export function canEvolveToNode(
  player: EvolutionPlayerState,
  targetNode: ShipNode,
  upgradeTree: ShipNode[] = shipUpgradeTree,
  baseAccess: BaseAccess = baseAccessForLevel(player.level),
) {
  const current = getShipNode(player.currentShipId);
  const inTree = upgradeTree.some((node) => node.id === targetNode.id);
  if (!inTree) return { canEvolve: false, reason: "Unknown ship node" };
  if (targetNode.id === current.id) return { canEvolve: false, reason: "Current ship" };
  if (!current.childIds.includes(targetNode.id)) return { canEvolve: false, reason: "Requires previous ship" };
  if (targetNode.levelRequired <= current.levelRequired) return { canEvolve: false, reason: "Already passed this tier" };
  if (targetNode.implementationStatus === "data_only") return { canEvolve: false, reason: "Data-only evolution" };
  if (player.level < targetNode.levelRequired) return { canEvolve: false, reason: `Requires Level ${targetNode.levelRequired}` };

  if (REQUIRE_BASE_FOR_EVOLUTION) {
    const requirement = getBaseRequirement(targetNode.levelRequired);
    if (baseAccess.baseLevel < requirement.baseLevel) return { canEvolve: false, reason: `Requires Base Level ${requirement.baseLevel}` };
    if (requirement.needsMotherShipLab && !baseAccess.hasMotherShipLab) return { canEvolve: false, reason: "Requires Mother Ship Lab" };
  }

  return { canEvolve: true };
}

export function getAvailableEvolutionChoices(
  player: EvolutionPlayerState,
  upgradeTree: ShipNode[] = shipUpgradeTree,
  baseAccess: BaseAccess = baseAccessForLevel(player.level),
): EvolutionChoice[] {
  const byId = new Map(upgradeTree.map((node) => [node.id, node]));
  const current = getShipNode(player.currentShipId);
  return current.childIds
    .map((id) => byId.get(id))
    .filter((node): node is ShipNode => Boolean(node))
    .filter((node) => node.levelRequired > current.levelRequired)
    .sort((a, b) => a.levelRequired - b.levelRequired || a.displayPriority - b.displayPriority || a.name.localeCompare(b.name))
    .map((node) => {
      const result = canEvolveToNode(player, node, upgradeTree, baseAccess);
      return result.canEvolve
        ? { node, state: "available" as const }
        : { node, state: "locked" as const, lockReason: result.reason };
    });
}

export function getUpgradeNodeState(node: ShipNode, currentShipId: string, availableIds: Set<string>, pathIds: Set<string>): UpgradeNodeState {
  if (node.id === currentShipId) return "current";
  if (availableIds.has(node.id) && node.implementationStatus === "playable") return "available";
  if (pathIds.has(node.id)) return "path";
  if (node.implementationStatus !== "playable") return "planned";
  return "locked";
}

export function getUpgradeRequirement(node: ShipNode, level: number, currentShipId: string, baseAccess = baseAccessForLevel(level)) {
  if (node.id === currentShipId) return "Current ship";
  const result = canEvolveToNode({ level, currentShipId }, node, shipUpgradeTree, baseAccess);
  return result.canEvolve ? "Click to evolve" : result.reason ?? "Locked";
}

export function canChooseUpgrade(node: ShipNode, availableIds: Set<string>) {
  return availableIds.has(node.id) && node.implementationStatus === "playable";
}
