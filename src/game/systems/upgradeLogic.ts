import { getShipNode, shipUpgradeTree, type ShipNode } from "../data/shipUpgradeTree";

export function getAvailableUpgrades(playerLevel: number, currentShipId: string, upgradeTree: ShipNode[] = shipUpgradeTree) {
  const current = getShipNode(currentShipId);
  const byId = new Map(upgradeTree.map((node) => [node.id, node]));
  return current.childIds
    .map((id) => byId.get(id))
    .filter((node): node is ShipNode => Boolean(node))
    .filter((node) => playerLevel >= node.levelRequired);
}

export function getPathNodeIds(currentShipId: string, upgradeTree: ShipNode[] = shipUpgradeTree) {
  const byId = new Map(upgradeTree.map((node) => [node.id, node]));
  const path = new Set<string>();
  const visit = (id: string) => {
    if (path.has(id)) return;
    path.add(id);
    byId.get(id)?.parentIds.forEach(visit);
  };
  visit(currentShipId);
  return path;
}

export function canUpgradeTo(playerLevel: number, currentShipId: string, targetShipId: string) {
  return getAvailableUpgrades(playerLevel, currentShipId).some((node) => node.id === targetShipId);
}
