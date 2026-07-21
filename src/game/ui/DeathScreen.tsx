import { RotateCcw } from "lucide-react";
import type { GameSnapshot } from "../types";

export function DeathScreen({ snapshot, onRespawn }: { snapshot: GameSnapshot; onRespawn: () => void }) {
  const death = snapshot.playerDeathState;
  if (!death) return null;
  const stationAlive = death.stationRespawnAvailable && !snapshot.baseLostState;

  return (
    <div className="deathScreen">
      <RotateCcw size={28} />
      <h2>Ship destroyed.</h2>
      <p>All carried cargo dropped in space.</p>
      <strong>Respawn {stationAlive ? "at your spacecraft" : "in the outer safe zone"} when ready.</strong>
      <span>Ship level reduced from {death.oldLevel} to {death.newLevel}.</span>
      <span>{death.cargoDropped.toLocaleString()} Ether cargo dropped.</span>
      {!stationAlive && <em>{death.reasonIfRespawnBlocked || "Base lost. Claim a new station to restore team respawn."}</em>}
      {stationAlive && <em>Protect your base station. If it falls, everything connected to it is lost.</em>}
      <button className="deathScreen__respawn" onClick={onRespawn}><RotateCcw size={18} /> Respawn</button>
    </div>
  );
}
