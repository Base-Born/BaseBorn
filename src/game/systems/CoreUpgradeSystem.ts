import { statKeys, type StatKey } from "../data/stats";
import { getHyperStatLevel, getNormalStatLevel, isStatFullyMaxed, isStatHyperUnlocked, isStatNormalMaxed, TOTAL_STAT_MAX } from "./StatScalingSystem";

export type CoreStats = Record<StatKey, number>;

export const CORE_STAT_MAX = TOTAL_STAT_MAX;

export function canUpgradeCoreStat(stats: CoreStats, statPoints: number, key: StatKey) {
  return statPoints > 0 && !isStatFullyMaxed(stats, key);
}

export function getCoreStatHotkey(key: StatKey) {
  return statKeys.indexOf(key) + 1;
}

export { getHyperStatLevel, getNormalStatLevel, isStatFullyMaxed, isStatHyperUnlocked, isStatNormalMaxed };
