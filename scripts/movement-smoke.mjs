import { strict as assert } from "node:assert";
import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/game/systems/ShipMovementSystem.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
const { updateThrusterMovement } = await import(moduleUrl);
const inputResult = await build({
  entryPoints: ["src/game/systems/InputSystem.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const inputModuleUrl = `data:text/javascript;base64,${Buffer.from(inputResult.outputFiles[0].text).toString("base64")}`;
const { normalizeControllerMovement } = await import(inputModuleUrl);

const tuning = {
  forwardAcceleration: 600,
  reverseAcceleration: 360,
  maximumForwardSpeed: 360,
  maximumReverseSpeed: 200,
  activeLinearDamping: 0.46,
  idleLinearDamping: 0.2,
  rotationAcceleration: 9,
  maximumRotationSpeed: 2.8,
  rotationalDamping: 0.055,
  thrusterResponse: 10,
  minimumThrusterIntensity: 0.08,
  maximumThrusterIntensity: 1,
};
const command = (thrustInput, rotationInput) => ({ thrustInput, rotationInput, source: "keyboard" });
const body = () => ({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, angle: 0, angularVelocity: 0, thrusterForward: 0, thrusterRotation: 0 });
const step = (target, input, seconds) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) updateThrusterMovement(target, input, tuning, 1 / 60, 0);
};

const forward = body();
step(forward, command(1, 0), 1);
assert(forward.pos.x > 100, "forward thrust must accelerate along the hull heading");
assert(Math.abs(forward.pos.y) < 0.001 && Math.abs(forward.angle) < 0.001, "W must not steer or strafe");
const speedAtRelease = Math.hypot(forward.vel.x, forward.vel.y);
step(forward, command(0, 0), 0.15);
assert(forward.pos.x > 100 && Math.hypot(forward.vel.x, forward.vel.y) < speedAtRelease, "released thrust must preserve damped inertia");

const reverse = body();
step(reverse, command(-1, 0), 1);
assert(reverse.pos.x < -50 && Math.abs(reverse.pos.y) < 0.001, "S must apply physical reverse thrust");

const rotate = body();
step(rotate, command(0, 1), 0.5);
assert(rotate.angle > 0.15 && Math.hypot(rotate.vel.x, rotate.vel.y) < 0.001, "D must rotate without adding lateral velocity");
const angularSpeedAtRelease = Math.abs(rotate.angularVelocity);
step(rotate, command(0, 0), 0.25);
assert(Math.abs(rotate.angularVelocity) < angularSpeedAtRelease, "released steering must damp angular velocity");

const inertialTurn = body();
step(inertialTurn, command(1, 0), 0.65);
const headingBeforeTurn = Math.atan2(inertialTurn.vel.y, inertialTurn.vel.x);
step(inertialTurn, command(0, 1), 0.12);
const velocityHeadingAfterTurn = Math.atan2(inertialTurn.vel.y, inertialTurn.vel.x);
assert(Math.abs(velocityHeadingAfterTurn - headingBeforeTurn) < 0.03, "turning the hull must not snap existing velocity");

assert.deepEqual(normalizeControllerMovement(0.1, -0.1), { thrustInput: 0, rotationInput: 0, source: "controller" }, "controller drift must remain inside the deadzone");
const analogForward = normalizeControllerMovement(0, -0.7);
assert(analogForward.thrustInput > 0.5 && analogForward.rotationInput === 0, "left-stick up must map to proportional forward thrust");
const analogTurn = normalizeControllerMovement(0.75, 0);
assert(analogTurn.rotationInput > 0.5 && analogTurn.thrustInput === 0, "left-stick right must map to proportional rotation");

console.log("Movement smoke test passed: keyboard/controller thrust, reverse, rotation, damping, and inertial heading.");
