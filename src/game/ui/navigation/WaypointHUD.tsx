import { ArrowUp, Navigation, RadioTower, Ship } from "lucide-react";
import type { GameSnapshot } from "../../types";
import { KeyHint } from "../design/components";

export function WaypointHUD({ snapshot }: { snapshot: GameSnapshot }) {
  const claimed = snapshot.station.claimed;
  const finder = snapshot.stationFinder;
  const target = finder.visible ? { name: finder.stationName, distance: finder.distance, state: claimed ? (claimed.underAttack ? "UNDER ATTACK" : snapshot.stationInteraction.docked ? "DOCKED" : "TEAM BASE") : "BROKEN STATION" } : null;
  if (!target) return null;
  const arrowAngle = Math.atan2(finder.direction.y, finder.direction.x) * 180 / Math.PI + 90;
  const showArrow = target.distance > 700;
  return <>
    {showArrow && <div className="stationDirectionArrow" aria-label={`Waypoint direction ${finder.bearingLabel}`}><span style={{ transform: `rotate(${arrowAngle}deg)` }}><ArrowUp size={22} /></span></div>}
    <div className="waypointHud"><div>{claimed ? <RadioTower size={18}/> : <Navigation size={18}/>}</div><span>{target.state}</span><strong>{target.name}</strong><b>{Math.round(target.distance).toLocaleString()} m</b><small><Ship size={12}/>Waypoint active <KeyHint>V</KeyHint></small></div>
  </>;
}
