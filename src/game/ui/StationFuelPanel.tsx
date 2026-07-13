import { ETHER_CONFIG } from "../data/etherConfig";
import type { EtherType } from "../data/etherTypes";
import type { GameSnapshot } from "../types";

export function StationFuelPanel({
  snapshot,
  onConvert,
}: {
  snapshot: GameSnapshot;
  onConvert: (type: EtherType) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  const converterIndex = station.repairStages.findIndex((stage) => stage.id === "fuelConverter");
  const converterOnline = station.repairStageIndex > converterIndex;

  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Station Fuel</span>
          <strong>{Math.floor(station.fuel.currentFuel).toLocaleString()} / {station.fuel.maxFuel.toLocaleString()}</strong>
        </div>
        <b>{Math.round(station.fuel.conversionEfficiency * 100)}% efficiency</b>
      </header>
      {!converterOnline && <p className="stationEmptyState">Repair the Fuel Converter to turn deposited Ether into upgrade currency.</p>}
      <div className="stationCardGrid stationFuelGrid">
        {(Object.keys(ETHER_CONFIG) as EtherType[]).map((type) => {
          const config = ETHER_CONFIG[type];
          const stored = station.storage.ether[type];
          const amount = Math.min(100, stored);
          const preview = amount * config.fuelPerUnit * station.fuel.conversionEfficiency;
          return (
            <article key={type} style={{ borderColor: config.displayColor }}>
              <span>{config.rarity}</span>
              <strong>{config.name}</strong>
              <p>{stored.toLocaleString()} stored</p>
              <small>100 Ether ? {(100 * config.fuelPerUnit).toLocaleString()} Fuel</small>
              <button disabled={!converterOnline || stored <= 0 || station.fuel.currentFuel >= station.fuel.maxFuel} onClick={() => onConvert(type)}>
                Convert {amount.toLocaleString()} ? {preview.toLocaleString()} Fuel
              </button>
            </article>
          );
        })}
      </div>
      <small>Ether cannot buy upgrades directly. Deposit it here, convert it, then spend Station Fuel while docked.</small>
    </div>
  );
}
