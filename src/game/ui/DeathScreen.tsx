import { TimerReset } from "lucide-react";
import type { GameSnapshot } from "../types";

export function DeathScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const death = snapshot.playerDeathState;
  if (!death) return null;
  const remainingMs = Math.max(0, death.respawnAvailableAt - performance.now());
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.ceil((remainingMs % 60000) / 1000);
  const countdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const stationAlive = death.stationRespawnAvailable && !snapshot.baseLostState;

  return (
    <div className="deathScreen">
      <TimerReset size={28} />
      <h2>Ship destroyed.</h2>
      <p>All carried cargo dropped in space.</p>
      <strong>Respawning {stationAlive ? "at base station" : "in outer safe zone"} in {countdown}</strong>
      <span>Ship level reduced from {death.oldLevel} to {death.newLevel}.</span>
      <span>{death.cargoDropped.toLocaleString()} Ether cargo dropped.</span>
      {!stationAlive && <em>{death.reasonIfRespawnBlocked || "Base lost. Claim a new station to restore team respawn."}</em>}
      {stationAlive && <em>Protect your base station. If it falls, everything connected to it is lost.</em>}
    </div>
  );
}
