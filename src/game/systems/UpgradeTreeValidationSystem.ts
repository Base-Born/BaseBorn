import type { ShipNode } from "../data/shipUpgradeTree";

export interface UpgradeTreeValidationResult {
  valid: boolean;
  warnings: string[];
}

export function validateUpgradeTree(upgradeTree: ShipNode[]): UpgradeTreeValidationResult {
  const warnings: string[] = [];
  const ids = new Set<string>();
  const byId = new Map<string, ShipNode>();

  for (const node of upgradeTree) {
    if (ids.has(node.id)) warnings.push(`Duplicate node id: ${node.id}`);
    ids.add(node.id);
    byId.set(node.id, node);
  }

  for (const node of upgradeTree) {
    for (const childId of node.childIds) {
      const child = byId.get(childId);
      if (!child) {
        warnings.push(`${node.id} references missing child ${childId}`);
        continue;
      }
      if (!child.parentIds.includes(node.id)) warnings.push(`${node.id} -> ${childId} is not reciprocal`);
      if (child.levelRequired <= node.levelRequired) warnings.push(`${node.id} -> ${childId} does not progress forward`);
    }

    for (const parentId of node.parentIds) {
      const parent = byId.get(parentId);
      if (!parent) {
        warnings.push(`${node.id} references missing parent ${parentId}`);
        continue;
      }
      if (!parent.childIds.includes(node.id)) warnings.push(`${node.id} parent ${parentId} is not reciprocal`);
    }

    if (node.id !== "base_ship" && node.parentIds.length === 0) warnings.push(`${node.id} is orphaned`);
    if (node.levelRequired === 15 && !node.parentIds.includes("base_ship")) warnings.push(`${node.id} level 15 node must parent to base_ship`);
    if (node.levelRequired === 100 && !node.isMotherShipOption) warnings.push(`${node.id} level 100 node must be a mothership option`);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: ShipNode, trail: string[]) => {
    if (visiting.has(node.id)) {
      warnings.push(`Cycle detected: ${trail.concat(node.id).join(" -> ")}`);
      return;
    }
    if (visited.has(node.id)) return;
    visiting.add(node.id);
    for (const childId of node.childIds) {
      const child = byId.get(childId);
      if (child) visit(child, trail.concat(node.id));
    }
    visiting.delete(node.id);
    visited.add(node.id);
  };

  const core = byId.get("base_ship");
  if (!core) warnings.push("Missing base_ship root node");
  else visit(core, []);

  return { valid: warnings.length === 0, warnings };
}
