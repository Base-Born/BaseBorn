import type { CargoStorage, EtherCost, EtherType } from "./etherTypes";
import type { Vec2 } from "../types";

export type ClaimState = "unclaimed" | "contested" | "claimed";
export type StationLifecycleState = "unclaimed" | "claimed" | "active" | "under_attack" | "damaged" | "dormant" | "abandoned" | "destroyed" | "mothership";
export type RepairStageId =
  | "coreSystems"
  | "fuelConverter"
  | "storage"
  | "shipUpgradeBay"
  | "crafting"
  | "defenses"
  | "landingPads"
  | "commandCore"
  | "upgradeConsole"
  | "fullRestoration";

export type ModuleSlotType = "weapon" | "defense" | "engine" | "mining" | "utility" | "core";
export type ModuleTier = 1 | 2 | 3 | 4 | 5;
export type HullTierId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StationDefenseType = "light_turret" | "missile_turret" | "beam_turret" | "shield_generator" | "repair_drone_bay" | "scanner_array";
export type HyperdriveState = "idle" | "charging" | "interrupted" | "ready" | "warping" | "cooldown";
export type StationUpgradeCategory = "kinetic_turrets" | "armor_plating" | "missile_defense" | "shield_dome" | "repair_drone_bay" | "core_defense_matrix";

export interface RepairStage {
  id: RepairStageId;
  name: string;
  cost: EtherCost;
  fuelCost: number;
  unlocks: string[];
}

export interface StationFuelState {
  currentFuel: number;
  maxFuel: number;
  conversionEfficiency: number;
  conversionQueue: Array<{ etherType: EtherType; amount: number }>;
  reservedFuel: number;
  totalFuelGenerated: number;
  totalFuelSpent: number;
}

export interface LandingPad {
  id: string;
  occupiedByPlayerId: string | null;
  unlocked: boolean;
  level: number;
  positionOffset: Vec2;
}

export interface StationDefense {
  id: string;
  type: StationDefenseType;
  slotId: string;
  level: number;
  health: number;
  maxHealth: number;
  range: number;
  damage: number;
  fireRate: number;
  positionOffset: Vec2;
  targetMode: "nearest" | "strongest";
  upgradeCost: EtherCost;
}

export interface StationDefenseSlot {
  id: string;
  unlocked: boolean;
  positionOffset: Vec2;
}

export interface StationUpgradeState {
  storageLevel: number;
  craftingLevel: number;
  defenseLevel: number;
  landingPadLevel: number;
  hullConsoleLevel: number;
  boosterLevel: number;
}

export interface StationDefenseStats {
  turretDamage: number;
  turretFireRate: number;
  missileDamage: number;
  missileCooldown: number;
  shieldCapacity: number;
  shieldRegen: number;
  armorDamageReduction: number;
  repairRate: number;
  repairDroneCount: number;
  defenseRange: number;
  emergencyPulseDamage: number;
  globalDefenseMultiplier: number;
}

export interface StationUpgrade {
  id: string;
  name: string;
  category: StationUpgradeCategory;
  etherTier: EtherType;
  level: number;
  maxLevel: number;
  installed: boolean;
  unlocked: boolean;
  upgradeCost: EtherCost;
  bonuses: Partial<StationDefenseStats>;
  requiredRepairStage: RepairStageId;
  requiredStationLevel: number;
  description: string;
}

export interface HyperdriveStatus {
  etherFuel: number;
  etherFuelCapacity: number;
  hyperdriveUnlocked: boolean;
  hyperdriveState: HyperdriveState;
  hyperdriveChargeStartedAt?: number;
  hyperdriveChargeDurationMs: number;
  hyperdriveCooldownUntil?: number;
  hyperdriveDestination?: Vec2;
  hyperdriveFuelCost?: number;
  hyperdriveLastInterruptReason?: string;
  isPhasedDuringWarp: boolean;

  hyperdriveChargeStartHealth?: number;
  hyperdriveChargeStartShield?: number;
}

export type StationSubsystemStateKind = "online" | "damaged" | "disabled" | "repairing" | "offline";

export type StationSubsystemId =
  | "power_core"
  | "storage"
  | "crafting_bay"
  | "turrets"
  | "shield_generator"
  | "repair_drone_bay"
  | "landing_pads"
  | "scanner_array"
  | "fuel_refinery"
  | "upgrade_console"
  | "hyperdrive_system"
  | "fleet_control_system";

export type StationSubsystemState = {
  health: number;
  maxHealth: number;
  state: StationSubsystemStateKind;
};

export interface Station {
  id: string;
  name: string;
  pos: Vec2;
  vel: Vec2;
  driveInput?: Vec2;
  facingAngle?: number;
  turretAngle?: number;
  turretFiringUntil?: number;
  radius: number;
  ownerTeamId: string | null;
  ownerPlayerId: string | null;
  claimState: ClaimState;
  repairStageIndex: number;
  repairStages: RepairStage[];
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  isFullyRepaired: boolean;
  storage: CargoStorage;
  fuel: StationFuelState;
  defenseSlots: StationDefenseSlot[];
  defenses: StationDefense[];
  landingPads: LandingPad[];
  craftingTier: number;
  upgradeState: StationUpgradeState;
  upgrades: StationUpgrade[];
  defenseStats: StationDefenseStats;
  selfDefenseEnabled: boolean;
  lastAttackedAt: number;
  underAttack: boolean;
  autoDefenseTargets: string[];
  defensePowerLevel: number;
  shield: number;
  powerCoreLevel: number;
  powerCapacity: number;
  powerUsed: number;
  powerOverloaded: boolean;
  powerOverloadReason: string;
  subsystemStates: Record<StationSubsystemId, StationSubsystemState>;
  raidWarningUntil?: number;
  nextRaidAt?: number;
  isMobile: boolean;
  mothershipUnlocked: boolean;
  mothershipCoreCrafted: boolean;
  transformationPaid: boolean;
  movementLockReason: string;
  localRelocationAvailable: boolean;
  localRelocationReason: string;
  hyperdrive: HyperdriveStatus;
  lifecycleState: StationLifecycleState;
  lastActiveAt: number;
  destroyedAt?: number;
}

export type BaseLostState = {
  baseDestroyedAt: number;
  destroyedStationId: string;
  resourcesLost: number;
  salvageDropped: number;
  teamNeedsNewStation: boolean;
  previousStationLevel: number;
  previousMothershipState: boolean;
  destructionSector: string;
};

export interface TeamMemberContributionStats {
  etherDeposited: number;
  repairsCompleted: number;
  modulesCrafted: number;
}

export interface TeamMember {
  playerId: string;
  name: string;
  role: "leader" | "officer" | "member";
  status: "online" | "offline" | "docked" | "farming" | "combat" | "traveling";
  joinedAt: number;
  currentShipId: string;
  currentHullTier: HullTierId;
  contributionStats: TeamMemberContributionStats;
}

export interface PendingInvite {
  id: string;
  teamId: string;
  invitedPlayerName: string;
  invitedPlayerId?: string;
  invitedByPlayerId: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: number;
  expiresAt: number;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  leaderPlayerId: string;
  memberIds: string[];
  members: TeamMember[];
  pendingInvites: PendingInvite[];
  stationId: string | null;
  mothershipId: string | null;
  maxMembers: 6;
  createdAt: number;
}

export interface HullTier {
  tier: HullTierId;
  name: string;
  description: string;
  levelRequirement: number;
  requiredRepairStage: RepairStageId | null;
  requiredCraftingTier: number;
  etherCost: EtherCost;
  healthMultiplier: number;
  speedMultiplier: number;
  cargoCapacity: number;
  slots: Record<ModuleSlotType, number>;
}

export interface ModuleStatBonuses {
  healthMultiplier?: number;
  shieldMultiplier?: number;
  speedMultiplier?: number;
  damageMultiplier?: number;
  fireRateMultiplier?: number;
  projectileSpeedMultiplier?: number;
  miningDamageMultiplier?: number;
  cargoBonus?: number;
  regenPerSecond?: number;
}

export interface ShipModuleDefinition {
  id: string;
  name: string;
  slotType: ModuleSlotType;
  tier: ModuleTier;
  craftingTier: number;
  levelRequirement: number;
  cost: EtherCost;
  stats: ModuleStatBonuses;
  description: string;
}

export interface InstalledModule {
  slotType: ModuleSlotType;
  slotIndex: number;
  moduleId: string;
}

export interface PlayerLoadout {
  hullTier: HullTierId;
  craftedModuleIds: string[];
  installedModules: InstalledModule[];
}

export type StationStorageSnapshot = {
  capacity: number;
  ether: Record<EtherType, number>;
  used: number;
};
