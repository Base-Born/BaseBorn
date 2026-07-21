import type { GameSnapshot } from "../types";

export function ShipManagementPanel({
  snapshot,
  onSwitch,
}: {
  snapshot: GameSnapshot;
  onSwitch: (shipId: string) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  const bayIndex = station.repairStages.findIndex((stage) => stage.id === "shipUpgradeBay");
  const bayOnline = station.repairStageIndex > bayIndex;

  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Personal Hangar</span>
          <strong>{snapshot.fleet.ships.length} / {snapshot.fleet.hangarSlots} ships</strong>
        </div>
        <b>{bayOnline ? "Ship Upgrade Bay online" : "Bay offline"}</b>
      </header>
      <div className="stationCardGrid">
        {snapshot.fleet.ships.map((ship) => (
          <article key={ship.id}>
            <span>{ship.isMothership ? "Personal Mothership" : ship.id === snapshot.fleet.activeShipId ? "Active Ship" : "Stored Ship"}</span>
            <strong>{ship.name}</strong>
            <p>{ship.model} / Hull Tier {ship.hullTier} / Cargo {ship.cargo.used.toLocaleString()}</p>
            <small>{ship.mothershipEligible ? "Eligible for mothership transformation" : "Reach level 100 with a Tier-7 hull"}</small>
            <button disabled={ship.id === snapshot.fleet.activeShipId || ship.isMothership} onClick={() => onSwitch(ship.id)}>
              {ship.id === snapshot.fleet.activeShipId ? "Active" : ship.isMothership ? "Deployed Structure" : "Switch Ship"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
