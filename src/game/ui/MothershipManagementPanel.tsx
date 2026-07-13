import { ETHER_TYPES, type EtherType } from "../data/etherTypes";
import type { GameSnapshot } from "../types";
import type { Vec2 } from "../types";

const requirements = [
  "Station fully repaired",
  "Station level 100",
  "Ship level 100",
  "Tier 7 hull",
  "Mothership Core crafted",
  "Transformation paid",
];

export function MothershipManagementPanel({
  snapshot,
  onConvertFuel,
  onTransform,
  onStartHyperdrive,
}: {
  snapshot: GameSnapshot;
  onConvertFuel: (type: EtherType) => void;
  onTransform: () => void;
  onStartHyperdrive: (destination: Vec2) => void;
}) {
  const station = snapshot.station.claimed;
  if (!station) return null;
  const unlocked = station.mothershipUnlocked;
  const powerCoreOk = station.subsystemStates?.power_core?.state !== "disabled" && station.subsystemStates?.power_core?.state !== "offline";
  const hyperdriveSystemOk = station.subsystemStates?.hyperdrive_system?.state !== "disabled" && station.subsystemStates?.hyperdrive_system?.state !== "offline";
  const canStartHyperdrive = unlocked && powerCoreOk && hyperdriveSystemOk && station.hyperdriveState === "idle" && !station.underAttack && !station.powerOverloaded;

  const now = performance.now();
  const chargingEndsAt = station.hyperdriveChargeStartedAt && station.hyperdriveChargeDurationMs
    ? station.hyperdriveChargeStartedAt + station.hyperdriveChargeDurationMs
    : undefined;
  const chargingRemainingMs = chargingEndsAt ? Math.max(0, chargingEndsAt - now) : null;
  const chargingRemainingSeconds = chargingRemainingMs != null ? Math.ceil(chargingRemainingMs / 1000) : null;
  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Mothership / Hyperdrive</span>
          <strong>{unlocked ? station.hyperdriveState : "Locked"}</strong>
        </div>
        <b>{Math.floor(station.fuel.currentFuel).toLocaleString()} Station Fuel</b>
      </header>
      {!unlocked && (
        <div className="stationRequirementList">
          {requirements.map((requirement) => <span key={requirement}>{requirement}</span>)}
        </div>
      )}

      {unlocked && (
        <div className="stationCommandRow">
          <button
            className="fuelPanel__primary"
            onClick={() => onStartHyperdrive({ ...snapshot.minimap.player })}
            disabled={!canStartHyperdrive}
            title="Warp toward your current ship position"
          >
            {station.hyperdriveState === "charging" ? `Charging (${chargingRemainingSeconds ?? "?"}s)` : "Start Hyperdrive Charge"}
          </button>
        </div>
      )}

      {unlocked && station.hyperdriveLastInterruptReason && (
        <small className="stationHyperdriveInterrupt">{station.hyperdriveLastInterruptReason}</small>
      )}

      {!unlocked && (
        <div className="stationCommandRow">
          <button className="fuelPanel__primary" onClick={onTransform}>
            Transform to Mothership
          </button>
        </div>
      )}

      <div className="fuelPanel fuelPanel--command">
        <header>
          <span>Station Fuel powers hyperdrive</span>
          <b>{Math.floor(station.fuel.currentFuel)}</b>
        </header>
        <div>
          {(Object.keys(ETHER_TYPES) as EtherType[]).map((type) => (
            <button key={type} onClick={() => onConvertFuel(type)}>100 {ETHER_TYPES[type].label.replace(" Ether", "")}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
