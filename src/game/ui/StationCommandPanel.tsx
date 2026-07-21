import { X } from "lucide-react";
import { ETHER_TYPES } from "../data/etherTypes";
import type { StationSubsystemId, StationUpgradeCategory } from "../data/stationTypes";
import type { GameSnapshot } from "../types";
import { CraftingPanel } from "./CraftingPanel";
import { LandingPadsPanel } from "./LandingPadsPanel";
import { MothershipManagementPanel } from "./MothershipManagementPanel";
import { ShipLoadoutPanel } from "./ShipLoadoutPanel";
import { StationDefensePanel } from "./StationDefensePanel";
import { StationOverviewPanel } from "./StationOverviewPanel";
import { StationRepairPanel } from "./StationRepairPanel";
import { StationFuelPanel } from "./StationFuelPanel";
import { StationStoragePanel } from "./StationStoragePanel";
import { StationTabs, type StationTabId } from "./StationTabs";
import { TeamPanel } from "./TeamPanel";
import type { Vec2 } from "../types";
import { ShipManagementPanel } from "./ShipManagementPanel";

export function StationCommandPanel({
  snapshot,
  activeTab,
  onTabChange,
  onClose,
  onDeposit,
  onRepair,
  onRepairSubsystem,
  onUpgradeDefense,
  onCraftModule,
  onSwitchShip,
  onInstallModule,
  onRelocateBase,
  onConvertFuel,
  onTransformMothership,
  onStartHyperdrive,
  onRenameStation,
}: {
  snapshot: GameSnapshot;
  activeTab: StationTabId;
  onTabChange: (tab: StationTabId) => void;
  onClose: () => void;
  onDeposit: () => void;
  onRepair: () => void;
  onRepairSubsystem: (subsystemId: StationSubsystemId) => void;
  onUpgradeDefense: (category: StationUpgradeCategory) => void;
  onCraftModule: (moduleId: string) => void;
  onSwitchShip: (shipId: string) => void;
  onInstallModule: (moduleId: string) => void;
  onRelocateBase: () => void;
  onConvertFuel: (type: keyof typeof ETHER_TYPES) => void;
  onTransformMothership: () => void;
  onStartHyperdrive: (destination: Vec2) => void;
  onRenameStation: (name: string) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  return (
    <div className="stationCommandBackdrop">
      <section className="stationCommandPanel" role="dialog" aria-modal="true" aria-label="Spacecraft Systems">
        <header className="stationCommandHeader">
          <div>
            <span>Spacecraft Systems</span>
            <strong>{station.name}</strong>
          </div>
          <div className="stationCommandHeader__stats">
            <span>Lv {station.level}</span>
            <span>{Math.round(station.health)} / {Math.round(station.maxHealth)} Hull</span>
            <span>{station.repairStageIndex}/{station.repairStageCount} Repairs</span>
          </div>
          <button onClick={onClose} aria-label="Close spacecraft systems"><X size={18} /></button>
        </header>
        <div className="stationCommandBody">
          <StationTabs active={activeTab} onChange={onTabChange} />
          <main>
            {activeTab === "overview" && <StationOverviewPanel snapshot={snapshot} onTab={(tab) => onTabChange(tab as StationTabId)} onRename={onRenameStation} />}
            {activeTab === "storage" && <StationStoragePanel snapshot={snapshot} onDeposit={onDeposit} />}
            {activeTab === "fuel" && <StationFuelPanel snapshot={snapshot} onConvert={onConvertFuel} />}
            {activeTab === "repair" && (
              <StationRepairPanel snapshot={snapshot} onRepair={onRepair} onRepairSubsystem={onRepairSubsystem} />
            )}
            {activeTab === "defenses" && <StationDefensePanel snapshot={snapshot} onUpgrade={onUpgradeDefense} />}
            {activeTab === "crafting" && <CraftingPanel snapshot={snapshot} onCraft={onCraftModule} />}
            {activeTab === "ships" && <ShipManagementPanel snapshot={snapshot} onSwitch={onSwitchShip} />}
            {activeTab === "loadout" && <ShipLoadoutPanel snapshot={snapshot} onInstall={onInstallModule} />}
            {activeTab === "landing" && <LandingPadsPanel snapshot={snapshot} onRelocateBase={onRelocateBase} />}
            {activeTab === "team" && <TeamPanel snapshot={snapshot} />}
            {activeTab === "mothership" && (
              <MothershipManagementPanel
                snapshot={snapshot}
                onConvertFuel={onConvertFuel}
                onTransform={onTransformMothership}
                onStartHyperdrive={onStartHyperdrive}
              />
            )}
          </main>
        </div>
      </section>
    </div>
  );
}
