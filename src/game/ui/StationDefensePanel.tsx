import { ETHER_CONFIG } from "../data/etherConfig";
import type { EtherType } from "../data/etherTypes";
import type { StationUpgradeCategory } from "../data/stationTypes";
import type { GameSnapshot } from "../types";

export function StationDefensePanel({
  snapshot,
  onUpgrade,
}: {
  snapshot: GameSnapshot;
  onUpgrade: (category: StationUpgradeCategory) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  return (
    <div className="stationCommandSection">
      <div className="stationDefenseSummary">
        <span>Self-defense <b>{station.selfDefenseEnabled ? "Online" : "Offline"}</b></span>
        <span>Turret <b>{Math.round(station.defenseStats.turretDamage)}</b></span>
        <span>Shield <b>{Math.round(station.defenseStats.shieldCapacity)}</b></span>
        <span>Range <b>{Math.round(station.defenseStats.defenseRange)}</b></span>
      </div>
      <div className="stationCardGrid">
        {station.upgrades.map((upgrade) => (
          <article key={upgrade.id}>
            <span>{upgrade.unlocked ? upgrade.level > 0 ? "Installed" : "Available" : "Locked"}</span>
            <strong>{upgrade.name}</strong>
            <p>{upgrade.description}</p>
            <small>{upgrade.level >= upgrade.maxLevel ? "Maxed" : formatCost(upgrade.upgradeCost)}</small>
            <button disabled={!upgrade.unlocked || upgrade.level >= upgrade.maxLevel} onClick={() => onUpgrade(upgrade.category)}>
              {upgrade.level > 0 ? "Upgrade" : "Install"} / Lv {upgrade.level}/{upgrade.maxLevel}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatCost(cost: Record<string, number | undefined>) {
  const fuel = Object.entries(cost).reduce((sum, [type, amount]) => sum + (amount ?? 0) * ETHER_CONFIG[type as EtherType].fuelPerUnit, 0);
  return Math.ceil(fuel).toLocaleString() + " Station Fuel";
}
