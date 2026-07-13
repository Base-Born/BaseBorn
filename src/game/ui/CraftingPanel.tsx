import { useMemo, useState } from "react";
import { ETHER_CONFIG } from "../data/etherConfig";
import type { EtherType } from "../data/etherTypes";
import type { ModuleSlotType } from "../data/stationTypes";
import type { GameSnapshot } from "../types";

const filters: Array<"all" | ModuleSlotType | "cargo"> = ["all", "weapon", "defense", "engine", "mining", "cargo", "utility", "core"];

export function CraftingPanel({
  snapshot,
  onCraft,
}: {
  snapshot: GameSnapshot;
  onCraft: (moduleId: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const station = snapshot.station.claimed;
  const crafted = new Set(snapshot.hull.craftedModuleIds);
  const recipes = useMemo(() => snapshot.hull.craftableModules.filter((module) => {
    if (filter === "all") return true;
    if (filter === "cargo") return module.id.includes("cargo");
    return module.slotType === filter;
  }), [filter, snapshot.hull.craftableModules]);
  if (!station) return null;

  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Crafting Tier</span>
          <strong>{station.craftingTier}</strong>
        </div>
      </header>
      <div className="stationFilters">
        {filters.map((entry) => <button className={filter === entry ? "active" : ""} key={entry} onClick={() => setFilter(entry)}>{entry}</button>)}
      </div>
      <div className="stationCardGrid">
        {recipes.length ? recipes.map((module) => (
          <article key={module.id}>
            <span>{module.slotType} / T{module.tier}</span>
            <strong>{module.name}</strong>
            <p>{module.description}</p>
            <small>{formatCost(module.cost)}</small>
            <button disabled={crafted.has(module.id)} onClick={() => onCraft(module.id)}>{crafted.has(module.id) ? "Crafted" : "Craft"}</button>
          </article>
        )) : <p className="stationEmptyState">Repair Crafting Online or raise station tier to unlock recipes.</p>}
      </div>
    </div>
  );
}

function formatCost(cost: Record<string, number | undefined>) {
  const fuel = Object.entries(cost).reduce((sum, [type, amount]) => sum + (amount ?? 0) * ETHER_CONFIG[type as EtherType].fuelPerUnit, 0);
  return fuel > 0 ? Math.ceil(fuel).toLocaleString() + " Station Fuel" : "No Fuel cost";
}
