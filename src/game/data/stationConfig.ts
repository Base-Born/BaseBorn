import { emptyEtherCargo } from "./etherTypes";
import type { HyperdriveStatus, LandingPad, RepairStage, StationDefenseSlot, StationDefenseStats, StationUpgrade, StationUpgradeCategory, StationUpgradeState } from "./stationTypes";
import type { Vec2 } from "../types";

export const STATION_CONFIG = {
  stationBeltMinNormalizedDistance: 0.55,
  stationBeltMaxNormalizedDistance: 0.82,
  minDistanceBetweenStations: 95000,
  minDistanceFromSpawnCorners: 120000,
  maxStationCount: 16,
  expectedPlayerCount: 3,
  claimRadius: 135,
  dockRadius: 170,
  depositRadius: 190,
  passiveStationMarkerRadius: 28000,
  stationScannerPulseRadius: 180000,
  stationScannerPulseDurationMs: 6000,
  stationScannerCooldownMs: 12000,
  baseRadius: 170,
  starterStationDistance: 920,
  localRelocationStepDistance: 4200,
  stationBasePilotSpeed: 210,
  stationPilotSpeedPerBoosterLevel: 20,
  stationPilotAcceleration: 520,
  stationPilotResponse: 6.8,
  stationPilotBrakeResponse: 8.5,
  stationPilotDrag: 3.2,
  stationCollisionRestitution: 0.18,
  stationAsteroidCrushDamage: 0.09,
  stationStorageCapacity: 120000,
  hyperdriveChargeDurationMs: 10000,
  hyperdriveBaseFuelCost: 100,
  hyperdriveFuelCostPerWorldUnit: 0.002,
  hyperdriveFailedStartupFuelPenalty: 0.1,
  hyperdriveCooldownMs: 20000,
  hyperdriveArrivalCooldownMs: 30000,
  hyperdriveSpeedMultiplier: 22,
  hyperdriveThreatRadius: 2000,

  mothershipTransformationFuelCost: 25000,
  mothershipTransformationCost: { primalEther: 40, coreEther: 10 } as const,

  stationRaidEnemyProximityRadius: 2600,
  stationRaidCompletionClearTimeMs: 6000,
} as const;

export const REPAIR_STAGES: RepairStage[] = [
  { id: "coreSystems", name: "Reactor Core", cost: {}, fuelCost: 100, unlocks: ["Station ownership", "Basic power", "One docking point"] },
  { id: "fuelConverter", name: "Fuel Converter", cost: {}, fuelCost: 150, unlocks: ["Ether conversion", "Station Fuel storage"] },
  { id: "storage", name: "Storage Systems", cost: {}, fuelCost: 350, unlocks: ["Expanded Ether storage", "Module storage"] },
  { id: "shipUpgradeBay", name: "Ship Upgrade Bay", cost: {}, fuelCost: 700, unlocks: ["Docked ship stat upgrades", "Hull evolution", "Ship repairs"] },
  { id: "crafting", name: "Crafting Systems", cost: {}, fuelCost: 1200, unlocks: ["Weapons", "Drones", "Modules", "Components"] },
  { id: "defenses", name: "Defense Systems", cost: {}, fuelCost: 2200, unlocks: ["Auto turrets", "Missile defense", "Shields"] },
  { id: "landingPads", name: "Landing Pads", cost: {}, fuelCost: 3800, unlocks: ["Team docking", "Additional ships", "Team respawn"] },
  { id: "commandCore", name: "Command Core", cost: { primalEther: 20 }, fuelCost: 6500, unlocks: ["Team management", "Mothership controls", "Fleet management"] },
  { id: "fullRestoration", name: "Full Restoration", cost: { coreEther: 10 }, fuelCost: 10000, unlocks: ["Mothership construction", "Fusion architecture", "High-tier crafting"] },
];

export const ETHER_FUEL_CONVERSION = {
  rawEther: 0.1,
  refinedEther: 0.25,
  chargedEther: 0.6,
  radiantEther: 1.5,
  primalEther: 4,
  coreEther: 10,
} as const;

export const EMPTY_STATION_DEFENSE_STATS: StationDefenseStats = {
  turretDamage: 0,
  turretFireRate: 0,
  missileDamage: 0,
  missileCooldown: 0,
  shieldCapacity: 0,
  shieldRegen: 0,
  armorDamageReduction: 0,
  repairRate: 0,
  repairDroneCount: 0,
  defenseRange: 0,
  emergencyPulseDamage: 0,
  globalDefenseMultiplier: 1,
};

const STATION_UPGRADE_BLUEPRINTS: Omit<StationUpgrade, "level" | "installed" | "unlocked" | "upgradeCost" | "bonuses">[] = [
  { id: "kinetic_turrets", name: "Kinetic Auto Turrets", category: "kinetic_turrets", etherTier: "rawEther", maxLevel: 5, requiredRepairStage: "defenses", requiredStationLevel: 1, description: "Fast basic turrets that let the station defend itself." },
  { id: "armor_plating", name: "Reinforced Armor Plating", category: "armor_plating", etherTier: "refinedEther", maxLevel: 5, requiredRepairStage: "storage", requiredStationLevel: 3, description: "Increases station durability and reduces incoming damage." },
  { id: "missile_defense", name: "Missile Defense System", category: "missile_defense", etherTier: "chargedEther", maxLevel: 5, requiredRepairStage: "defenses", requiredStationLevel: 8, description: "Slower burst defense for tougher enemies." },
  { id: "shield_dome", name: "Shield Dome Generator", category: "shield_dome", etherTier: "radiantEther", maxLevel: 5, requiredRepairStage: "defenses", requiredStationLevel: 14, description: "Adds a regenerating shield around the base." },
  { id: "repair_drone_bay", name: "Repair Drone Bay", category: "repair_drone_bay", etherTier: "primalEther", maxLevel: 5, requiredRepairStage: "landingPads", requiredStationLevel: 25, description: "Repairs station hull while not under heavy fire." },
  { id: "core_defense_matrix", name: "Core Defense Matrix", category: "core_defense_matrix", etherTier: "coreEther", maxLevel: 5, requiredRepairStage: "fullRestoration", requiredStationLevel: 50, description: "Endgame defense matrix that boosts all station weapons." },
];

export function getStationUpgradeCost(category: StationUpgradeCategory, nextLevel: number) {
  const costs: Record<StationUpgradeCategory, Array<Record<string, number>>> = {
    kinetic_turrets: [{ rawEther: 140 }, { rawEther: 260, refinedEther: 80 }, { rawEther: 340, refinedEther: 160, chargedEther: 70 }, { chargedEther: 220, radiantEther: 90 }, { radiantEther: 240, primalEther: 80 }],
    armor_plating: [{ refinedEther: 130 }, { rawEther: 180, refinedEther: 220 }, { refinedEther: 320, chargedEther: 90 }, { chargedEther: 240, radiantEther: 120 }, { radiantEther: 260, primalEther: 90 }],
    missile_defense: [{ chargedEther: 150 }, { refinedEther: 220, chargedEther: 240 }, { chargedEther: 360, radiantEther: 110 }, { radiantEther: 300, primalEther: 100 }, { primalEther: 180, coreEther: 35 }],
    shield_dome: [{ radiantEther: 150 }, { chargedEther: 260, radiantEther: 250 }, { radiantEther: 380, primalEther: 110 }, { primalEther: 220, coreEther: 45 }, { primalEther: 360, coreEther: 80 }],
    repair_drone_bay: [{ primalEther: 120 }, { radiantEther: 320, primalEther: 210 }, { primalEther: 320, coreEther: 55 }, { primalEther: 460, coreEther: 95 }, { coreEther: 150, primalEther: 620 }],
    core_defense_matrix: [{ coreEther: 60, primalEther: 260 }, { coreEther: 110, primalEther: 420, radiantEther: 420 }, { coreEther: 180, primalEther: 620 }, { coreEther: 260, primalEther: 820 }, { coreEther: 380, primalEther: 1100 }],
  };
  return costs[category][Math.max(0, Math.min(4, nextLevel - 1))];
}

export function getStationUpgradeBonuses(category: StationUpgradeCategory, level: number): Partial<StationDefenseStats> {
  if (category === "kinetic_turrets") return { turretDamage: 8 + level * 7, turretFireRate: 0.8 + level * 0.22, defenseRange: 1700 + level * 140 };
  if (category === "armor_plating") return { armorDamageReduction: Math.min(0.45, level * 0.07) };
  if (category === "missile_defense") return { missileDamage: 26 + level * 18, missileCooldown: Math.max(1.4, 4.2 - level * 0.34), defenseRange: 2100 + level * 180 };
  if (category === "shield_dome") return { shieldCapacity: 260 + level * 230, shieldRegen: 4 + level * 3, defenseRange: 1900 + level * 100 };
  if (category === "repair_drone_bay") return { repairRate: 5 + level * 5, repairDroneCount: level };
  return { emergencyPulseDamage: 80 + level * 70, globalDefenseMultiplier: 1 + level * 0.12, defenseRange: 2600 + level * 220 };
}

export function createStationUpgrades(): StationUpgrade[] {
  return STATION_UPGRADE_BLUEPRINTS.map((blueprint) => ({
    ...blueprint,
    level: 0,
    installed: false,
    unlocked: false,
    upgradeCost: getStationUpgradeCost(blueprint.category, 1),
    bonuses: getStationUpgradeBonuses(blueprint.category, 1),
  }));
}

export function createStationStorage() {
  return {
    capacity: STATION_CONFIG.stationStorageCapacity,
    used: 0,
    ether: emptyEtherCargo(),
  };
}

export function createDefaultUpgradeState(): StationUpgradeState {
  return {
    storageLevel: 1,
    craftingLevel: 0,
    defenseLevel: 0,
    landingPadLevel: 1,
    hullConsoleLevel: 0,
    boosterLevel: 0,
  };
}

export function createLandingPads(): LandingPad[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 6;
    return {
      id: `pad-${index + 1}`,
      occupiedByPlayerId: null,
      unlocked: index === 0,
      level: 1,
      positionOffset: index === 0 ? { x: 0, y: 0 } : { x: Math.cos(angle) * 205, y: Math.sin(angle) * 205 },
    };
  });
}

export function createDefenseSlots(): StationDefenseSlot[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 6 + Math.PI / 6;
    return {
      id: `defense-${index + 1}`,
      unlocked: false,
      positionOffset: { x: Math.cos(angle) * 620, y: Math.sin(angle) * 620 },
    };
  });
}

export function createHyperdriveStatus(): HyperdriveStatus {
  return {
    etherFuel: 0,
    etherFuelCapacity: 2000,
    hyperdriveUnlocked: false,
    hyperdriveState: "idle",
    hyperdriveChargeDurationMs: STATION_CONFIG.hyperdriveChargeDurationMs,
    isPhasedDuringWarp: false,
  };
}

export function getStationSpawnCount(expectedPlayerCount: number) {
  if (expectedPlayerCount <= 3) return 3;
  if (expectedPlayerCount <= 8) return 6;
  if (expectedPlayerCount <= 16) return 10;
  return STATION_CONFIG.maxStationCount;
}

export function getLandingPadUnlockCount(stationLevel: number) {
  if (stationLevel >= 80) return 6;
  if (stationLevel >= 60) return 5;
  if (stationLevel >= 40) return 4;
  if (stationLevel >= 25) return 3;
  if (stationLevel >= 10) return 2;
  return 1;
}

export function getDefenseSlotUnlockCount(stationLevel: number) {
  if (stationLevel >= 100) return 6;
  if (stationLevel >= 75) return 5;
  if (stationLevel >= 50) return 4;
  if (stationLevel >= 30) return 3;
  if (stationLevel >= 15) return 2;
  if (stationLevel >= 5) return 1;
  return 0;
}

export function offsetPosition(origin: Vec2, offset: Vec2) {
  return { x: origin.x + offset.x, y: origin.y + offset.y };
}
