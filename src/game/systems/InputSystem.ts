import type { Vec2 } from "../types";

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
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("contextmenu", this.preventContext);
    canvas.tabIndex = 0;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("contextmenu", this.preventContext);
  }

  movement(): Vec2 {
    const keyboardX = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    const keyboardY = (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    const x = Math.max(-1, Math.min(1, keyboardX + this.virtualMovement.x));
    const y = Math.max(-1, Math.min(1, keyboardY + this.virtualMovement.y));
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
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

  private textInputFocused(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    return element?.tagName === "INPUT" || element?.tagName === "TEXTAREA" || Boolean(element?.isContentEditable);
  }
}
