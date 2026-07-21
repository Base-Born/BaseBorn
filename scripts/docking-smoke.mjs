import { strict as assert } from "node:assert";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export { Player } from "./src/game/entities/Player.ts"; export { StationSystem } from "./src/game/systems/StationSystem.ts";`,
    resolveDir: process.cwd(),
    sourcefile: "docking-smoke-entry.ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  define: {
    "import.meta.env.DEV": "false",
  },
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
let Player;
let StationSystem;
try {
  ({ Player, StationSystem } = await import(moduleUrl));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const player = new Player({
  name: "DockTest",
  shipColor: "#dfe9ec",
  glowColor: "#4cc9f0",
  trailColor: "#4cc9f0",
  projectileColor: "#eef7ff",
  wingVariant: "delta",
  cockpitVariant: "needle",
  decalPattern: "chevron",
  thrusterStyle: "ion",
  glowIntensity: 0.8,
});
const stations = new StationSystem(player);
const station = stations.stations[0];
station.claimState = "claimed";
station.lifecycleState = "claimed";
station.ownerTeamId = stations.team.id;
station.ownerPlayerId = player.id;
station.turretClassId = "base_ship";
station.pos = { ...player.pos };
stations.team.stationId = station.id;

assert.equal(player.currentShipId, "space_pod", "free flight must begin in the Survey Pod");
assert(stations.dockPlayerAtStation(player, station), "the pod should enter the recovered spacecraft cradle");
assert.equal(player.currentShipId, "base_ship", "docking should restore the recovered spacecraft combat class");
stations.updateDockingAnimation(player, player.dockingAnimationStartedAt + player.dockingAnimationDurationMs + 1);
assert.equal(player.dockingState, "docked");

assert(stations.launchPlayerFromStation(player, station), "the pod should be able to undock");
stations.updateDockingAnimation(player, player.dockingAnimationStartedAt + player.dockingAnimationDurationMs + 1);
assert.equal(player.dockingState, "free");
assert.equal(player.currentShipId, "space_pod", "undocking must release the Survey Pod, not a miniature recovered spacecraft");
assert.equal(station.turretClassId, "base_ship", "the recovered spacecraft must retain its installed combat class");

player.pos = { ...station.pos };
assert(stations.dockPlayerAtStation(player, station), "the released pod should be able to dock again");
assert.equal(player.currentShipId, "base_ship", "redocking must restore the retained spacecraft class");

console.log("Docking smoke test passed: pod release, spacecraft class retention, and redocking restoration.");
