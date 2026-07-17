import { Gauge, Radio, Shield, Ship, Wrench } from "lucide-react";
import type { GameSnapshot } from "../../types";
import { HUDCard, ProgressBar, StatusBadge } from "../design/components";

export type ControlledVehicleSnapshot = {
  id: string; type: "ship" | "station" | "mothership"; name: string; model: string; health: number; maxHealth: number; shield: number; maxShield: number; fuel: number; status: string; speed: number;
};

export function normalizeControlledVehicle(snapshot: GameSnapshot): ControlledVehicleSnapshot {
  const station = snapshot.station.claimed;
  const controlsStation = Boolean(station && snapshot.stationInteraction.docked && station.localRelocationAvailable);
  if (controlsStation && station) return { id: station.id, type: station.mothershipUnlocked ? "mothership" : "station", name: station.name, model: station.mothershipUnlocked ? "Personal Mothership" : "Carrier Spacecraft", health: station.health, maxHealth: station.maxHealth, shield: station.shield, maxShield: Math.max(1, station.defenseStats.shieldCapacity), fuel: station.fuel.currentFuel, status: station.underAttack ? "Under attack" : "Pod integrated", speed: 0 };
  return { id: snapshot.fleet.activeShipId, type: "ship", name: snapshot.shipClass, model: snapshot.baseFrame.name, health: snapshot.health, maxHealth: snapshot.maxHealth, shield: snapshot.shieldHealth, maxShield: Math.max(1, snapshot.maxShield), fuel: 0, status: snapshot.stationInteraction.docked ? "Docked" : "Flight control", speed: 0 };
}

export function VehicleHUD({ snapshot }: { snapshot: GameSnapshot }) {
  const vehicle = normalizeControlledVehicle(snapshot);
  return <HUDCard className="vehicleHud">
    <header><div className="vehicleHud__icon">{vehicle.type === "ship" ? <Ship size={18}/> : <Radio size={18}/>}</div><div><span>{vehicle.type}</span><strong>{vehicle.name}</strong><small>{vehicle.model}</small></div><StatusBadge tone={vehicle.status === "Under attack" ? "danger" : "success"}>{vehicle.status}</StatusBadge></header>
    <div className="vehicleMeter"><span><Wrench size={12}/>Hull <b>{Math.ceil(vehicle.health)} / {Math.ceil(vehicle.maxHealth)}</b></span><ProgressBar value={vehicle.health} max={vehicle.maxHealth} tone="hull" label="Hull"/></div>
    <div className="vehicleMeter"><span><Shield size={12}/>Shield <b>{Math.ceil(vehicle.shield)} / {Math.ceil(vehicle.maxShield)}</b></span><ProgressBar value={vehicle.shield} max={vehicle.maxShield} tone="shield" label="Shield"/></div>
    <footer><span><Gauge size={13}/>{snapshot.autoThrottle ? "Auto throttle" : "Manual thrust"}</span><span>{vehicle.type === "ship" ? "Primary online" : vehicle.fuel.toLocaleString() + " Fuel"}</span></footer>
  </HUDCard>;
}
