import { spawn } from "node:child_process";
import { strict as assert } from "node:assert";
import { WebSocket } from "ws";

const port = 3199;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server/index.js"], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" }, stdio: ["ignore", "pipe", "pipe"] });
let stderr = "";
server.stderr.on("data", (chunk) => { stderr += chunk; });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`${base}/health`); if (response.ok) return response.json(); } catch {}
    await wait(100);
  }
  throw new Error(`Server did not become healthy. ${stderr}`);
}
function connect(name, room = "smoke") {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/multiplayer`);
    const messages = [];
    socket.on("open", () => socket.send(JSON.stringify({ type:"join", room, customization:{ name, shipColor:"#2fbce1", glowColor:"#4cc9f0", trailColor:"#6edb8f", projectileColor:"#eef7ff", wingVariant:"delta", cockpitVariant:"needle", decalPattern:"chevron", thrusterStyle:"ion", glowIntensity:0.8 }, state:null })));
    socket.on("message", (raw) => { const message=JSON.parse(raw.toString()); messages.push(message); if(message.type==="welcome") resolve({socket,messages,id:message.playerId,welcome:message}); });
    socket.on("error", reject);
  });
}
async function waitForSnapshot(client, predicate) {
  for (let attempt=0;attempt<40;attempt+=1) { const snapshot=[...client.messages].reverse().find((message)=>message.type==="snapshot"&&predicate(message)); if(snapshot)return snapshot; await wait(50); }
  throw new Error("Timed out waiting for multiplayer snapshot");
}
async function waitForMessage(client, predicate) {
  for (let attempt=0;attempt<40;attempt+=1) { const message=[...client.messages].reverse().find(predicate); if(message)return message; await wait(50); }
  throw new Error("Timed out waiting for multiplayer message");
}
function distance(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
try {
  const health = await waitForHealth();
  assert.equal(health.status, "ok");
  const alpha = await connect("Alpha");
  const beta = await connect("Beta", "a-different-requested-room");
  assert.equal(alpha.welcome.worldId, beta.welcome.worldId);
  assert.notDeepEqual(alpha.welcome.spawn, beta.welcome.spawn);
  assert.equal(alpha.welcome.room, "public");
  beta.socket.send(JSON.stringify({ type:"state", state:{ x:125, y:-80, vx:10, vy:0, angle:1.2, healthRatio:0.75, level:7, score:420, shipClassId:"base_ship", shipClass:"Base Ship", docked:false } }));
  const snapshot = await waitForSnapshot(alpha, (message) => message.players.some((player) => player.id===beta.id&&player.x===125));
  assert.equal(snapshot.players.length, 2);
  assert.equal(snapshot.players.find((player) => player.id===beta.id).name, "Beta");
  const initialTeamSnapshot = await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.memberIds.includes(alpha.id)));
  const alphaTeam = initialTeamSnapshot.teams.find((team) => team.memberIds.includes(alpha.id));
  const alphaStation = initialTeamSnapshot.stations
    .filter((station) => station.claimState === "unclaimed")
    .sort((left, right) => distance(left, alpha.welcome.spawn) - distance(right, alpha.welcome.spawn))[0];
  alpha.socket.send(JSON.stringify({ type:"claim_station", stationId:alphaStation.id }));
  const claimedSnapshot = await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.id===alphaTeam.id&&team.stationId===alphaStation.id));
  alpha.socket.send(JSON.stringify({ type:"invite_player", playerId:beta.id }));
  const inviteSnapshot = await waitForSnapshot(beta, (message) => message.invites.some((invite) => invite.teamId===alphaTeam.id));
  const invite = inviteSnapshot.invites.find((entry) => entry.teamId===alphaTeam.id);
  beta.socket.send(JSON.stringify({ type:"accept_invite", inviteId:invite.id, spawnAtBase:true }));
  const teamSpawn = await waitForMessage(beta, (message) => message.type === "team_spawn");
  const stationBase = claimedSnapshot.stations.find((station) => station.id===alphaStation.id);
  assert(distance(teamSpawn.spawn, stationBase) <= 1600);
  await waitForSnapshot(beta, (message) => message.teamId===alphaTeam.id&&message.teams.some((team) => team.id===alphaTeam.id&&team.memberIds.includes(alpha.id)&&team.memberIds.includes(beta.id)));
  alpha.socket.send(JSON.stringify({ type:"transfer_leader", playerId:beta.id }));
  await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.id===alphaTeam.id&&team.leaderPlayerId===beta.id));
  beta.socket.send(JSON.stringify({ type:"remove_member", playerId:alpha.id }));
  const removedSnapshot = await waitForSnapshot(alpha, (message) => message.teamId!==alphaTeam.id&&message.teams.some((team) => team.id===message.teamId&&team.memberIds.includes(alpha.id)));
  alpha.socket.send(JSON.stringify({ type:"leave_team" }));
  await waitForSnapshot(alpha, (message) => message.teamId!==removedSnapshot.teamId);
  const status = await fetch(`${base}/api/status`).then((response) => response.json());
  assert.equal(status.multiplayer, true);
  assert.equal(status.players, 2);
  alpha.socket.close(); beta.socket.close();
  console.log("Multiplayer smoke test passed: shared world, state relay, team invite/accept, base spawn, leadership transfer, removal, and leave.");
} finally {
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve)=>server.once("exit",resolve)),wait(3000)]);
}
