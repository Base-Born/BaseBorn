import { ETHER_TYPES } from "../data/etherTypes";
import type { GameSnapshot } from "../types";
import { getTotalEtherValue, StationResourceRows } from "./StationResourceRows";

export function StationStoragePanel({
  snapshot,
  onDeposit,
}: {
  snapshot: GameSnapshot;
  onDeposit: () => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Station Storage</span>
          <strong>{station.storage.used.toLocaleString()} / {station.storage.capacity.toLocaleString()}</strong>
        </div>
        <button disabled={snapshot.cargo.used <= 0} onClick={onDeposit}>Deposit All Cargo</button>
      </header>
      <div className="stationStorageColumns">
        <section>
          <h3>Stored Ether</h3>
          <StationResourceRows ether={station.storage.ether} />
          <b className="etherValue">Total Value {Math.floor(getTotalEtherValue(station.storage.ether)).toLocaleString()}</b>
        </section>
        <section>
          <h3>Ship Cargo</h3>
          <StationResourceRows ether={snapshot.cargo.ether} />
          <b className="etherValue">{snapshot.cargo.used.toLocaleString()} / {snapshot.cargo.capacity.toLocaleString()} carried</b>
        </section>
      </div>
      <small>Deposit Ether here, then use Fuel Conversion. Every Ether quality converts; rarer Ether is dramatically more efficient.</small>
    </div>
  );
}
