import type { Vec2 } from "../types";
import { MOVEMENT_INPUT_CONFIG, type MovementCommand } from "../data/movementConfig";

export class InputSystem {
  keys = new Set<string>();
  pointer: Vec2 = { x: 0, y: 0 };
  pointerWorld: Vec2 = { x: 0, y: 0 };
  firing = false;
  rightFiring = false;
  private keyboardFiring = false;
  private canvasFiring = false;
  private virtualFiring = false;
  private virtualMovement: Vec2 = { x: 0, y: 0 };
  currentMovementSource: MovementCommand["source"] = "none";
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("contextmenu", this.preventContext);
    window.addEventListener("blur", this.clearActiveInput);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    canvas.tabIndex = 0;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("contextmenu", this.preventContext);
    window.removeEventListener("blur", this.clearActiveInput);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  movement(): Vec2 {
    const command = this.movementCommand();
    return { x: command.rotationInput, y: -command.thrustInput };
  }

  movementCommand(enabled = true): MovementCommand {
    if (!enabled) {
      this.currentMovementSource = "none";
      return { thrustInput: 0, rotationInput: 0, source: "none" };
    }
    const keyboard: MovementCommand = {
      thrustInput: (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) - (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0),
      rotationInput: (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0),
      source: "keyboard",
    };
    const touch: MovementCommand = { thrustInput: -this.virtualMovement.y, rotationInput: this.virtualMovement.x, source: "touch" };
    const controller = this.readControllerCommand();
    const candidates = [keyboard, touch, controller];
    const selected = candidates.reduce((strongest, candidate) => commandStrength(candidate) > commandStrength(strongest) ? candidate : strongest, { thrustInput: 0, rotationInput: 0, source: "none" } as MovementCommand);
    this.currentMovementSource = commandStrength(selected) >= MOVEMENT_INPUT_CONFIG.meaningfulInput ? selected.source : "none";
    return this.currentMovementSource === "none" ? { thrustInput: 0, rotationInput: 0, source: "none" } : selected;
  }

  setVirtualMovement(movement: Vec2) {
    this.virtualMovement = {
      x: Math.max(-1, Math.min(1, movement.x)),
      y: Math.max(-1, Math.min(1, movement.y)),
    };
  }

  setVirtualAim(direction: Vec2) {
    const magnitude = Math.hypot(direction.x, direction.y);
    if (magnitude < 0.08) return;
    const rect = this.canvas.getBoundingClientRect();
    const reach = Math.max(rect.width, rect.height);
    this.pointer = {
      x: rect.width / 2 + (direction.x / magnitude) * reach,
      y: rect.height / 2 + (direction.y / magnitude) * reach,
    };
  }

  setVirtualFiring(active: boolean) {
    this.virtualFiring = active;
    this.syncFiring();
  }

  consume(key: string) {
    if (!this.keys.has(key)) return false;
    this.keys.delete(key);
    return true;
  }

  resetActiveInput() {
    this.clearActiveInput();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.textInputFocused(event.target)) return;
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    this.keys.add(key);
    if (key === " ") {
      this.keyboardFiring = true;
      this.syncFiring();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (this.textInputFocused(event.target)) return;
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    this.keys.delete(key);
    if (key === " ") {
      this.keyboardFiring = false;
      this.syncFiring();
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  private onPointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture(event.pointerId);
    if (event.button === 2) this.rightFiring = true;
    else {
      this.canvasFiring = true;
      this.syncFiring();
    }
    this.onPointerMove(event);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.button === 2) this.rightFiring = false;
    else {
      this.canvasFiring = false;
      this.syncFiring();
    }
  };

  private syncFiring() {
    this.firing = this.keyboardFiring || this.canvasFiring || this.virtualFiring;
  }

  private preventContext = (event: Event) => event.preventDefault();

  private readControllerCommand(): MovementCommand {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((entry) => entry?.connected && entry.axes.length >= 2);
    if (!pad) return { thrustInput: 0, rotationInput: 0, source: "controller" };
    return normalizeControllerMovement(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
  }

  private clearActiveInput = () => {
    this.keys.clear();
    this.virtualMovement = { x: 0, y: 0 };
    this.keyboardFiring = false;
    this.canvasFiring = false;
    this.virtualFiring = false;
    this.rightFiring = false;
    this.syncFiring();
  };

  private onVisibilityChange = () => { if (document.hidden) this.clearActiveInput(); };

  private textInputFocused(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || Boolean(element?.isContentEditable);
  }
}

export function normalizeControllerMovement(axisX: number, axisY: number): MovementCommand {
    const rawX = Math.max(-1, Math.min(1, axisX));
    const rawY = Math.max(-1, Math.min(1, axisY));
    const magnitude = Math.min(1, Math.hypot(rawX, rawY));
    if (magnitude <= MOVEMENT_INPUT_CONFIG.controllerDeadzone) return { thrustInput: 0, rotationInput: 0, source: "controller" };
    const normalizedMagnitude = (magnitude - MOVEMENT_INPUT_CONFIG.controllerDeadzone) / (1 - MOVEMENT_INPUT_CONFIG.controllerDeadzone);
    const curvedMagnitude = normalizedMagnitude ** MOVEMENT_INPUT_CONFIG.controllerResponseCurve;
    return {
      thrustInput: -(rawY / magnitude) * curvedMagnitude,
      rotationInput: (rawX / magnitude) * curvedMagnitude,
      source: "controller",
    };
}

function commandStrength(command: MovementCommand) {
  return Math.hypot(command.thrustInput, command.rotationInput);
}
