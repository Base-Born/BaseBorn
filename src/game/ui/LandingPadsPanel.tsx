import type { GameSnapshot } from "../types";

const unlocks = [1, 10, 25, 40, 60, 80];

export function LandingPadsPanel({
  snapshot,
  onRelocateBase: _onRelocateBase,
}: {
  snapshot: GameSnapshot;
  onRelocateBase: () => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Station Booster</span>
          <strong>{station.localRelocationAvailable ? "Pilot online" : "Core offline"}</strong>
        </div>
        <button disabled title={station.localRelocationReason}>WASD Pilot</button>
      </header>
      <p>{station.localRelocationReason}</p>
      <div className="stationCardGrid stationCardGrid--pads">
        {unlocks.map((level, index) => {
          const unlocked = index < station.landingPadsUnlocked;
          return (
            <article className={unlocked ? "completed" : "locked"} key={level}>
              <span>{unlocked ? "Unlocked" : `Station Lv ${level}`}</span>
              <strong>Landing Pad {index + 1}</strong>
              <p>{unlocked ? "Docking and team respawn support available." : `Reach station level ${level} to unlock this pad.`}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
