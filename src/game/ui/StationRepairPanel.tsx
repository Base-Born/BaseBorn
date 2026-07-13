import type { EtherCost } from "../data/etherTypes";
import { ETHER_TYPES } from "../data/etherTypes";
import type { GameSnapshot } from "../types";
import type { StationSubsystemId } from "../data/stationTypes";

export function StationRepairPanel({
  snapshot,
  onRepair,
  onRepairSubsystem,
}: {
  snapshot: GameSnapshot;
  onRepair: () => void;
  onRepairSubsystem: (subsystemId: StationSubsystemId) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  return (
    <div className="stationRepairContainer">
      <div className="stationRepairTrack">
      {station.repairStages.map((stage, index) => {
        const completed = index < station.repairStageIndex;
        const active = index === station.repairStageIndex;
        const componentsReady = Object.entries(stage.cost).every(([type, amount]) => station.storage.ether[type as keyof typeof station.storage.ether] >= (amount ?? 0));
        const canRepair = active && station.fuel.currentFuel >= stage.fuelCost && componentsReady;
        return (
          <article className={completed ? "completed" : active ? "active" : "locked"} key={stage.id}>
            <span>{completed ? "Repaired" : canRepair ? "Available" : active ? "Needs resources" : "Locked"}</span>
            <strong>{index + 1}. {stage.name}</strong>
            <p>{stage.unlocks.join(" / ")}</p>
            <small>{stage.fuelCost.toLocaleString()} Station Fuel{Object.keys(stage.cost).length ? " + " + formatCost(stage.cost) : ""}</small>
            <button disabled={!canRepair} onClick={onRepair}>{completed ? "Complete" : canRepair ? "Repair Stage" : active ? "Insufficient Fuel / Components" : "Locked"}</button>
          </article>
        );
      })}
      </div>

      <div className="stationSubsystemRepair">
        <header>
          <span>Subsystem Damage</span>
          <small>Repair disables/restore power availability</small>
        </header>
        <div className="stationSubsystemGrid">
          {Object.entries(station.subsystemStates).map(([id, s]) => {
            const healthPct = s.maxHealth > 0 ? Math.round((s.health / s.maxHealth) * 100) : 0;
            const stateLabel = s.state;
            return (
              <article key={id} className={s.state === "online" ? "online" : s.state === "disabled" ? "disabled" : "damaged"}>
                <span>{id.replace(/_/g, ' ')}</span>
                <strong>{healthPct}%</strong>
                <p>{stateLabel}</p>
                <button disabled={s.state === "online"} onClick={() => onRepairSubsystem(id as StationSubsystemId)}>
                  Repair
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatCost(cost: EtherCost) {
  const entries = Object.entries(cost).filter(([, amount]) => (amount ?? 0) > 0);
  if (!entries.length) return "No component cost";
  return entries.map(([type, amount]) => `${amount} ${ETHER_TYPES[type as keyof typeof ETHER_TYPES].label.replace(" Ether", "")}`).join(" / ");
}
