import { getHullTier } from "../data/hullTiers";
import { getModuleDefinition } from "../data/shipModules";
import type { GameSnapshot } from "../types";

export function ShipLoadoutPanel({
  snapshot,
  onInstall,
}: {
  snapshot: GameSnapshot;
  onInstall: (moduleId: string) => void;
}) {
  const hull = getHullTier(snapshot.hull.current.tier);
  const installedIds = new Set(snapshot.hull.installedModules.map((entry) => entry.moduleId));
  const craftedModules = snapshot.hull.craftedModuleIds.map(getModuleDefinition).filter(Boolean);
  return (
    <div className="stationCommandSection">
      <div className="stationDefenseSummary">
        <span>Frame <b>{snapshot.baseFrame.name}</b></span>
        <span>Hull <b>{snapshot.hull.current.name}</b></span>
        <span>Tier <b>{snapshot.hull.current.tier}/7</b></span>
      </div>
      <h3>Module Slots</h3>
      <div className="stationSlotGrid">
        {Object.entries(hull.slots).map(([slot, count]) => (
          <span key={slot}>{slot}<b>{snapshot.hull.installedModules.filter((entry) => entry.slotType === slot).length}/{count}</b></span>
        ))}
      </div>
      <h3>Crafted Modules</h3>
      <div className="stationCardGrid">
        {craftedModules.length ? craftedModules.map((module) => module && (
          <article key={module.id}>
            <span>{module.slotType} / T{module.tier}</span>
            <strong>{module.name}</strong>
            <p>{module.description}</p>
            <button disabled={installedIds.has(module.id)} onClick={() => onInstall(module.id)}>{installedIds.has(module.id) ? "Installed" : "Install"}</button>
          </article>
        )) : <p className="stationEmptyState">Craft station modules to manage advanced loadout here.</p>}
      </div>
    </div>
  );
}
