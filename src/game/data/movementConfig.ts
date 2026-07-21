export type MovementVehicle = "pod" | "spacecraft" | "carrier";

export type MovementTuning = {
  forwardAcceleration: number;
  reverseAcceleration: number;
  maximumForwardSpeed: number;
  maximumReverseSpeed: number;
  rotationAcceleration: number;
  maximumRotationSpeed: number;
  rotationalDamping: number;
  activeLinearDamping: number;
  idleLinearDamping: number;
  minimumThrusterIntensity: number;
  maximumThrusterIntensity: number;
  thrusterResponse: number;
};

export type MovementCommand = {
  thrustInput: number;
  rotationInput: number;
  source: "keyboard" | "controller" | "touch" | "none";
};

export const MOVEMENT_INPUT_CONFIG = {
  controllerDeadzone: 0.18,
  controllerResponseCurve: 1.35,
  meaningfulInput: 0.025,
} as const;

const MOVEMENT_TUNING: Record<MovementVehicle, MovementTuning> = {
  pod: {
    forwardAcceleration: 720,
    reverseAcceleration: 455,
    maximumForwardSpeed: 405,
    maximumReverseSpeed: 230,
    rotationAcceleration: 11.5,
    maximumRotationSpeed: 3.4,
    rotationalDamping: 0.075,
    activeLinearDamping: 0.82,
    idleLinearDamping: 0.42,
    minimumThrusterIntensity: 0.08,
    maximumThrusterIntensity: 1,
    thrusterResponse: 13,
  },
  spacecraft: {
    forwardAcceleration: 610,
    reverseAcceleration: 380,
    maximumForwardSpeed: 365,
    maximumReverseSpeed: 205,
    rotationAcceleration: 9.2,
    maximumRotationSpeed: 2.85,
    rotationalDamping: 0.07,
    activeLinearDamping: 0.84,
    idleLinearDamping: 0.46,
    minimumThrusterIntensity: 0.08,
    maximumThrusterIntensity: 1,
    thrusterResponse: 11,
  },
  carrier: {
    forwardAcceleration: 430,
    reverseAcceleration: 255,
    maximumForwardSpeed: 230,
    maximumReverseSpeed: 125,
    rotationAcceleration: 4.8,
    maximumRotationSpeed: 1.45,
    rotationalDamping: 0.055,
    activeLinearDamping: 0.76,
    idleLinearDamping: 0.32,
    minimumThrusterIntensity: 0.08,
    maximumThrusterIntensity: 1,
    thrusterResponse: 8,
  },
};

export function resolveMovementTuning(
  vehicle: MovementVehicle,
  modifiers: { acceleration?: number; maximumSpeed?: number; rotation?: number; engine?: number } = {},
): MovementTuning {
  const base = MOVEMENT_TUNING[vehicle];
  const acceleration = Math.max(0.2, modifiers.acceleration ?? 1) * Math.max(0.2, modifiers.engine ?? 1);
  const maximumSpeed = Math.max(0.25, modifiers.maximumSpeed ?? 1) * Math.max(0.25, modifiers.engine ?? 1);
  const rotation = Math.max(0.3, modifiers.rotation ?? 1) * Math.max(0.35, modifiers.engine ?? 1);
  return {
    ...base,
    forwardAcceleration: base.forwardAcceleration * acceleration,
    reverseAcceleration: base.reverseAcceleration * acceleration,
    maximumForwardSpeed: base.maximumForwardSpeed * maximumSpeed,
    maximumReverseSpeed: base.maximumReverseSpeed * maximumSpeed,
    rotationAcceleration: base.rotationAcceleration * rotation,
    maximumRotationSpeed: base.maximumRotationSpeed * rotation,
  };
}

