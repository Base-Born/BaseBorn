import { emptyEtherCargo, type CargoStorage } from "../data/etherTypes";
import { STATION_CONFIG } from "../data/stationConfig";
import type { Station } from "../data/stationTypes";
import { distance } from "../math";
import type { StationInteractionAction, StationInteractionSnapshot } from "../types";

export const EMPTY_STATION_INTERACTION: StationInteractionSnapshot = {
  visible: false,
  stationId: null,
  stationName: "",
  stationState: "No station nearby",
  ownershipState: "none",
  stationLevel: 0,
  health: 0,
  maxHealth: 0,
  docked: false,
  repairStageLabel: "",
  repairProgress: 0,
  storageUsed: 0,
  storageCapacity: 0,
  storageEther: emptyEtherCargo(),
  defenseStatus: "",
  distance: Infinity,
  primaryAction: null,
  actions: [],
  warningText: "",
};

export function createStationInteractionSnapshot({
  station,
  claimedStation,
  teamId,
  playerCargo,
  playerPosition,
  playerDockedStationId,
  playerDockingState,
  prompt,
}: {
  station: Station | null;
  claimedStation: Station | null;
  teamId: string | null;
  playerCargo: CargoStorage;
  playerPosition: { x: number; y: number };
  playerDockedStationId?: string | null;
  playerDockingState?: "free" | "docking" | "docked" | "undocking";
  prompt: string;
}): StationInteractionSnapshot {
  if (!station) return EMPTY_STATION_INTERACTION;
  const raidWarningActive = typeof station.raidWarningUntil === "number" && performance.now() < station.raidWarningUntil;
  const d = distance(playerPosition, station.pos);
  const owned = Boolean(teamId && station.ownerTeamId === teamId);
  const unclaimed = station.claimState === "unclaimed";
  const landed = owned && playerDockedStationId === station.id && playerDockingState === "docked";
  const animatingDock = owned && playerDockedStationId === station.id && (playerDockingState === "docking" || playerDockingState === "undocking");
  const visible = unclaimed ? d <= STATION_CONFIG.claimRadius * 1.35 : owned && (landed || animatingDock || d <= STATION_CONFIG.depositRadius * 1.35);
  if (!visible) return EMPTY_STATION_INTERACTION;

  const repairProgress = station.repairStages.length ? station.repairStageIndex / station.repairStages.length : 0;
  const nextStage = station.repairStages[station.repairStageIndex] ?? null;
  const warningText = !unclaimed && raidWarningActive
    ? "Raid Incoming"
    : !unclaimed && station.underAttack
      ? "Station Under Attack"
      : !unclaimed && station.health / Math.max(1, station.maxHealth) <= 0.35
        ? "Station hull critical"
        : "";

  const isSubsystemOfflineOrDisabled = (subsystemId: Station['subsystemStates'] extends never ? never : keyof Station['subsystemStates']) => {
    const state = (station.subsystemStates as any)?.[subsystemId]?.state;
    return state === "offline" || state === "disabled";
  };

  const landingPadsOffline = isSubsystemOfflineOrDisabled("landing_pads" as any);
  const storageOffline = isSubsystemOfflineOrDisabled("storage" as any);
  const powerCoreOffline = isSubsystemOfflineOrDisabled("power_core" as any);

  const subsystemForRepairStage: Record<string, any> = {
    coreSystems: "power_core",
    fuelConverter: "fuel_refinery",
    storage: "storage",
    shipUpgradeBay: "upgrade_console",
    crafting: "crafting_bay",
    defenses: "turrets",
    landingPads: "landing_pads",
    commandCore: "fleet_control_system",
    upgradeConsole: "upgrade_console",
    fullRestoration: "hyperdrive_system",
  };

  const actions: StationInteractionAction[] = [];
  if (unclaimed) {
    actions.push({ id: "claim", label: "Claim Station", kind: "claim", enabled: d <= STATION_CONFIG.claimRadius, hotkey: "F", priority: 100, lockReason: d > STATION_CONFIG.claimRadius ? "Move closer to the station beacon." : "" });
    actions.push({ id: "scan", label: "Scan Wreck", kind: "scan", enabled: true, priority: 20, lockReason: "" });
  } else if (owned) {
    const hasCargo = playerCargo.used > 0;

    const requiredRepairSubsystem = nextStage ? subsystemForRepairStage[nextStage.id] : null;
    const repairLockedBySubsystem = Boolean(requiredRepairSubsystem) && isSubsystemOfflineOrDisabled(requiredRepairSubsystem);

    actions.push({
      id: landed ? "launch" : "dock",
      label: landed || animatingDock ? "Undock" : "Dock",
      kind: landed ? "launch" : "dock",
      enabled: !animatingDock && d <= STATION_CONFIG.dockRadius && !landingPadsOffline,
      hotkey: animatingDock ? undefined : "F",
      priority: 130,
      lockReason: animatingDock
        ? "Docking sequence in progress."
        : landingPadsOffline
          ? "Landing pads offline."
          : d > STATION_CONFIG.dockRadius
            ? "Move closer to an unlocked landing pad."
            : "",
    });
    actions.push({ id: "open_command", label: "Station Command", kind: "open_command", enabled: landed, hotkey: landed ? "U" : undefined, priority: 100, lockReason: landed ? "" : "Dock inside the station to access command systems." });
    actions.push({
      id: "deposit",
      label: "Deposit Cargo",
      kind: "deposit",
      enabled: landed && hasCargo && !storageOffline,
      priority: hasCargo ? 90 : 40,
      lockReason: landed
        ? storageOffline
          ? "Storage subsystem offline."
          : hasCargo
            ? ""
            : "No Ether cargo to deposit."
        : "Dock before depositing cargo.",
    });
    actions.push({
      id: "repair",
      label: "Repair Stage",
      kind: "repair",
      enabled: landed && Boolean(nextStage) && !repairLockedBySubsystem,
      priority: 70,
      lockReason: landed
        ? repairLockedBySubsystem
          ? "Required subsystem offline."
          : nextStage
            ? ""
            : "Station restoration is complete."
        : "Dock before repairing the station.",
    });
    actions.push({ id: "move_base", label: "WASD Pilot", kind: "move_base", enabled: false, priority: 55, lockReason: landed ? station.localRelocationAvailable ? "Use WASD while docked to fly the station." : station.localRelocationReason : "Dock before moving the base." });
    actions.push({ id: "loadout", label: "Manage Loadout", kind: "loadout", enabled: landed, priority: 45, lockReason: landed ? "" : "Dock to access station loadout systems." });
  } else {
    actions.push({ id: "scan", label: "Scan Station", kind: "scan", enabled: false, priority: 20, lockReason: "This station belongs to another crew." });
  }

  const primaryAction = actions
    .filter((action) => action.enabled)
    .sort((a, b) => b.priority - a.priority)[0] ?? actions[0] ?? null;

  return {
    visible,
    stationId: station.id,
    stationName: station.name,
    stationState: unclaimed ? "Unclaimed Wreck" : owned && landed ? `Docked inside Team Base Lv ${station.level}` : animatingDock ? "Docking sequence" : owned ? "Team Base - Dock Required" : "Claimed Station",
    ownershipState: unclaimed ? "unclaimed" : owned ? "owned" : "other",
    stationLevel: station.level,
    health: Math.max(0, station.health),
    maxHealth: station.maxHealth,
    docked: landed,
    repairStageLabel: owned && !landed ? "station systems locked" : station.isFullyRepaired ? "Fully restored" : `${station.repairStageIndex}/${station.repairStages.length} repair stages`,
    repairProgress,
    storageUsed: owned && landed ? station.storage.used : 0,
    storageCapacity: owned && landed ? station.storage.capacity : 0,
    storageEther: owned && landed ? { ...station.storage.ether } : emptyEtherCargo(),
    defenseStatus: owned && !landed ? "Dock to access systems" : station.selfDefenseEnabled ? "Defenses online" : station.defensePowerLevel > 0 ? "Defenses installed" : "Defenses offline",
    distance: d,
    primaryAction,
    actions,
    warningText: warningText || prompt,
  };
}
