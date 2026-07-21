import { totalUpgradePointsForLevel } from "../config";
import { statKeys, type StatKey } from "../data/stats";
import type { Player } from "../entities/Player";
import { getHyperStatLevel, getHyperUpgradeLevelRequirement, getNormalStatLevel, HYPER_STAT_MAX, NORMAL_STAT_MAX } from "./StatScalingSystem";

export function getUpgradePointsForLevel(level: number) {
  return totalUpgradePointsForLevel(level);
}

export function getSpentUpgradePoints(player: Player) {
  return statKeys.reduce((sum, key) => sum + Math.max(0, Math.floor(player.stats[key] ?? 0)), 0);
}

export function getAvailableUpgradePoints(player: Player) {
  return Math.max(0, getUpgradePointsForLevel(player.level) - getSpentUpgradePoints(player));
}

export function canUpgradeNormalStat(player: Player, statKey: StatKey) {
  return getAvailableUpgradePoints(player) > 0 && getNormalStatLevel(player.stats, statKey) < NORMAL_STAT_MAX;
}

export function canUpgradeHyperStat(player: Player, statKey: StatKey) {
  const nextHyper = getHyperStatLevel(player.stats, statKey) + 1;
  return getAvailableUpgradePoints(player) > 0
    && getNormalStatLevel(player.stats, statKey) >= NORMAL_STAT_MAX
    && nextHyper <= HYPER_STAT_MAX
    && player.level >= getHyperUpgradeLevelRequirement(nextHyper);
}

export function canUpgradeShipStat(player: Player, statKey: StatKey) {
  return canUpgradeNormalStat(player, statKey) || canUpgradeHyperStat(player, statKey);
}

export function getShipUpgradeLockReason(player: Player, statKey: StatKey) {
  if (getAvailableUpgradePoints(player) <= 0) return "No upgrade points available.";
  if (getNormalStatLevel(player.stats, statKey) < NORMAL_STAT_MAX) return "";
  const nextHyper = getHyperStatLevel(player.stats, statKey) + 1;
  if (nextHyper > HYPER_STAT_MAX) return "Stat fully maxed.";
  const requiredLevel = getHyperUpgradeLevelRequirement(nextHyper);
  if (player.level < requiredLevel) return `Hyper ${nextHyper} requires level ${requiredLevel}.`;
  return "";
}

export function spendShipUpgradePoint(player: Player, statKey: StatKey) {
  if (!canUpgradeShipStat(player, statKey)) return false;
  player.stats[statKey] += 1;
  player.statPoints = getAvailableUpgradePoints(player);
  player.recalculate();
  player.syncDrones();
  return true;
}

export function grantUpgradePointOnLevelUp(player: Player) {
  player.statPoints = getAvailableUpgradePoints(player);
}
