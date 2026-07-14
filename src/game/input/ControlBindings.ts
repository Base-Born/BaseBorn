export type ControlAction = "thrust" | "reverse" | "left" | "right" | "boost" | "primaryFire" | "secondaryFire" | "autoFire" | "autoThrottle" | "scanner" | "interact" | "command" | "dropCargo" | "cargoPickup" | "navigation" | "mapZoom" | "close";

export const CONTROL_BINDINGS: Record<ControlAction, { label: string; primary: string; alternate?: string; mouse?: string }> = {
  thrust: { label: "Forward thrust", primary: "W", alternate: "ArrowUp" },
  reverse: { label: "Reverse / brake", primary: "S", alternate: "ArrowDown" },
  left: { label: "Strafe left", primary: "A", alternate: "ArrowLeft" },
  right: { label: "Strafe right", primary: "D", alternate: "ArrowRight" },
  boost: { label: "Boost", primary: "Shift" },
  primaryFire: { label: "Primary weapon", primary: "Space", mouse: "Left Click" },
  secondaryFire: { label: "Secondary system", primary: "Right Click", mouse: "Right Click" },
  autoFire: { label: "Toggle auto-fire", primary: "E" },
  autoThrottle: { label: "Toggle auto-throttle", primary: "Q" },
  scanner: { label: "Scanner pulse", primary: "R" },
  interact: { label: "Context action", primary: "F" },
  command: { label: "Command / management", primary: "U" },
  dropCargo: { label: "Eject cargo", primary: "G" },
  cargoPickup: { label: "Toggle cargo pickup", primary: "H" },
  navigation: { label: "Locate station waypoint", primary: "V" },
  mapZoom: { label: "Cycle minimap zoom levels", primary: "M" },
  close: { label: "Close overlay", primary: "Escape" },
};

export function getControlHint(action: ControlAction) {
  return CONTROL_BINDINGS[action].primary;
}
