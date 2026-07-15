import { Boxes, Crosshair, Fuel, Map, Radio, Settings, Shield, Ship, Zap } from "lucide-react";
import type { GameSnapshot } from "../../types";
import { getControlHint } from "../../input/ControlBindings";
import { HUDCard, IconButton, KeyHint, ProgressBar, StatusBadge } from "../design/components";
import { Minimap } from "../Minimap";
import { VehicleHUD } from "./VehicleHUD";
import { WaypointHUD } from "../navigation/WaypointHUD";
import { UpgradeCompletionOverlay } from "../feedback/UpgradeCompletionOverlay";

export function GameplayHUD({ snapshot, shipUpgradesAvailable, onOpenCargo, onOpenCommand, onOpenShip, onOpenGuide, onToggleAutoFire, onToggleAutoThrottle }: { snapshot: GameSnapshot; shipUpgradesAvailable: boolean; onOpenCargo: () => void; onOpenCommand: () => void; onOpenShip: () => void; onOpenGuide: () => void; onToggleAutoFire: () => void; onToggleAutoThrottle: () => void }) {
  const objective = snapshot.currentObjective;
  const xpPercent = snapshot.nextXp > 0 ? snapshot.xp / snapshot.nextXp * 100 : 100;
  const station = snapshot.station.claimed;
  return <div className="gameUiLayer" aria-label="Gameplay HUD">
    <HUDCard className="pilotHud"><div className="pilotHud__level"><span>LV</span><b>{snapshot.level}</b></div><div><strong>{snapshot.baseFrame.name}</strong><span>{snapshot.shipClass}</span><ProgressBar value={xpPercent} max={100} label="Pilot XP"/><small>{Math.floor(snapshot.xp).toLocaleString()} / {Math.floor(snapshot.nextXp).toLocaleString()} XP</small></div><StatusBadge tone={snapshot.zone.pvpEnabled ? "danger" : "success"}>{snapshot.zone.pvpEnabled ? "PVP" : "SAFE"}{snapshot.multiplayer.status === "online" ? ` · ${snapshot.multiplayer.playerCount}` : ""}</StatusBadge></HUDCard>
    {objective && <HUDCard className="missionHud"><header><span>ACTIVE OBJECTIVE</span><b>{objective.category}</b></header><strong>{objective.title}</strong><p>{objective.description}</p>{objective.targetAmount && <ProgressBar value={objective.currentAmount ?? 0} max={objective.targetAmount}/>}<small>{snapshot.objectiveProgress || snapshot.objectiveHint}</small></HUDCard>}
    <div className="mapHud"><div className="mapHud__header"><span><Map size={14}/>SECTOR MAP</span><b>{snapshot.zone.displayName}</b></div><Minimap snapshot={snapshot}/></div>
    <WaypointHUD snapshot={snapshot}/>
    <div className="vehicleHudSlot"><VehicleHUD snapshot={snapshot}/></div>
    <HUDCard className="cargoCompact" role="button" onClick={onOpenCargo}><header><span><Boxes size={14}/>CARGO</span><b>{snapshot.cargo.used} / {snapshot.cargo.capacity}</b></header><ProgressBar value={snapshot.cargo.used} max={snapshot.cargo.capacity} tone={snapshot.cargoFull ? "danger" : "accent"}/><footer><span>Pickup {snapshot.cargoPickupEnabled ? "ON" : "OFF"}</span><KeyHint>{getControlHint("cargoPickup")}</KeyHint></footer>{snapshot.cargoFull && <StatusBadge tone="danger">FULL</StatusBadge>}</HUDCard>
    {station && <HUDCard className="stationCompact"><header><span><Radio size={14}/>TEAM BASE</span><StatusBadge tone={station.underAttack ? "danger" : "success"}>{station.underAttack ? "ALERT" : "ONLINE"}</StatusBadge></header><strong>{station.name}</strong><div><span><Shield size={12}/>Hull</span><ProgressBar value={station.health} max={station.maxHealth} tone="hull"/></div><footer><span><Fuel size={12}/>{Math.floor(station.fuel.currentFuel).toLocaleString()}</span><button disabled={!snapshot.stationInteraction.docked} onClick={onOpenCommand}>Command <KeyHint>U</KeyHint></button></footer></HUDCard>}
    <div className="combatBar"><button className="combatSlot combatSlot--active"><Crosshair size={19}/><span>Primary</span><KeyHint>SPACE</KeyHint></button><button className={snapshot.autoFire ? "combatSlot is-active" : "combatSlot"} onClick={onToggleAutoFire}><Zap size={18}/><span>Auto-fire</span><KeyHint>E</KeyHint></button><button className={snapshot.autoThrottle ? "combatSlot is-active" : "combatSlot"} onClick={onToggleAutoThrottle}><Ship size={18}/><span>Throttle</span><KeyHint>Q</KeyHint></button><button className="combatSlot" disabled={!shipUpgradesAvailable} title={shipUpgradesAvailable ? "Open ship upgrades" : "Dock at your station to upgrade the ship"} onClick={onOpenShip}><Settings size={18}/><span>Ship</span><KeyHint>Y</KeyHint></button><button className="combatSlot" onClick={onOpenGuide}><Radio size={18}/><span>Guide</span></button></div>
    <UpgradeCompletionOverlay feedback={snapshot.upgradeFeedback}/>
    {(snapshot.stationHealthWarning || snapshot.baseLostState) && <div className="warningHud"><Shield size={18}/><div><span>STATION WARNING</span><strong>{snapshot.baseLostState ? "Base station destroyed ? progression hub lost" : snapshot.stationHealthWarning}</strong></div></div>}
  </div>;
}
