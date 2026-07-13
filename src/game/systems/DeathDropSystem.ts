import type { EtherType } from "../data/etherTypes";
import type { Player } from "../entities/Player";
import type { EtherDropSystem } from "./EtherDropSystem";

export type DeathCargoDropSummary = {
  totalDropped: number;
  stacks: Array<{ type: EtherType; amount: number }>;
};

export function getDeathCargoDropSummary(player: Player): DeathCargoDropSummary {
  const stacks = (Object.entries(player.cargo.ether) as Array<[EtherType, number]>)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => ({ type, amount }));
  return {
    totalDropped: stacks.reduce((sum, stack) => sum + stack.amount, 0),
    stacks,
  };
}

export function clearPlayerCargo(player: Player) {
  (Object.keys(player.cargo.ether) as EtherType[]).forEach((type) => {
    player.cargo.ether[type] = 0;
  });
  player.cargo.used = 0;
}

export function dropAllCargoOnDeath(player: Player, drops: EtherDropSystem, now = performance.now()) {
  const summary = getDeathCargoDropSummary(player);
  summary.stacks.forEach((stack) => drops.spawnCargoDrop(player.pos, stack.type, stack.amount, player.id, now));
  clearPlayerCargo(player);
  return summary;
}
