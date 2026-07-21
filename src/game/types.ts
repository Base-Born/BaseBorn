import type { StatKey } from "./data/stats";
import type { EvolutionChoice } from "./systems/UpgradeAvailabilitySystem";
import type { LeaderboardEntry } from "./types/leaderboardTypes";
import type { CargoStorage } from "./data/etherTypes";
import type { LootRegionId } from "./data/lootRegionConfig";
import type { HullTier, InstalledModule, ShipModuleDefinition, Station, StationDefenseStats, StationFuelState, StationUpgrade, Team } from "./data/stationTypes";
import type { BaseShipFrame } from "./data/baseShipFrames";
import type { Objective } from "./data/objectives";
import type { PlayerDeathState } from "./systems/RespawnSystem";
import type { OwnedShip } from "./systems/ShipOwnershipSystem";
import type { BaseLostState } from "./data/stationTypes";
import type { BuildIdentitySnapshot } from "./data/buildIdentity";
import type { MultiplayerSnapshot } from "./network/protocol";

export type Vec2 = { x: number; y: number };
export type Owner = "player" | "enemy";
export type BotRole = "farmer" | "aggressor" | "sniper" | "rammer" | "carrier" | "coward";
export type AlienDefenderType = "sentinel" | "interceptor" | "beam_guard" | "mine_warden" | "carrier" | "core_guardian";
export type ProjectileKind = "plasma" | "rail" | "missile" | "mine" | "drone" | "orbit" | "split" | "gravity";

export type PlanetOwner = "neutral" | "player" | "enemy";
export type MinimapShipOwner = "player" | "teammate" | "enemy";
export type Planet = { id: string; name: string; pos: Vec2; radius: number; owner: PlanetOwner; discovered: boolean; rare: boolean; color: string };

export type StationInteractionActionKind =
  | "claim"
  | "dock"
  | "launch"
  | "deposit"
  | "open_command"
  | "repair_wreck"
  | "repair"
  | "craft"
  | "loadout"
  | "defenses"
  | "scan"
  | "fuel"
  | "mothership"
  | "move_base";

export type StationInteractionAction = {
  id: string;
  label: string;
  kind: StationInteractionActionKind;
  enabled: boolean;
  hotkey?: string;
  lockReason?: string;
  priority: number;
  danger?: boolean;
};

export type StationInteractionSnapshot = {
  visible: boolean;
  stationId: string | null;
  stationName: string;
  stationState: string;
  ownershipState: "unclaimed" | "owned" | "other" | "none";
  stationLevel: number;
  health: number;
  maxHealth: number;
  docked: boolean;
  repairStageLabel: string;
  repairProgress: number;
  storageUsed: number;
  storageCapacity: number;
  storageEther: CargoStorage["ether"];
  defenseStatus: string;
  distance: number;
  primaryAction: StationInteractionAction | null;
  actions: StationInteractionAction[];
  warningText: string;
};

export type StationFinderSnapshot = {
  visible: boolean;
  stationId: string | null;
  stationName: string;
  distance: number;
  direction: Vec2;
  bearingLabel: string;
  scannerActive: boolean;
  pulseReady: boolean;
  hint: string;
};

export type Customization = {
  name: string;
  shipColor: string;
  glowColor: string;
  trailColor: string;
  projectileColor: string;
  wingVariant: "delta" | "swept" | "fork";
  cockpitVariant: "needle" | "dome" | "split";
  decalPattern: "none" | "stripe" | "chevron";
  thrusterStyle: "ion" | "flare" | "pulse";
  glowIntensity: number;
};

export type GameSnapshot = {
  playerName: string;
  level: number;
  xp: number;
  nextXp: number;
  score: number;
  statPoints: number;
  upgradePoints: number;
  health: number;
  maxHealth: number;
  shieldHealth: number;
  maxShield: number;
  shipClass: string;
  shipClassId: string;
  currentBranch: string;
  availableUpgradeIds: string[];
  evolutionChoices: EvolutionChoice[];
  upgradeHistory: string[];
  stats: Record<StatKey, number>;
  baseFrame: BaseShipFrame;
  shipUpgradeStats: Array<{
    statKey: StatKey;
    normalLevel: number;
    hyperLevel: number;
    maxNormalLevel: number;
    maxHyperLevel: number;
    totalLevel: number;
    isHyperUnlocked: boolean;
    fuelCost: number;
    lockReason: string;
  }>;
  effectiveShipStats: {
    maxHealth: number;
    maxShield: number;
    movementMultiplier: number;
    bodyDamageMultiplier: number;
    repairPerSecond: number;
    thrusterVisualScale: number;
  };
  effectiveModuleStats: {
    projectileSpeedMultiplier: number;
    droneSpeedMultiplier: number;
    damageMultiplier: number;
    droneDamageMultiplier: number;
    reloadMultiplier: number;
  };
  leaderboard: LeaderboardEntry[];
  multiplayer: MultiplayerSnapshot;
  buildSummary: string;
  buildIdentity: BuildIdentitySnapshot;
  upgradeFeedback: { title: string; before: string; after: string; visualChange: string; drawback: string } | null;
  fleet: {
    activeShipId: string;
    hangarSlots: number;
    ships: OwnedShip[];
  };
  hull: {
    current: HullTier;
    next: HullTier | null;
    canUpgrade: boolean;
    craftedModuleIds: string[];
    installedModules: InstalledModule[];
    craftableModules: ShipModuleDefinition[];
  };
  station: {
    claimed: (Pick<Station, "id" | "name" | "pos" | "radius" | "claimState" | "ownerTeamId" | "ownerPlayerId" | "level" | "health" | "maxHealth" | "isMobile" | "mothershipUnlocked"> & {
      storage: CargoStorage;
      fuel: StationFuelState;
      repairStageIndex: number;
      repairStageCount: number;
      currentRepairStage: Station["repairStages"][number] | null;
      repairStages: Station["repairStages"];
      completedRepairStages: string[];
      isFullyRepaired: boolean;
      craftingTier: number;
      movementLockReason: string;
      localRelocationAvailable: boolean;
      localRelocationReason: string;
      defenseSlotsUnlocked: number;
      landingPadsUnlocked: number;
      etherFuel: number;
      hyperdriveState: string;
      hyperdriveChargeStartedAt?: number;
      hyperdriveCooldownUntil?: number;
      hyperdriveChargeDurationMs?: number;
      hyperdriveLastInterruptReason?: string;
      upgrades: StationUpgrade[];
      defenseStats: StationDefenseStats;
      selfDefenseEnabled: boolean;
      defenseLockReason: string;
      underAttack: boolean;
      shield: number;
      powerCoreLevel: number;
      powerCapacity: number;
      powerUsed: number;
      powerOverloaded: boolean;
      powerOverloadReason: string;
      subsystemStates: Station["subsystemStates"];
    }) | null;
    nearby: Pick<Station, "id" | "name" | "pos" | "radius" | "claimState" | "ownerTeamId" | "ownerPlayerId" | "level" | "health" | "maxHealth" | "isMobile" | "mothershipUnlocked"> | null;
    interactionPrompt: string;
    team: Team | null;
  };
  autoFire: boolean;
  autoThrottle: boolean;
  evolutionAvailable: boolean;
  cargo: CargoStorage;
  cargoFull: boolean;
  cargoPickupEnabled: boolean;
  nextCargoDrop: { type: string; amount: number } | null;
  currentObjective: Objective | null;
  objectiveProgress: string;
  objectiveHint: string;
  playerDeathState: PlayerDeathState | null;
  baseLostState: BaseLostState | null;
  stationHealthWarning: string;
  stationInteraction: StationInteractionSnapshot;
  stationFinder: StationFinderSnapshot;
  zone: {
    id: LootRegionId;
    displayName: string;
    pvpEnabled: boolean;
    lootDescription: string;
    statusText: string;
  };
  zoneNotification: { text: string; visible: boolean };
  mode: "playing" | "respawning" | "gameover";
  minimap: {
    player: Vec2 & { angle: number };
    ships: Array<{ id: string; pos: Vec2; angle: number; owner: MinimapShipOwner }>;
    planets: Array<{ id: string; name: string; pos: Vec2; owner: PlanetOwner; discovered: boolean; rare: boolean }>;
    aliens: Array<{ id: string; pos: Vec2; type: AlienDefenderType; state: "patrol" | "warning" | "attacking" | "returning" }>;
    stations: Array<{
      id: string;
      name: string;
      pos: Vec2;
      claimState: "unclaimed" | "contested" | "claimed";
      ownerTeamId: string | null;
      isMobile: boolean;
      mothershipUnlocked: boolean;
      level: number;
      health: number;
      maxHealth: number;
      underAttack: boolean;
    }>;
    asteroidBelts: Array<{
      id: string;
      name: string;
      type: string;
      minRadiusFromCenter: number;
      maxRadiusFromCenter: number;
      angleStart: number;
      angleEnd: number;
      minimapColor: string;
      dangerLevel: number;
    }>;
  };
};
