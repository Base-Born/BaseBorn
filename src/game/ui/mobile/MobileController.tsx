import { Boxes, Crosshair, Hand, Radar, Settings, Zap } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { GameSnapshot, Vec2 } from "../../types";

type MobileControllerProps = {
  snapshot: GameSnapshot;
  active: boolean;
  onMove: (movement: Vec2) => void;
  onAim: (direction: Vec2) => void;
  onFire: (active: boolean) => void;
  onInteract: () => void;
  onScan: () => void;
  onCargo: () => void;
  onShip: () => void;
  onToggleAutoFire: () => void;
};

type StickProps = {
  label: string;
  className: string;
  onChange: (direction: Vec2) => void;
  resetOnRelease?: boolean;
};

function VirtualStick({ label, className, onChange, resetOnRelease = true }: StickProps) {
  const baseRef = useRef<HTMLButtonElement>(null);
  const activePointer = useRef<number | null>(null);
  const [knob, setKnob] = useState<Vec2>({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    let x = (clientX - (rect.left + rect.width / 2)) / radius;
    let y = (clientY - (rect.top + rect.height / 2)) / radius;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    setKnob({ x: x * radius, y: y * radius });
    onChange({ x, y });
  };

  const start = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event.clientX, event.clientY);
  };

  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    update(event.clientX, event.clientY);
  };

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    if (resetOnRelease) onChange({ x: 0, y: 0 });
  };

  return (
    <div className={`mobileStick ${className}`}>
      <button
        ref={baseRef}
        type="button"
        className="mobileStick__base"
        aria-label={label}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <span className="mobileStick__arrows" aria-hidden="true" />
        <span className="mobileStick__knob" style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }} />
      </button>
      <span>{label}</span>
    </div>
  );
}

export function MobileController({ snapshot, active, onMove, onAim, onFire, onInteract, onScan, onCargo, onShip, onToggleAutoFire }: MobileControllerProps) {
  useEffect(() => {
    if (!active) {
      onMove({ x: 0, y: 0 });
      onFire(false);
    }
    return () => {
      onMove({ x: 0, y: 0 });
      onFire(false);
    };
  }, [active]);

  const healthPercent = Math.round(snapshot.maxHealth > 0 ? snapshot.health / snapshot.maxHealth * 100 : 0);
  const shieldPercent = Math.round(snapshot.maxShield > 0 ? snapshot.shieldHealth / snapshot.maxShield * 100 : 0);

  const fireDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onFire(true);
  };
  const fireUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onFire(false);
  };

  return (
    <div className={`mobileController${active ? " is-active" : ""}`} aria-label="Touch flight controls">
      <div className="mobileVitals" aria-label="Ship status">
        <span><i className="mobileVitals__hull" style={{ "--value": `${healthPercent}%` } as CSSProperties} />Hull <b>{healthPercent}%</b></span>
        <span><i className="mobileVitals__shield" style={{ "--value": `${shieldPercent}%` } as CSSProperties} />Shield <b>{shieldPercent}%</b></span>
        <span><Boxes size={13} />Cargo <b>{snapshot.cargo.used}/{snapshot.cargo.capacity}</b></span>
      </div>

      <VirtualStick label="Move" className="mobileStick--move" onChange={onMove} />

      <div className="mobileActions" aria-label="Game actions">
        <button type="button" onClick={onInteract} aria-label="Interact"><Hand size={19} /><span>ACT</span></button>
        <button type="button" onClick={onScan} aria-label="Scan for station"><Radar size={19} /><span>SCAN</span></button>
        <button type="button" onClick={onCargo} aria-label="Open cargo"><Boxes size={19} /><span>CARGO</span></button>
        <button type="button" onClick={onShip} aria-label="Open ship upgrades"><Settings size={19} /><span>SHIP</span></button>
      </div>

      <button
        type="button"
        className="mobileFire"
        aria-label="Fire primary weapon"
        onPointerDown={fireDown}
        onPointerUp={fireUp}
        onPointerCancel={fireUp}
        onLostPointerCapture={fireUp}
      >
        <Crosshair size={27} /><span>FIRE</span>
      </button>
      <button type="button" className={`mobileAutoFire${snapshot.autoFire ? " is-active" : ""}`} onClick={onToggleAutoFire} aria-label="Toggle automatic fire">
        <Zap size={15} /><span>AUTO</span>
      </button>
      <VirtualStick label="Aim" className="mobileStick--aim" onChange={onAim} resetOnRelease={false} />
    </div>
  );
}
