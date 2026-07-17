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
function connect(name, room = "smoke", sessionId = crypto.randomUUID()) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/multiplayer`);
    const messages = [];
    socket.on("open", () => socket.send(JSON.stringify({ type:"join", room, sessionId, customization:{ name, shipColor:"#2fbce1", glowColor:"#4cc9f0", trailColor:"#6edb8f", projectileColor:"#eef7ff", wingVariant:"delta", cockpitVariant:"needle", decalPattern:"chevron", thrusterStyle:"ion", glowIntensity:0.8 }, state:null })));
    socket.on("message", (raw) => { const message=JSON.parse(raw.toString()); messages.push(message); if(message.type==="welcome") resolve({socket,messages,id:message.playerId,welcome:message,sessionId}); });
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
async function moveClient(client, from, to) {
  let current={...from};
  while(distance(current,to)>60){
    const d=distance(current,to);current={x:current.x+(to.x-current.x)/d*60,y:current.y+(to.y-current.y)/d*60};
    client.socket.send(JSON.stringify({type:"state",state:{...current,vx:0,vy:0,angle:0,thrustForward:0,thrustStrafe:0,docked:false,healthRatio:1,level:100,score:1_000_000_000,shipClassId:"base_ship",shipClass:"Base Ship"}}));
    await wait(45);
  }
  client.socket.send(JSON.stringify({type:"state",state:{...to,vx:0,vy:0,angle:0,thrustForward:0,thrustStrafe:0,docked:false,healthRatio:1,level:100,score:1_000_000_000,shipClassId:"base_ship",shipClass:"Base Ship"}}));
  await wait(60);return to;
}
try {
  const health = await waitForHealth();
  assert.equal(health.status, "ok");
  const alpha = await connect("Alpha");
  const beta = await connect("Beta", "a-different-requested-room");
  assert.equal(alpha.welcome.worldId, beta.welcome.worldId);
  assert.notDeepEqual(alpha.welcome.spawn, beta.welcome.spawn);
  assert.equal(alpha.welcome.room, "public");
  beta.socket.send(JSON.stringify({ type:"state", state:{ x:125, y:-80, vx:10, vy:0, angle:1.2, healthRatio:0.01, level:100, score:1_000_000_000, shipClassId:"base_ship", shipClass:"Base Ship", docked:true } }));
  const snapshot = await waitForSnapshot(alpha, (message) => message.players.some((player) => player.id===beta.id&&player.updatedAt));
  assert.equal(snapshot.players.length, 2);
  const validatedBeta=snapshot.players.find((player) => player.id===beta.id);
  assert.equal(validatedBeta.name, "Beta");
  assert(distance(validatedBeta,beta.welcome.spawn)<200,"teleport must be clamped");
  assert.equal(validatedBeta.level,1);assert.equal(validatedBeta.score,0);assert.equal(validatedBeta.healthRatio,1);assert.equal(validatedBeta.docked,false);
  const asteroidChunkX=Math.floor(alpha.welcome.spawn.x/1600),asteroidChunkY=Math.floor(alpha.welcome.spawn.y/1600);
  const asteroidId=`asteroid-${asteroidChunkX}:${asteroidChunkY}-0`;
  alpha.socket.send(JSON.stringify({type:"asteroid_destroyed",asteroidId,x:alpha.welcome.spawn.x,y:alpha.welcome.spawn.y,etherType:"rawEther",amount:1,respawnMs:30000}));
  const asteroidSnapshot=await waitForSnapshot(alpha,(message)=>message.destroyedAsteroids?.some((entry)=>entry.id===asteroidId));
  const asteroidRespawn=asteroidSnapshot.destroyedAsteroids.find((entry)=>entry.id===asteroidId);
  assert(asteroidRespawn.until-Date.now()>295000,"server must enforce the five-minute asteroid respawn");
  const initialTeamSnapshot = await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.memberIds.includes(alpha.id)));
  const alphaTeam = initialTeamSnapshot.teams.find((team) => team.memberIds.includes(alpha.id));
  const alphaStation = initialTeamSnapshot.stations
    .filter((station) => station.claimState === "unclaimed")
    .sort((left, right) => distance(left, alpha.welcome.spawn) - distance(right, alpha.welcome.spawn))[0];
  await moveClient(alpha,alpha.welcome.spawn,{x:alphaStation.x+300,y:alphaStation.y});
  alpha.socket.send(JSON.stringify({ type:"claim_station", stationId:alphaStation.id }));
  await waitForMessage(alpha,(message)=>message.type==="action_error"&&/cradle/i.test(message.message));
  await moveClient(alpha,{x:alphaStation.x+300,y:alphaStation.y},{x:alphaStation.x+120,y:alphaStation.y});
  alpha.socket.send(JSON.stringify({ type:"claim_station", stationId:alphaStation.id }));
  const claimedSnapshot = await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.id===alphaTeam.id&&team.stationId===alphaStation.id));
  const claimedStation = claimedSnapshot.stations.find((station) => station.id===alphaStation.id);
  await moveClient(alpha,{x:alphaStation.x+120,y:alphaStation.y},{x:claimedStation.x,y:claimedStation.y});
  alpha.socket.send(JSON.stringify({type:"state",state:{x:claimedStation.x,y:claimedStation.y,vx:0,vy:0,angle:0,thrustForward:0,thrustStrafe:0,docked:true,healthRatio:1,level:1,score:0,shipClassId:"base_ship",shipClass:"Base Ship"}}));
  await waitForSnapshot(alpha,(message)=>message.stations.find((station)=>station.id===alphaStation.id)?.dockedPlayerIds.includes(alpha.id));
  alpha.socket.send(JSON.stringify({type:"station_input",stationId:alphaStation.id,x:1,y:0}));
  const drivenSnapshot = await waitForSnapshot(alpha,(message)=>message.stations.some((station)=>station.id===alphaStation.id&&station.x>claimedStation.x+2&&station.driverPlayerId===alpha.id));
  const drivenStation = drivenSnapshot.stations.find((station)=>station.id===alphaStation.id);
  assert(drivenStation.vx>0,"station drive input should produce shared server velocity");
  alpha.socket.send(JSON.stringify({type:"station_input",stationId:alphaStation.id,x:0,y:0}));
  alpha.socket.send(JSON.stringify({type:"state",state:{x:drivenStation.x,y:drivenStation.y,vx:0,vy:0,angle:0,thrustForward:0,thrustStrafe:0,docked:false,healthRatio:1,level:1,score:0,shipClassId:"base_ship",shipClass:"Base Ship"}}));
  await waitForSnapshot(alpha,(message)=>message.players.some((player)=>player.id===alpha.id&&!player.docked));
  alpha.socket.send(JSON.stringify({ type:"invite_player", playerId:beta.id }));
  const inviteSnapshot = await waitForSnapshot(beta, (message) => message.invites.some((invite) => invite.teamId===alphaTeam.id));
  const invite = inviteSnapshot.invites.find((entry) => entry.teamId===alphaTeam.id);
  beta.socket.send(JSON.stringify({ type:"accept_invite", inviteId:invite.id, spawnAtBase:true }));
  const teamSpawn = await waitForMessage(beta, (message) => message.type === "team_spawn");
  const stationBase = claimedSnapshot.stations.find((station) => station.id===alphaStation.id);
  assert.equal(stationBase.name, "Alpha's Craft");
  assert(distance(teamSpawn.spawn, stationBase) <= 1600);
  await waitForSnapshot(beta, (message) => message.teamId===alphaTeam.id&&message.teams.some((team) => team.id===alphaTeam.id&&team.memberIds.includes(alpha.id)&&team.memberIds.includes(beta.id)));
  beta.socket.send(JSON.stringify({type:"drop_cargo",etherType:"rawEther",amount:99999}));
  await waitForMessage(beta,(message)=>message.type==="action_error"&&/inventory/i.test(message.message));
  alpha.socket.send(JSON.stringify({ type:"transfer_leader", playerId:beta.id }));
  await waitForSnapshot(alpha, (message) => message.teams.some((team) => team.id===alphaTeam.id&&team.leaderPlayerId===beta.id));
  beta.socket.send(JSON.stringify({ type:"remove_member", playerId:alpha.id }));
  const removedSnapshot = await waitForSnapshot(alpha, (message) => message.teamId!==alphaTeam.id&&message.teams.some((team) => team.id===message.teamId&&team.memberIds.includes(alpha.id)));
  alpha.socket.send(JSON.stringify({ type:"leave_team" }));
  await waitForSnapshot(alpha, (message) => message.teamId!==removedSnapshot.teamId);
  const beforeCombat=await waitForSnapshot(alpha,(message)=>message.players.some((player)=>player.id===beta.id&&distance(player,teamSpawn.spawn)<200));
  const alphaState=beforeCombat.players.find((player)=>player.id===alpha.id);
  const betaNear={x:alphaState.x+300,y:alphaState.y};
  await moveClient(beta,teamSpawn.spawn,betaNear);
  alpha.socket.send(JSON.stringify({type:"fire",angle:0}));
  await waitForSnapshot(beta,(message)=>message.projectiles?.some((projectile)=>projectile.ownerId===alpha.id));
  await waitForMessage(beta,(message)=>message.type==="player_damaged"&&message.sourcePlayerId===alpha.id);
  const status = await fetch(`${base}/api/status`).then((response) => response.json());
  assert.equal(status.multiplayer, true);
  assert.equal(status.players, 2);
  const stationsBeforeReconnect=(await waitForSnapshot(beta,(message)=>message.players.length===2)).stations.length;
  alpha.socket.close();await wait(120);
  const alphaResumed=await connect("Alpha", "ignored-room", alpha.sessionId);
  assert.equal(alphaResumed.id,alpha.id,"browser session should retain player identity");
  const resumedSnapshot=await waitForSnapshot(alphaResumed,(message)=>message.players.length===2);
  assert.equal(resumedSnapshot.stations.length,stationsBeforeReconnect,"reconnect must not create another starter station");
  alphaResumed.socket.close(); beta.socket.close();
  console.log("Multiplayer smoke test passed: validation, five-minute shared asteroid respawns, station driving, projectiles/damage, anti-mint cargo, reconnects, teams, claims, and leadership.");
} finally {
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve)=>server.once("exit",resolve)),wait(3000)]);
}
