import { useEffect, useState } from "react";
import type { GameSnapshot } from "../types";

export function StationOverviewPanel({
  snapshot,
  onTab,
  onRename,
}: {
  snapshot: GameSnapshot;
  onTab: (tab: string) => void;
  onRename: (name: string) => void;
}) {
  const station = snapshot.station.claimed;
  const [stationName, setStationName] = useState(station?.name ?? "");
  useEffect(() => setStationName(station?.name ?? ""), [station?.id, station?.name]);
  if (!station) return <p className="stationEmptyState">Claim a station to open command overview.</p>;

  const healthPct = station.maxHealth > 0 ? Math.round((station.health / station.maxHealth) * 100) : 0;
  const subsystemCounts = Object.values(station.subsystemStates).reduce((acc, subsystem) => {
    acc[subsystem.state] += 1;
    return acc;
  }, { online: 0, damaged: 0, disabled: 0, repairing: 0, offline: 0 } as Record<string, number>);
  const disabledSubsystems = subsystemCounts.disabled;
  const powerCoreTierName = ["Core Ether Reactor", "Damaged Core", "Stabilized Core", "Reinforced Core", "Charged Core", "Radiant Core", "Primal Core"][station.powerCoreLevel] ?? "Core Ether Reactor";

  return (
    <div className="stationCommandGrid">
      <article>
        <span>Station Status</span>
        <strong>{station.name}</strong>
        <p>
          Lv {station.level} / Hull {healthPct}% / Shield {Math.round(station.shield)} / Power Core {powerCoreTierName}
          {` / ${Math.round(station.powerUsed)} / ${Math.round(station.powerCapacity)}`}
          {station.powerOverloaded ? " (Overloaded)" : ""}
        </p>
      </article>
      <article className="stationRenameCard">
        <span>Station Callsign</span>
        <form onSubmit={(event) => {
          event.preventDefault();
          const name = stationName.trim();
          if (name) onRename(name);
        }}>
          <input value={stationName} onChange={(event) => setStationName(event.target.value)} maxLength={32} aria-label="Station name" />
          <button type="submit">Rename</button>
        </form>
        <p>New claims automatically use your pilot callsign.</p>
      </article>
      <article>
        <span>Current Objective</span>
        <strong>{snapshot.currentObjective?.title ?? "Free roam"}</strong>
        <p>{snapshot.objectiveHint || snapshot.currentObjective?.description || "Choose your next station task."}</p>
      </article>
      <article>
        <span>Repair Progress</span>
        <strong>{station.repairStageIndex}/{station.repairStageCount} stages</strong>
        <p>{station.currentRepairStage ? `Next: ${station.currentRepairStage.name}` : "Fully restored."}</p>
      </article>
      <article>
        <span>Station Fuel</span>
        <strong>{Math.floor(station.fuel.currentFuel).toLocaleString()} / {station.fuel.maxFuel.toLocaleString()}</strong>
        <p>Primary currency for repairs, ships, modules, defenses, and travel.</p>
      </article>
      <article>
        <span>Storage</span>
        <strong>{station.storage.used.toLocaleString()} / {station.storage.capacity.toLocaleString()}</strong>
        <p>Deposited Ether waiting for conversion.</p>
      </article>
      <article>
        <span>Defense</span>
        <strong>{station.selfDefenseEnabled ? "Online" : "Offline"}</strong>
        <p>{station.powerOverloaded
          ? `${station.powerOverloadReason} (${disabledSubsystems} systems disabled)`
          : (station.underAttack ? "Station under attack." : station.defenseLockReason || "Defense systems active.")}</p>
      </article>
      <article>
        <span>Subsystems</span>
        <strong>{subsystemCounts.online} online</strong>
        <p>{subsystemCounts.damaged} damaged / {subsystemCounts.disabled} disabled</p>
      </article>
      <article>
        <span>Station Booster</span>
        <strong>{station.localRelocationAvailable ? "Pilot online" : "Core offline"}</strong>
        <p>{station.localRelocationReason}</p>
      </article>
      <div className="stationQuickActions">
        <button onClick={() => onTab("storage")}>Deposit Cargo</button>
        <button onClick={() => onTab("fuel")}>Convert Fuel</button>
        <button onClick={() => onTab("repair")}>Repair Stage</button>
        <button onClick={() => onTab("defenses")}>Open Defenses</button>
        <button onClick={() => onTab("crafting")}>Open Crafting</button>
        <button onClick={() => onTab("loadout")}>Ship Upgrades</button>
      </div>
    </div>
  );
}