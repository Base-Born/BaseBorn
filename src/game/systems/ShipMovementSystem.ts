import type { MovementCommand, MovementTuning } from "../data/movementConfig";
import { clampToWorld } from "../data/mapConfig";
import { clamp } from "../math";
import type { Vec2 } from "../types";

export type MovementBody = {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  angularVelocity: number;
  thrusterForward: number;
  thrusterRotation: number;
};

export function updateThrusterMovement(body: MovementBody, command: MovementCommand, tuning: MovementTuning, dt: number, worldMargin = 80) {
  const step = Math.max(0, Math.min(0.05, dt));
  const thrustInput = clamp(command.thrustInput, -1, 1);
  const rotationInput = clamp(command.rotationInput, -1, 1);

  body.angularVelocity += rotationInput * tuning.rotationAcceleration * step;
  body.angularVelocity *= Math.pow(rotationInput === 0 ? tuning.rotationalDamping : Math.sqrt(tuning.rotationalDamping), step);
  body.angularVelocity = clamp(body.angularVelocity, -tuning.maximumRotationSpeed, tuning.maximumRotationSpeed);
  if (Math.abs(body.angularVelocity) < 0.0005 && rotationInput === 0) body.angularVelocity = 0;
  body.angle = normalizeAngle(body.angle + body.angularVelocity * step);

  const forwardX = Math.cos(body.angle);
  const forwardY = Math.sin(body.angle);
  const acceleration = thrustInput >= 0 ? tuning.forwardAcceleration : tuning.reverseAcceleration;
  body.vel.x += forwardX * thrustInput * acceleration * step;
  body.vel.y += forwardY * thrustInput * acceleration * step;

  const damping = Math.pow(thrustInput === 0 ? tuning.idleLinearDamping : tuning.activeLinearDamping, step);
  body.vel.x *= damping;
  body.vel.y *= damping;
  limitLocalVelocity(body.vel, forwardX, forwardY, tuning, step);

  body.pos = clampToWorld({ x: body.pos.x + body.vel.x * step, y: body.pos.y + body.vel.y * step }, worldMargin);

  const visualForward = Math.abs(thrustInput) < tuning.minimumThrusterIntensity ? 0 : thrustInput;
  const visualRotation = Math.abs(rotationInput) < tuning.minimumThrusterIntensity ? 0 : rotationInput;
  const visualBlend = 1 - Math.exp(-tuning.thrusterResponse * step);
  body.thrusterForward += (clamp(visualForward, -tuning.maximumThrusterIntensity, tuning.maximumThrusterIntensity) - body.thrusterForward) * visualBlend;
  body.thrusterRotation += (clamp(visualRotation, -tuning.maximumThrusterIntensity, tuning.maximumThrusterIntensity) - body.thrusterRotation) * visualBlend;
  if (Math.abs(body.thrusterForward) < 0.005 && visualForward === 0) body.thrusterForward = 0;
  if (Math.abs(body.thrusterRotation) < 0.005 && visualRotation === 0) body.thrusterRotation = 0;
}

function limitLocalVelocity(velocity: Vec2, forwardX: number, forwardY: number, tuning: MovementTuning, dt: number) {
  const localForward = velocity.x * forwardX + velocity.y * forwardY;
  const maximum = localForward >= 0 ? tuning.maximumForwardSpeed : tuning.maximumReverseSpeed;
  if (Math.abs(localForward) > maximum) {
    const excess = localForward - Math.sign(localForward) * maximum;
    const correction = excess * (1 - Math.exp(-12 * dt));
    velocity.x -= forwardX * correction;
    velocity.y -= forwardY * correction;
  }
  const absoluteLimit = tuning.maximumForwardSpeed * 1.18;
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed > absoluteLimit) {
    const scale = absoluteLimit / speed;
    velocity.x *= scale;
    velocity.y *= scale;
  }
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
