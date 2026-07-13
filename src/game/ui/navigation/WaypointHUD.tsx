import { Navigation, RadioTower, Ship } from "lucide-react";
import type { GameSnapshot } from "../../types";
import { KeyHint } from "../design/components";

export function WaypointHUD({ snapshot }: { snapshot: GameSnapshot }) {
  const claimed = snapshot.station.claimed;
  const finder = snapshot.stationFinder;
  const target = claimed ? { name: claimed.name, distance: Math.hypot(claimed.pos.x - snapshot.minimap.player.x, claimed.pos.y - snapshot.minimap.player.y), state: claimed.underAttack ? "UNDER ATTACK" : snapshot.stationInteraction.docked ? "DOCKED" : "TEAM BASE" } : finder.visible ? { name: finder.stationName, distance: finder.distance, state: "BROKEN STATION" } : null;
  if (!target) return null;
  return <div className="waypointHud"><div>{claimed ? <RadioTower size={18}/> : <Navigation size={18}/>}</div><span>{target.state}</span><strong>{target.name}</strong><b>{Math.round(target.distance).toLocaleString()} m</b><small><Ship size={12}/>Return route active <KeyHint>V</KeyHint></small></div>;
}
