import { MAX_LEVEL, XP_BY_LEVEL } from "../config";
import type { Player } from "../entities/Player";
import { grantUpgradePointOnLevelUp } from "./ShipUpgradeSystem";

export class LevelSystem {
  award(player: Player, xp: number, score: number) {
    player.xp += xp;
    player.score += score;
    while (player.level < MAX_LEVEL && player.xp >= XP_BY_LEVEL[player.level + 1]) {
      player.level += 1;
      grantUpgradePointOnLevelUp(player);
    }
    player.recalculate();
  }
}
