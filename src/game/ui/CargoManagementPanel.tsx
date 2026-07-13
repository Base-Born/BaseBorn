import { X } from "lucide-react";
import type { GameSnapshot } from "../types";
import { StationResourceRows } from "./StationResourceRows";

export function CargoManagementPanel({
  snapshot,
  onClose,
  onDrop,
  onTogglePickup,
}: {
  snapshot: GameSnapshot;
  onClose: () => void;
  onDrop: () => void;
  onTogglePickup: () => void;
}) {
  return (
    <section className="cargoManagementPanel">
      <header>
        <div>
          <span>Cargo Management</span>
          <strong>{snapshot.cargo.used.toLocaleString()} / {snapshot.cargo.capacity.toLocaleString()}</strong>
        </div>
        <button onClick={onClose}><X size={16} /></button>
      </header>
      <StationResourceRows ether={snapshot.cargo.ether} />
      <div className="cargoManagementActions">
        <button onClick={onTogglePickup}>Pickup {snapshot.cargoPickupEnabled ? "ON" : "OFF"} / H</button>
        <button disabled={!snapshot.nextCargoDrop} onClick={onDrop}>{snapshot.nextCargoDrop ? `Drop ${snapshot.nextCargoDrop.amount}` : "No cargo to drop"} / G</button>
      </div>
    </section>
  );
}
