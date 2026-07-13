import type { StatKey } from "../data/stats";
import { shipUpgradeTree } from "../data/shipUpgradeTree";
import type { Player } from "../entities/Player";
import { canEvolveToNode, getAvailableEvolutionChoices, baseAccessForLevel } from "./UpgradeAvailabilitySystem";

export class UpgradeSystem {
  upgradeStat(player: Player, key: StatKey) {
    return player.upgrade(key);
  }

  choices(player: Player) {
    return getAvailableEvolutionChoices(player, shipUpgradeTree, baseAccessForLevel(player.level));
  }

  evolve(player: Player, id: string) {
    const target = shipUpgradeTree.find((node) => node.id === id);
    if (!target) return false;
    const allowed = canEvolveToNode(player, target, shipUpgradeTree, baseAccessForLevel(player.level));
    if (!allowed.canEvolve) return false;
    player.setClass(id);
    return true;
  }
}

