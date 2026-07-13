import type { Station, StationUpgradeCategory } from "./stationTypes";

export type StationVisualProfile = {
  baseRadius: number;
  coreRadius: number;
  ringRadius: number;
  outerRadius: number;
  armCount: number;
  unlockedPadCount: number;
  repairProgress: number;
  healthRatio: number;
  damageLevel: number;
  teamColor: string;
  metalColor: string;
  darkMetalColor: string;
  coreColor: string;
  warningColor: string;
  shieldActive: boolean;
  shieldRatio: number;
  isClaimed: boolean;
  isMothership: boolean;
  isFortified: boolean;
  underAttack: boolean;
  activeDefenseCategories: StationUpgradeCategory[];
  seed: number;
};

const TEAM_COLOR = "#6edb8f";
const TEAM_CORE = "#4cc9f0";
const BROKEN_CORE = "#ff935c";
const MOTHERSHIP_CORE = "#ffd166";

export function getStationVisualProfile(station: Station): StationVisualProfile {
  const repairProgress = station.repairStages.length ? station.repairStageIndex / station.repairStages.length : 0;
  const healthRatio = station.maxHealth > 0 ? Math.max(0, Math.min(1, station.health / station.maxHealth)) : 0;
  const isClaimed = station.claimState === "claimed";
  const isMothership = station.mothershipUnlocked || station.lifecycleState === "mothership";
  const defensePower = station.upgrades.reduce((sum, upgrade) => sum + (upgrade.installed ? upgrade.level : 0), 0);
  const activeDefenseCategories = station.upgrades
    .filter((upgrade) => upgrade.installed && upgrade.level > 0)
    .map((upgrade) => upgrade.category);
  const upgradeScale = Math.min(0.26, station.level / 100 * 0.16 + repairProgress * 0.1 + defensePower * 0.006);
  const mothershipScale = isMothership ? 0.42 : 0;
  const baseRadius = station.radius * (0.46 + upgradeScale + mothershipScale);
  const damageFromRepair = 1 - repairProgress;
  const damageFromHealth = 1 - healthRatio;
  const damageLevel = Math.max(station.lifecycleState === "destroyed" ? 1 : 0, Math.max(damageFromRepair, damageFromHealth));

  return {
    baseRadius,
    coreRadius: baseRadius * (0.23 + repairProgress * 0.04 + (isMothership ? 0.03 : 0)),
    ringRadius: baseRadius * (0.52 + repairProgress * 0.08),
    outerRadius: baseRadius * (0.86 + repairProgress * 0.12),
    armCount: Math.max(3, Math.min(6, Math.max(station.landingPads.length, station.landingPads.filter((pad) => pad.unlocked).length || 3))),
    unlockedPadCount: station.landingPads.filter((pad) => pad.unlocked).length,
    repairProgress,
    healthRatio,
    damageLevel,
    teamColor: isClaimed ? TEAM_COLOR : "rgba(212, 219, 226, 0.78)",
    metalColor: isClaimed ? "#26423d" : "#353b42",
    darkMetalColor: isClaimed ? "#122329" : "#171b21",
    coreColor: isMothership ? MOTHERSHIP_CORE : isClaimed ? TEAM_CORE : BROKEN_CORE,
    warningColor: station.underAttack || healthRatio <= 0.5 ? "#ff6b78" : "#ff935c",
    shieldActive: station.shield > 0 || activeDefenseCategories.includes("shield_dome"),
    shieldRatio: station.defenseStats.shieldCapacity > 0 ? Math.max(0, Math.min(1, station.shield / station.defenseStats.shieldCapacity)) : 0,
    isClaimed,
    isMothership,
    isFortified: defensePower >= 3 || station.selfDefenseEnabled || activeDefenseCategories.length >= 2,
    underAttack: station.underAttack,
    activeDefenseCategories,
    seed: hashStationId(station.id),
  };
}

export function seededUnit(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function hasStationVisualUpgrade(profile: StationVisualProfile, category: StationUpgradeCategory) {
  return profile.activeDefenseCategories.includes(category);
}

function hashStationId(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
