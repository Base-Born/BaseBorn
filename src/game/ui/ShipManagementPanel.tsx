import { BASE_SHIP_FRAMES, type BaseFrameType } from "../data/baseShipFrames";
import type { GameSnapshot } from "../types";

export function ShipManagementPanel({
  snapshot,
  onAcquire,
  onSwitch,
}: {
  snapshot: GameSnapshot;
  onAcquire: (frameId: BaseFrameType) => void;
  onSwitch: (shipId: string) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  const ownedModels = new Set(snapshot.fleet.ships.map((ship) => ship.model));
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
      <h3>Acquire Specialized Ship</h3>
      <div className="stationCardGrid">
        {BASE_SHIP_FRAMES.map((frame) => {
          const cost = frame.id === "balanced" ? 900 : frame.id === "tech" ? 1600 : 1200;
          return (
            <article key={frame.id}>
              <span>{frame.role}</span>
              <strong>{frame.name}</strong>
              <p>{frame.description}</p>
              <small>{cost.toLocaleString()} Station Fuel / Pilot level 10</small>
              <button disabled={!bayOnline || snapshot.level < 10 || ownedModels.has(frame.id) || snapshot.fleet.ships.length >= snapshot.fleet.hangarSlots} onClick={() => onAcquire(frame.id as BaseFrameType)}>
                {ownedModels.has(frame.id) ? "Owned" : "Acquire"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
