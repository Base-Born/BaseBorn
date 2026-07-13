import { ETHER_TYPES } from "../data/etherTypes";
import type { CargoStorage } from "../data/etherTypes";

export function CargoHUD({ cargo, cargoFull, pickupEnabled = true, nextDrop = null, onOpen }: { cargo: CargoStorage; cargoFull: boolean; pickupEnabled?: boolean; nextDrop?: { type: string; amount: number } | null; onOpen?: () => void }) {
  const entries = Object.entries(cargo.ether).filter(([, amount]) => amount > 0);
  const usedPercent = cargo.capacity > 0 ? (cargo.used / cargo.capacity) * 100 : 0;
  const title = Object.entries(cargo.ether)
    .map(([type, amount]) => `${ETHER_TYPES[type as keyof typeof ETHER_TYPES].label}: ${amount}`)
    .join("\n");
  const nextDropText = nextDrop ? `G: Drop ${nextDrop.amount} ${ETHER_TYPES[nextDrop.type as keyof typeof ETHER_TYPES].label}` : "G: No cargo to drop";

  return (
    <aside className={cargoFull ? "cargoHud cargoHud--full" : "cargoHud"} title={title} onClick={onOpen}>
      <header>
        <span>Ether Cargo</span>
        <strong>{cargo.used}/{cargo.capacity}</strong>
      </header>
      <div className="cargoHud__bar"><i style={{ width: `${Math.min(100, usedPercent)}%` }} /></div>
      <small>Cargo Pickup: {pickupEnabled ? "ON" : "OFF"}</small>
      {entries.length > 0 && (
        <div className="cargoHud__types">
          {entries.slice(0, 3).map(([type, amount]) => (
            <b key={type} style={{ color: ETHER_TYPES[type as keyof typeof ETHER_TYPES].color }}>{amount} {ETHER_TYPES[type as keyof typeof ETHER_TYPES].label.replace(" Ether", "")}</b>
          ))}
        </div>
      )}
      {entries.length === 0 && <small>No Ether cargo</small>}
      <small>{nextDropText}</small>
      <button className="cargoHud__manage" onClick={onOpen}>Manage Cargo</button>
      {cargoFull && <em>Cargo Full</em>}
    </aside>
  );
}
