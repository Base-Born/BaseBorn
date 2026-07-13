import type { InputContext } from "./InputContextManager";

export function getControlledVehicleContext(options: { docked: boolean; controllingStation: boolean; mothership: boolean }): InputContext {
  if (options.docked && !options.controllingStation) return "docking";
  if (options.mothership) return "mothership_control";
  if (options.controllingStation) return "station_control";
  return "gameplay";
}
