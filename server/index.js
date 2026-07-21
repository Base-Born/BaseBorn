import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { loadWorldState, saveWorldState } from "./worldPersistence.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const maxPlayersPerRoom = Math.max(2, Number.parseInt(process.env.MAX_PLAYERS_PER_ROOM || "64", 10));
const rooms = new Map();
const publicWorldId = "baseborn-prime";
const publicWorldSeed = 0x5ba5e0d1;
const worldRevision = "pod-start-v2";
const startedAt = Date.now();
const worldStatePath = process.env.WORLD_STATE_PATH || "";
const etherTypes = new Set(["rawEther", "refinedEther", "chargedEther", "radiantEther", "primalEther", "coreEther"]);
const etherTypeOrder = ["rawEther", "refinedEther", "chargedEther", "radiantEther", "primalEther", "coreEther"];
const statKeys = ["autonomousRepair", "maxHealth", "bodyDamage", "bulletSpeed", "bulletPenetration", "bulletDamage", "reloadSpeed", "movementSpeed"];
const maxStatPoints = 33;
const worldLimit = 200000;
const snapshotIntervalMs = 50;
const simulationIntervalMs = 25;
const maxMovementSpeed = 1800;
const pickupDistance = 180;
const stationClaimDistance = 145;
const stationDockDistance = 180;
const starterWreckDistance = 380;
const starterWreckRepairCost = 12;
const asteroidChunkSize = 1600;
const projectileSpeed = 720;
const projectileLifetimeMs = 1800;
// Upgraded spacecraft projectiles can travel farther than the base projectile.
// Keep reports bounded, but do not reject legitimate long-range asteroid kills.
const asteroidReportDistance = 2400;
const asteroidReportWindowMs = 300;
const maxAsteroidReportsPerWindow = 8;
const projectileDamage = 14;
const stationPilotSpeed = 230;
const stationPilotAcceleration = 610;
const stationPilotActiveDamping = 0.42;
const stationPilotIdleDamping = 0.16;
const stationReverseAcceleration = stationPilotAcceleration * (255 / 430);
const stationReverseSpeed = stationPilotSpeed * (125 / 230);
const stationRotationAcceleration = 4.8;
const stationMaximumRotationSpeed = 1.45;
const stationRotationDamping = 0.055;
const stationRadius = 170;
const stationTurretMountX = 0.765;
const stationTurretMountY = -0.186;
const stationTurretBarrelLength = 82;
const testSpawnRadius = Math.max(0, Math.min(worldLimit - 5000, Number.parseInt(process.env.TEST_SPAWN_RADIUS || "0", 10) || 0));
const asteroidSizeRewards = [0.75, 1, 1.6, 2.6, 4, 6, 9, 13, 19, 28];
const asteroidSizeWeights = [22, 20, 18, 14, 10, 7, 4, 2.5, 1.5, 1];
const asteroidQualityReward = {rawEther:{xp:1,ether:1,score:1},refinedEther:{xp:2.5,ether:2.25,score:2},chargedEther:{xp:6,ether:5,score:5},radiantEther:{xp:14,ether:11,score:12},primalEther:{xp:35,ether:26,score:30},coreEther:{xp:90,ether:65,score:80}};
const asteroidRegionWeights = {
  outer:[85,13,2,0,0,0],
  mid:[35,35,22,7,1,0],
  inner:[10,24,34,24,7,1],
  center:[0,5,20,40,28,7],
};
const contentTypes = { ".css":"text/css; charset=utf-8", ".html":"text/html; charset=utf-8", ".ico":"image/x-icon", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".map":"application/json; charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp", ".woff2":"font/woff2" };

function securityHeaders() { return { "Content-Security-Policy":"default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'", "Cross-Origin-Opener-Policy":"same-origin", "Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=()", "Referrer-Policy":"same-origin", "X-Content-Type-Options":"nosniff", "X-Frame-Options":"DENY" }; }
function sendJson(response, status, body) {
  response.writeHead(status, { ...securityHeaders(), "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" });
  response.end(JSON.stringify(body));
}
function roomPopulation() { let players=0; for (const room of rooms.values()) players += room.clients.size; return players; }
function serveFile(response, filePath) {
  const extension=extname(filePath).toLowerCase();
  response.writeHead(200, { ...securityHeaders(), "Content-Type":contentTypes[extension]||"application/octet-stream", "Cache-Control":filePath.includes(`${join("assets", "")}`)?"public, max-age=31536000, immutable":"no-cache" });
  createReadStream(filePath).pipe(response);
}

const server=createServer((request,response)=>{
  const url=new URL(request.url||"/",`http://${request.headers.host||"localhost"}`);
  if(url.pathname==="/health"){sendJson(response,200,{status:"ok",revision:worldRevision,uptimeSeconds:Math.floor((Date.now()-startedAt)/1000),players:roomPopulation(),rooms:rooms.size,buildReady:existsSync(dist),persistence:Boolean(worldStatePath)});return;}
  if(url.pathname==="/api/status"){sendJson(response,200,{game:"Baseborn.io",multiplayer:true,players:roomPopulation(),rooms:rooms.size,maxPlayersPerRoom});return;}
  if(!existsSync(dist)){sendJson(response,503,{error:"Production build not found. Run npm run build before npm start."});return;}
  let decodedPath; try { decodedPath=decodeURIComponent(url.pathname); } catch { sendJson(response,400,{error:"Invalid URL"}); return; }
  const relativePath=normalize(decodedPath).replace(/^(\.\.[/\\])+/g,"").replace(/^[/\\]+/,"");
  const candidate=resolve(dist,relativePath||"index.html");
  const insideDist=candidate===dist||candidate.startsWith(`${dist}\\`)||candidate.startsWith(`${dist}/`);
  const filePath=insideDist&&existsSync(candidate)&&statSync(candidate).isFile()?candidate:join(dist,"index.html");
  serveFile(response,filePath);
});

const websocketServer=new WebSocketServer({noServer:true,maxPayload:256*1024,perMessageDeflate:false});
server.on("upgrade",(request,socket,head)=>{
  const url=new URL(request.url||"/",`http://${request.headers.host||"localhost"}`);
  if(url.pathname!=="/multiplayer"){socket.destroy();return;}
  const origin=request.headers.origin;
  if(origin){try{if(new URL(origin).host!==request.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  websocketServer.handleUpgrade(request,socket,head,(websocket)=>websocketServer.emit("connection",websocket,request));
});

function cleanText(value,fallback,maxLength){if(typeof value!=="string")return fallback;const clean=value.replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,maxLength);return clean||fallback;}
function finite(value,fallback,min,max){return typeof value==="number"&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
function getXPRequiredForLevel(level){if(level<=10)return Math.floor(45+level*18);if(level<=30)return Math.floor(180+Math.pow(level-10,1.45)*55);if(level<=60)return Math.floor(900+Math.pow(level-30,1.55)*95);if(level<=90)return Math.floor(3200+Math.pow(level-60,1.65)*160);return Math.floor(9500+Math.pow(level-90,1.85)*420);}
const xpByLevel=Array.from({length:103},()=>0);for(let level=2;level<xpByLevel.length;level+=1)xpByLevel[level]=xpByLevel[level-1]+getXPRequiredForLevel(level-1);
function levelForXP(xp){let level=1;while(level<100&&xp>=xpByLevel[level+1])level+=1;return level;}
function cleanStats(value,previous,level){const source=value&&typeof value==="object"?value:{};const legacyPenetration=source.bulletPenetration??source.maxShield??previous?.bulletPenetration??previous?.maxShield??0;const next={};for(const key of statKeys){const fallback=key==="bulletPenetration"?legacyPenetration:(previous?.[key]||0);next[key]=Math.round(finite(key==="bulletPenetration"?legacyPenetration:source[key],fallback,0,20));}const spent=Object.values(next).reduce((sum,amount)=>sum+amount,0);return spent<=Math.max(0,Math.min(maxStatPoints,level-1))?next:{...(previous||Object.fromEntries(statKeys.map(key=>[key,0])))};}
function combatStatMultiplier(rank,normalStep,hyperStep){const value=Math.max(0,Math.min(20,Math.floor(rank||0)));return 1+Math.min(10,value)*normalStep+Math.max(0,value-10)*hyperStep;}
function cleanShipId(value,fallback){const id=cleanText(value,fallback,64);return /^[a-z0-9_]+$/.test(id)?id:fallback;}
function hashToUint(value){let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}return hash>>>0;}
function normalizedDistance(pos){return Math.max(0,Math.min(1,Math.hypot(pos.x/worldLimit,pos.y/worldLimit)/Math.sqrt(2)));}
function regionForPosition(pos){const normalized=normalizedDistance(pos);return normalized<=.18?"center":normalized<=.42?"inner":normalized<=.88?"mid":"outer";}
function pvpEnabledAt(pos){return regionForPosition(pos)!=="outer";}
function weightedIndex(seed,weights){const total=weights.reduce((sum,weight)=>sum+weight,0);let roll=(seed/4294967296)*total;for(let index=0;index<weights.length;index+=1){roll-=weights[index];if(roll<=0)return index;}return weights.length-1;}
function authoritativeAsteroidReward(message,pos){const type=etherTypes.has(message.etherType)?message.etherType:null;if(!type)return null;const qualityIndex=etherTypeOrder.indexOf(type);const match=/^asteroid-(-?\d+):(-?\d+)-(\d+)$/.exec(String(message.asteroidId||""));const region=match?regionForPosition({x:(Number(match[1])+.5)*asteroidChunkSize,y:(Number(match[2])+.5)*asteroidChunkSize}):regionForPosition(pos);if(qualityIndex<0||asteroidRegionWeights[region][qualityIndex]<=0)return null;const hash=hashToUint(String(message.asteroidId||""));const sizeIndex=weightedIndex(hash,asteroidSizeWeights);const sizeReward=asteroidSizeRewards[sizeIndex];const quality=asteroidQualityReward[type];return{type,amount:Math.max(1,Math.round(8*sizeReward*quality.ether)),xp:Math.max(1,Math.round(8*sizeReward*quality.xp)),score:Math.max(1,Math.round(10*sizeReward*quality.score))};}
function cleanCustomization(value){const source=value&&typeof value==="object"?value:{};const color=(key,fallback)=>/^#[0-9a-f]{6}$/i.test(source[key])?source[key]:fallback;const choice=(key,allowed,fallback)=>allowed.includes(source[key])?source[key]:fallback;return{name:cleanText(source.name,"Nova Pilot",16),shipColor:color("shipColor","#2fbce1"),glowColor:color("glowColor","#4cc9f0"),trailColor:color("trailColor","#4cc9f0"),projectileColor:color("projectileColor","#eef7ff"),wingVariant:choice("wingVariant",["delta","swept","fork"],"delta"),cockpitVariant:choice("cockpitVariant",["needle","dome","split"],"needle"),decalPattern:choice("decalPattern",["none","stripe","chevron"],"chevron"),thrusterStyle:choice("thrusterStyle",["ion","flare","pulse"],"ion"),glowIntensity:finite(source.glowIntensity,0.8,0,2)};}
function cleanState(value,previous,identity,now=Date.now()){
  const source=value&&typeof value==="object"?value:{};
  const elapsed=Math.max(0.02,Math.min(0.25,(now-(previous?.updatedAt||now-50))/1000));
  const requested={x:finite(source.x,previous?.x||0,-worldLimit,worldLimit),y:finite(source.y,previous?.y||0,-worldLimit,worldLimit)};
  let x=requested.x,y=requested.y;
  if(previous){
    const dx=x-previous.x,dy=y-previous.y,magnitude=Math.hypot(dx,dy),allowed=maxMovementSpeed*elapsed+80;
    if(magnitude>allowed){x=previous.x+dx/magnitude*allowed;y=previous.y+dy/magnitude*allowed;}
  }
  const xp=previous?.xp??xpByLevel[Math.max(1,Math.min(100,previous?.level||1))];
  const score=previous?.score??0;
  const level=levelForXP(xp);
  return{id:identity.id,name:identity.customization.name,customization:identity.customization,x,y,vx:finite(source.vx,0,-maxMovementSpeed,maxMovementSpeed),vy:finite(source.vy,0,-maxMovementSpeed,maxMovementSpeed),thrustForward:finite(source.thrustForward,0,-1,1),thrustStrafe:finite(source.thrustStrafe,0,-1,1),angle:finite(source.angle,0,-Math.PI*4,Math.PI*4),healthRatio:previous?.healthRatio??1,xp,level,score,stats:cleanStats(source.stats,previous?.stats,level),shipClassId:cleanShipId(source.shipClassId,previous?.shipClassId||"space_pod"),shipClass:cleanText(source.shipClass,previous?.shipClass||"Survey Pod",48),docked:previous?.docked??false,updatedAt:now};
}
function teleportState(previous,identity,position,now=Date.now()){
  const next=cleanState({...previous,...position,vx:0,vy:0,thrustForward:0,thrustStrafe:0},null,identity,now);
  if(previous){next.xp=previous.xp;next.score=previous.score;next.level=previous.level;next.stats={...previous.stats};next.shipClassId=previous.shipClassId;next.shipClass=previous.shipClass;}
  return next;
}
function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));}
function randomSpawn(room){
  const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  const occupied=[...room.clients].map(client=>client.playerState).filter(Boolean);
  for(let attempt=0;attempt<16;attempt+=1){
    const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
    const spawn=testSpawnRadius?{x:sx*(testSpawnRadius+Math.random()*1200),y:sy*(testSpawnRadius+Math.random()*1200)}:{x:sx*(180000+Math.random()*14400),y:sy*(180000+Math.random()*14400)};
    if(occupied.every(player=>distance(player,spawn)>12000))return spawn;
  }
  const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
  return{x:sx*(180000+Math.random()*14400),y:sy*(180000+Math.random()*14400)};
}
function createTeam(playerId,name){
  return{id:crypto.randomUUID(),name:`${name}'s Crew`,leaderPlayerId:playerId,memberIds:[playerId],maxMembers:6,stationId:null,createdAt:Date.now()};
}
function createStarterStation(spawn,playerId){
  const angle=-Math.PI/4;
  return{id:crypto.randomUUID(),name:"Derelict Survey Craft",x:spawn.x+Math.cos(angle)*starterWreckDistance,y:spawn.y+Math.sin(angle)*starterWreckDistance,vx:0,vy:0,driveX:0,driveY:0,driverPlayerId:null,driveUpdatedAt:0,facingAngle:0,angularVelocity:0,thrusterForward:0,thrusterRotation:0,turretAngle:-Math.PI/2,turretFiringUntil:0,turretClassId:"base_ship",claimState:"unclaimed",ownerTeamId:null,ownerPlayerId:null,reservedForPlayerId:playerId,starterRepairProgress:0,starterRepairRequired:starterWreckRepairCost,level:1,health:360,maxHealth:2200,isMobile:false,mothershipUnlocked:false,dockedPlayerIds:[]};
}
function spawnNearStation(station){
  const angle=Math.random()*Math.PI*2;
  const distanceFromBase=1100+Math.random()*500;
  return{x:station.x+Math.cos(angle)*distanceFromBase,y:station.y+Math.sin(angle)*distanceFromBase};
}
function getPublicRoom(){
  let room=rooms.get(publicWorldId);
  if(!room){
    const persisted=loadWorldState(worldStatePath);
    const restored=persisted?.worldRevision===worldRevision?persisted:null;
    room={id:publicWorldId,seed:publicWorldSeed,clients:new Set(),stations:new Map(restored?.stations||[]),drops:new Map(),destroyedAsteroids:new Map(restored?.destroyedAsteroids||[]),teams:new Map(restored?.teams||[]),invites:new Map(),projectiles:new Map(),playerRecords:new Map(restored?.playerRecords||[]),dirty:true,persistenceDirty:false};
    for(const station of room.stations.values()){if(!Array.isArray(station.dockedPlayerIds))station.dockedPlayerIds=[];station.vx=finite(station.vx,0,-stationPilotSpeed,stationPilotSpeed);station.vy=finite(station.vy,0,-stationPilotSpeed,stationPilotSpeed);station.driveX=0;station.driveY=0;station.driverPlayerId=null;station.driveUpdatedAt=0;station.facingAngle=finite(station.facingAngle,0,-Math.PI*4,Math.PI*4);station.angularVelocity=finite(station.angularVelocity,0,-stationMaximumRotationSpeed,stationMaximumRotationSpeed);station.thrusterForward=0;station.thrusterRotation=0;station.turretAngle=finite(station.turretAngle,-Math.PI/2,-Math.PI*4,Math.PI*4);station.turretFiringUntil=0;station.turretClassId=cleanText(station.turretClassId,"base_ship",96);station.starterRepairRequired=Math.max(1,Math.round(finite(station.starterRepairRequired,starterWreckRepairCost,1,10000)));station.starterRepairProgress=Math.max(0,Math.round(finite(station.starterRepairProgress,station.claimState==="claimed"?station.starterRepairRequired:0,0,station.starterRepairRequired)));}
    rooms.set(publicWorldId,room);
  }
  return room;
}
function teamForPlayer(room,playerId){return[...room.teams.values()].find(team=>team.memberIds.includes(playerId))||null;}
function publicTeam(team,room){return{...team,members:team.memberIds.map(id=>{const client=[...room.clients].find(entry=>entry.identity?.id===id);return{id,name:client?.identity?.customization?.name||"Offline Pilot",online:Boolean(client)};})};}
function pruneWorld(room,now=Date.now()){
  for(const [id,drop] of room.drops)if(drop.expiresAt<=now||drop.amount<=0)room.drops.delete(id);
  for(const [id,until] of room.destroyedAsteroids)if(until<=now)room.destroyedAsteroids.delete(id);
  for(const [id,invite] of room.invites)if(invite.expiresAt<=now)room.invites.delete(id);
  for(const [id,projectile] of room.projectiles)if(projectile.expiresAt<=now)room.projectiles.delete(id);
}
function broadcastRoom(roomId){
  const room=rooms.get(roomId);if(!room)return;
  pruneWorld(room);
  const players=[...room.clients].map(client=>client.playerState).filter(Boolean);
  const stations=[...room.stations.values()].map(({driveUpdatedAt,...station})=>station);
  const drops=[...room.drops.values()];
  const destroyedAsteroids=[...room.destroyedAsteroids].map(([id,until])=>({id,until}));
  const projectiles=[...room.projectiles.values()];
  const teams=[...room.teams.values()].map(team=>publicTeam(team,room));
  for(const client of room.clients){
    if(client.readyState!==WebSocket.OPEN)continue;
    const playerId=client.identity?.id;
    const team=teamForPlayer(room,playerId);
    const invites=[...room.invites.values()].filter(invite=>invite.targetPlayerId===playerId);
    client.send(JSON.stringify({type:"snapshot",worldId:room.id,serverTime:Date.now(),players,stations,drops,destroyedAsteroids,projectiles,teams,teamId:team?.id||null,invites}));
  }
  room.dirty=false;
}
function markDirty(room){room.dirty=true;room.persistenceDirty=true;}
function persistRoom(room){
  if(!worldStatePath||!room.persistenceDirty)return;
  for(const client of room.clients){if(client.identity?.id&&client.playerState)room.playerRecords.set(client.identity.id,{state:client.playerState,inventory:[...inventoryFor(client)]});}
  saveWorldState(worldStatePath,{worldRevision,stations:[...room.stations],destroyedAsteroids:[...room.destroyedAsteroids],teams:[...room.teams],playerRecords:[...room.playerRecords]});
  room.persistenceDirty=false;
}
function sendError(websocket,message){if(websocket.readyState===WebSocket.OPEN)websocket.send(JSON.stringify({type:"action_error",message}));}
function inventorySnapshot(websocket){return Object.fromEntries(etherTypeOrder.map(type=>[type,inventoryFor(websocket).get(type)||0]));}
function playerProfile(websocket,includeInventory=false){const state=websocket.playerState;return{xp:state?.xp||0,level:state?.level||1,score:state?.score||0,healthRatio:state?.healthRatio??1,shipClassId:state?.shipClassId||"space_pod",shipClass:state?.shipClass||"Survey Pod",stats:{...(state?.stats||{})},...(includeInventory?{inventory:inventorySnapshot(websocket)}:{})};}
function sendProgress(websocket,includeInventory=false){if(websocket?.readyState===WebSocket.OPEN)websocket.send(JSON.stringify({type:"progression_update",profile:playerProfile(websocket,includeInventory)}));}
function removeFromTeam(room,playerId){
  const team=teamForPlayer(room,playerId);if(!team)return true;
  if(team.stationId&&team.leaderPlayerId===playerId&&team.memberIds.length>1)return false;
  team.memberIds=team.memberIds.filter(id=>id!==playerId);
  if(team.leaderPlayerId===playerId)team.leaderPlayerId=team.memberIds[0]||"";
  if(!team.memberIds.length){
    if(team.stationId){const station=room.stations.get(team.stationId);if(station){station.claimState="unclaimed";station.ownerTeamId=null;station.ownerPlayerId=null;station.name="Derelict Spacecraft";}}
    room.teams.delete(team.id);
  }
  return true;
}
function createPersonalTeam(room,websocket){
  const playerId=websocket.identity.id;
  const team=createTeam(playerId,websocket.identity.customization.name);
  room.teams.set(team.id,team);
  return team;
}
function moveStarterStationNearPlayer(room,websocket,spawn){
  const station=[...room.stations.values()].find(entry=>entry.reservedForPlayerId===websocket.identity.id);
  if(!station)return;
  const starter=createStarterStation(spawn,websocket.identity.id);
  station.x=starter.x;
  station.y=starter.y;
}
function spawnAtTeamBase(room,websocket,team){
  const station=team?.stationId?room.stations.get(team.stationId):null;
  if(!station)return null;
  const spawn=spawnNearStation(station);
  websocket.playerState=teleportState(websocket.playerState,websocket.identity,spawn);
  moveStarterStationNearPlayer(room,websocket,spawn);
  return spawn;
}
function joinTeam(room,websocket,targetTeam,spawnAtBase=false){
  const playerId=websocket.identity.id;
  if(!targetTeam||targetTeam.memberIds.length>=targetTeam.maxMembers){sendError(websocket,"That team is full or unavailable.");return false;}
  const current=teamForPlayer(room,playerId);
  if(current?.id===targetTeam.id)return true;
  if(current?.stationId){sendError(websocket,"Leave or transfer your current team before joining another team.");return false;}
  if(!removeFromTeam(room,playerId)){sendError(websocket,"Your current team still depends on you.");return false;}
  targetTeam.memberIds.push(playerId);
  const spawn=spawnAtBase?spawnAtTeamBase(room,websocket,targetTeam):null;
  if(spawn)websocket.send(JSON.stringify({type:"team_spawn",spawn,stationId:targetTeam.stationId}));
  return true;
}
function leaveTeam(room,websocket){
  const playerId=websocket.identity.id;
  const team=teamForPlayer(room,playerId);
  if(!team){sendError(websocket,"You are not currently in a team.");return false;}
  if(team.leaderPlayerId===playerId&&team.memberIds.length>1){sendError(websocket,"Transfer team leadership before leaving.");return false;}
  team.memberIds=team.memberIds.filter(id=>id!==playerId);
  if(team.memberIds.length===0){
    const station=team.stationId?room.stations.get(team.stationId):null;
    if(station){station.claimState="unclaimed";station.ownerTeamId=null;station.ownerPlayerId=null;station.name="Derelict Spacecraft";station.reservedForPlayerId=playerId;}
    room.teams.delete(team.id);
  }
  const replacement=createPersonalTeam(room,websocket);
  websocket.send(JSON.stringify({type:"team_changed",teamId:replacement.id}));
  return true;
}
function removeMember(room,websocket,targetPlayerId){
  const team=teamForPlayer(room,websocket.identity.id);
  if(!team||team.leaderPlayerId!==websocket.identity.id){sendError(websocket,"Only the team leader can remove members.");return false;}
  if(!team.memberIds.includes(targetPlayerId)||targetPlayerId===team.leaderPlayerId){sendError(websocket,"That pilot is not removable from this team.");return false;}
  const target=[...room.clients].find(client=>client.identity?.id===targetPlayerId);
  if(!target){sendError(websocket,"That pilot is offline.");return false;}
  team.memberIds=team.memberIds.filter(id=>id!==targetPlayerId);
  const replacement=createPersonalTeam(room,target);
  target.send(JSON.stringify({type:"team_changed",teamId:replacement.id}));
  return true;
}
function transferLeadership(room,websocket,targetPlayerId){
  const team=teamForPlayer(room,websocket.identity.id);
  if(!team||team.leaderPlayerId!==websocket.identity.id){sendError(websocket,"Only the team leader can transfer leadership.");return false;}
  if(!team.memberIds.includes(targetPlayerId)||targetPlayerId===websocket.identity.id){sendError(websocket,"Choose another member of your team.");return false;}
  team.leaderPlayerId=targetPlayerId;
  return true;
}
function makeDrop(room,args){
  const id=crypto.randomUUID(),now=Date.now();
  const angle=Math.random()*Math.PI*2;
  const drop={id,type:args.type,amount:args.amount,x:args.x-Math.cos(angle)*44,y:args.y-Math.sin(angle)*44,velocityX:Math.cos(angle)*120,velocityY:Math.sin(angle)*120,createdAt:now,pickupDelayMs:args.pickupDelayMs??350,expiresAt:now+120000,ownerId:args.ownerId};
  room.drops.set(id,drop);return drop;
}
function inventoryFor(websocket){
  if(!websocket.inventory)websocket.inventory=new Map();
  return websocket.inventory;
}
function addInventory(websocket,type,amount){const inventory=inventoryFor(websocket);inventory.set(type,(inventory.get(type)||0)+amount);}
function removeInventory(websocket,type,amount){const inventory=inventoryFor(websocket);const available=inventory.get(type)||0;const removed=Math.min(available,amount);inventory.set(type,available-removed);return removed;}
function validAsteroidReport(message,player){
  const match=/^asteroid-(-?\d+):(-?\d+)-(\d+)$/.exec(String(message.asteroidId||""));
  if(!match)return false;
  const chunkX=Number(match[1]),chunkY=Number(match[2]),index=Number(match[3]);
  if(!Number.isSafeInteger(chunkX)||!Number.isSafeInteger(chunkY)||!Number.isSafeInteger(index)||index<0||index>64)return false;
  const x=finite(message.x,NaN,-worldLimit,worldLimit),y=finite(message.y,NaN,-worldLimit,worldLimit);
  if(!Number.isFinite(x)||!Number.isFinite(y)||distance(player,{x,y})>asteroidReportDistance)return false;
  // Asteroids drift after deterministic chunk generation. Allow a narrow
  // boundary margin so a rock crossing its original chunk edge still drops.
  const driftMargin=220,minX=chunkX*asteroidChunkSize-driftMargin,maxX=(chunkX+1)*asteroidChunkSize+driftMargin,minY=chunkY*asteroidChunkSize-driftMargin,maxY=(chunkY+1)*asteroidChunkSize+driftMargin;
  return x>=minX&&x<=maxX&&y>=minY&&y<=maxY;
}
function createProjectile(room,websocket,angle,now){
  const stats=websocket.playerState.stats||{};
  const reloadMultiplier=combatStatMultiplier(stats.reloadSpeed,.06,.09);
  const dockedStation=[...room.stations.values()].find(station=>station.ownerPlayerId===websocket.identity.id&&station.dockedPlayerIds.includes(websocket.identity.id));
  if((websocket.playerState.shipClassId==="space_pod"&&!dockedStation)||(websocket.playerState.docked&&!dockedStation)||websocket.playerState.healthRatio<=0||now-(websocket.lastFireAt||0)<120/reloadMultiplier)return null;
  websocket.lastFireAt=now;
  const speed=projectileSpeed*combatStatMultiplier(stats.bulletSpeed,.06,.09);
  const damage=projectileDamage*combatStatMultiplier(stats.bulletDamage,.08,.13);
  const penetration=combatStatMultiplier(stats.bulletPenetration,.12,.18);
  let origins=[{x:websocket.playerState.x,y:websocket.playerState.y}],barrelOffset=34,angles=[angle];
  if(dockedStation){
    const classId=String(dockedStation.turretClassId||"base_ship").toLowerCase(),twin=classId.includes("twin")||classId.includes("machine_gun_l15"),sniper=classId.includes("sniper");
    const rotation=dockedStation.facingAngle||0,localY=stationRadius*stationTurretMountY;
    origins=(twin?[-stationTurretMountX,stationTurretMountX]:[stationTurretMountX]).map((mountRatio)=>{const localX=stationRadius*mountRatio;return{x:dockedStation.x+localX*Math.cos(rotation)-localY*Math.sin(rotation),y:dockedStation.y+localX*Math.sin(rotation)+localY*Math.cos(rotation)};});
    angles=twin?[angle-.05,angle+.05]:[angle];barrelOffset=(sniper?128:stationTurretBarrelLength)+4;dockedStation.turretAngle=angle;dockedStation.turretFiringUntil=now+90;
  }
  const projectiles=angles.map((shotAngle,index)=>{const origin=origins[index%origins.length],id=crypto.randomUUID();return{id,ownerId:websocket.identity.id,x:origin.x+Math.cos(shotAngle)*barrelOffset,y:origin.y+Math.sin(shotAngle)*barrelOffset,vx:Math.cos(shotAngle)*speed,vy:Math.sin(shotAngle)*speed,radius:7,damage,penetration,color:websocket.identity.customization.projectileColor,createdAt:now,expiresAt:now+projectileLifetimeMs};});
  for(const projectile of projectiles)room.projectiles.set(projectile.id,projectile);return projectiles[0]||null;
}
function simulateRoom(room,now,dt){
  pruneWorld(room,now);
  let changed=false;
  for(const station of room.stations.values()){
    if(now-(station.driveUpdatedAt||0)>180){station.driveX=0;station.driveY=0;station.driverPlayerId=null;}
    const rotationInput=finite(station.driveX,0,-1,1),thrustInput=-finite(station.driveY,0,-1,1);
    station.angularVelocity=finite(station.angularVelocity,0,-stationMaximumRotationSpeed,stationMaximumRotationSpeed)+rotationInput*stationRotationAcceleration*dt;
    const angularDamping=Math.pow(Math.abs(rotationInput)>.001?Math.sqrt(stationRotationDamping):stationRotationDamping,dt);
    station.angularVelocity=Math.max(-stationMaximumRotationSpeed,Math.min(stationMaximumRotationSpeed,station.angularVelocity*angularDamping));
    if(Math.abs(station.angularVelocity)<.001&&Math.abs(rotationInput)<=.001)station.angularVelocity=0;
    station.facingAngle=Math.atan2(Math.sin((station.facingAngle||0)+station.angularVelocity*dt),Math.cos((station.facingAngle||0)+station.angularVelocity*dt));
    const forwardX=Math.sin(station.facingAngle),forwardY=-Math.cos(station.facingAngle);
    const acceleration=thrustInput>=0?stationPilotAcceleration:stationReverseAcceleration;
    station.vx+=forwardX*thrustInput*acceleration*dt;station.vy+=forwardY*thrustInput*acceleration*dt;
    const damping=Math.pow(Math.abs(thrustInput)>.001?stationPilotActiveDamping:stationPilotIdleDamping,dt);station.vx*=damping;station.vy*=damping;
    const localForward=station.vx*forwardX+station.vy*forwardY,localSideX=station.vx-forwardX*localForward,localSideY=station.vy-forwardY*localForward;
    const limitedForward=Math.max(-stationReverseSpeed,Math.min(stationPilotSpeed,localForward));station.vx=localSideX+forwardX*limitedForward;station.vy=localSideY+forwardY*limitedForward;
    const speed=Math.hypot(station.vx,station.vy),safetySpeed=stationPilotSpeed*1.18;if(speed>safetySpeed){station.vx=station.vx/speed*safetySpeed;station.vy=station.vy/speed*safetySpeed;}
    const visualBlend=1-Math.exp(-8*dt);station.thrusterForward=(station.thrusterForward||0)+(thrustInput-(station.thrusterForward||0))*visualBlend;station.thrusterRotation=(station.thrusterRotation||0)+(rotationInput-(station.thrusterRotation||0))*visualBlend;
    if(Math.abs(thrustInput)<=.001&&Math.hypot(station.vx,station.vy)<.5){station.vx=0;station.vy=0;}
    if(Math.hypot(station.vx,station.vy)>.01){station.x=Math.max(-worldLimit+500,Math.min(worldLimit-500,station.x+station.vx*dt));station.y=Math.max(-worldLimit+500,Math.min(worldLimit-500,station.y+station.vy*dt));station.isMobile=true;changed=true;}
    for(const client of room.clients){if(!client.playerState||!station.dockedPlayerIds.includes(client.identity.id))continue;client.playerState.x=station.x;client.playerState.y=station.y;client.playerState.vx=station.vx;client.playerState.vy=station.vy;client.playerState.updatedAt=now;}
  }
  for(const [id,projectile] of room.projectiles){
    projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
    changed=true;
    if(Math.abs(projectile.x)>worldLimit+200||Math.abs(projectile.y)>worldLimit+200){room.projectiles.delete(id);changed=true;continue;}
  }
  const activeProjectiles=[...room.projectiles.values()];
  for(let i=0;i<activeProjectiles.length;i+=1){for(let j=i+1;j<activeProjectiles.length;j+=1){const a=activeProjectiles[i],b=activeProjectiles[j];if(a.ownerId===b.ownerId||!room.projectiles.has(a.id)||!room.projectiles.has(b.id))continue;const aOwner=[...room.clients].find(client=>client.identity?.id===a.ownerId),bOwner=[...room.clients].find(client=>client.identity?.id===b.ownerId);const aTeam=aOwner?teamForPlayer(room,aOwner.identity.id):null,bTeam=bOwner?teamForPlayer(room,bOwner.identity.id):null;if(aTeam&&aTeam.id===bTeam?.id)continue;if(distance(a,b)>a.radius+b.radius)continue;const aPenetration=a.penetration??1,bPenetration=b.penetration??1;a.penetration=aPenetration-bPenetration;b.penetration=bPenetration-aPenetration;if(a.penetration<=0)room.projectiles.delete(a.id);if(b.penetration<=0)room.projectiles.delete(b.id);changed=true;}}
  for(const [id,projectile] of room.projectiles){
    const owner=[...room.clients].find(client=>client.identity?.id===projectile.ownerId);
    const ownerTeam=owner?teamForPlayer(room,owner.identity.id):null;
    for(const target of room.clients){
      if(!target.playerState||target.identity.id===projectile.ownerId||target.playerState.docked||target.playerState.healthRatio<=0)continue;
      const targetTeam=teamForPlayer(room,target.identity.id);if(ownerTeam&&targetTeam?.id===ownerTeam.id)continue;
      if(!owner?.playerState||!pvpEnabledAt(owner.playerState)||!pvpEnabledAt(target.playerState))continue;
      if(distance(projectile,target.playerState)>26+projectile.radius)continue;
      target.playerState.healthRatio=Math.max(0,target.playerState.healthRatio-(projectile.damage||projectileDamage)/120);
      room.projectiles.delete(id);changed=true;
      if(target.readyState===WebSocket.OPEN)target.send(JSON.stringify({type:"player_damaged",healthRatio:target.playerState.healthRatio,sourcePlayerId:projectile.ownerId}));
      if(target.playerState.healthRatio<=0&&owner?.playerState){owner.playerState.xp+=500;owner.playerState.score+=500;owner.playerState.level=levelForXP(owner.playerState.xp);sendProgress(owner);}
      break;
    }
  }
  if(changed)markDirty(room);
}

websocketServer.on("connection",(websocket)=>{
  websocket.isAlive=true;websocket.lastStateAt=0;websocket.asteroidReportTimes=[];websocket.lastFireAt=0;websocket.lastRespawnAt=0;websocket.inventory=new Map();websocket.messageWindowStartedAt=Date.now();websocket.messageCount=0;
  websocket.on("pong",()=>{websocket.isAlive=true;});
  websocket.on("message",(raw)=>{
    const now=Date.now();
    if(now-websocket.messageWindowStartedAt>=1000){websocket.messageWindowStartedAt=now;websocket.messageCount=0;}
    websocket.messageCount+=1;if(websocket.messageCount>160){websocket.close(1008,"Message rate exceeded");return;}
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(!websocket.roomId){
      if(message?.type!=="join")return;
      const room=getPublicRoom();
      if(room.clients.size>=maxPlayersPerRoom){websocket.send(JSON.stringify({type:"error",code:"room_full",message:"This world is full."}));websocket.close(1013,"World full");return;}
      const customization=cleanCustomization(message.customization);
      const requestedSessionId=typeof message.sessionId==="string"&&/^[0-9a-f-]{36}$/i.test(message.sessionId)?message.sessionId:null;
      const playerId=requestedSessionId||crypto.randomUUID();
      const duplicate=[...room.clients].find(client=>client.identity?.id===playerId);
      if(duplicate){duplicate.superseded=true;duplicate.close(4001,"Session resumed elsewhere");room.clients.delete(duplicate);}
      const record=room.playerRecords.get(playerId);
      websocket.roomId=room.id;websocket.identity={id:playerId,customization};
      const spawn=record?{x:record.state.x,y:record.state.y}:randomSpawn(room);
      const restoredLevel=record?levelForXP(record.state?.xp??xpByLevel[Math.max(1,Math.min(100,record.state?.level||1))]):1;
      websocket.playerState=record?{...record.state,level:restoredLevel,stats:cleanStats(record.state?.stats,null,restoredLevel),name:customization.name,customization,updatedAt:now}:cleanState({...message.state,x:spawn.x,y:spawn.y},null,websocket.identity);
      websocket.inventory=new Map(record?.inventory||[]);
      room.clients.add(websocket);
      if(!teamForPlayer(room,playerId))createPersonalTeam(room,websocket);
      const hasStation=[...room.stations.values()].some(station=>station.reservedForPlayerId===playerId||station.ownerPlayerId===playerId);
      if(!hasStation){const station=createStarterStation(spawn,websocket.identity.id);room.stations.set(station.id,station);}
      websocket.send(JSON.stringify({type:"welcome",playerId:websocket.identity.id,room:"public",worldId:room.id,worldSeed:room.seed,spawn,serverTime:now,profile:playerProfile(websocket,true)}));
      websocket.lastStateAt=0;markDirty(room);return;
    }
    const room=rooms.get(websocket.roomId);if(!room)return;
    const playerId=websocket.identity.id;
    if(message?.type==="state"){
      if(now-websocket.lastStateAt<40)return;websocket.lastStateAt=now;
      const next=cleanState(message.state,websocket.playerState,websocket.identity,now);
      const nearestStation=[...room.stations.values()].reduce((best,station)=>distance(next,station)<distance(next,best)?station:best,{x:Infinity,y:Infinity});
      const team=teamForPlayer(room,playerId);const requestedDock=Boolean(message.state?.docked&&team?.stationId&&nearestStation.id===team.stationId&&distance(next,nearestStation)<=stationDockDistance&&Math.hypot(next.vx,next.vy)<=180);
      const alreadyDocked=Array.isArray(nearestStation.dockedPlayerIds)&&nearestStation.dockedPlayerIds.includes(playerId);
      const canDock=requestedDock&&(alreadyDocked||nearestStation.dockedPlayerIds.length<6);
      for(const station of room.stations.values())station.dockedPlayerIds=station.dockedPlayerIds.filter(id=>id!==playerId);
      if(canDock)nearestStation.dockedPlayerIds.push(playerId);
      if(canDock&&next.shipClassId==="space_pod"){next.shipClassId=nearestStation.turretClassId||"base_ship";next.shipClass="Base Ship";}
      else if(alreadyDocked&&!canDock){next.shipClassId="space_pod";next.shipClass="Survey Pod";}
      next.docked=canDock;websocket.playerState=next;markDirty(room);return;
    }
    if(message?.type==="station_input"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.ownerTeamId!==team.id||station.ownerPlayerId!==playerId||!station.dockedPlayerIds.includes(playerId))return;
      if(station.driverPlayerId&&station.driverPlayerId!==playerId&&now-(station.driveUpdatedAt||0)<=180)return;
      station.driverPlayerId=playerId;station.driveUpdatedAt=now;station.driveX=finite(message.x,0,-1,1);station.driveY=finite(message.y,0,-1,1);station.turretAngle=finite(message.aimAngle,station.turretAngle||0,-Math.PI*4,Math.PI*4);station.turretClassId=websocket.playerState.shipClassId||"base_ship";markDirty(room);return;
    }
    if(message?.type==="evolve"){
      const targetId=cleanShipId(message.shipClassId,"");
      const levelMatch=targetId.match(/_l(15|30|45|60|75|90|100)_/);
      const requiredLevel=targetId==="base_ship"?1:Number(levelMatch?.[1]||Infinity);
      if(!targetId||requiredLevel>websocket.playerState.level){sendError(websocket,"That spacecraft evolution is not available yet.");return;}
      websocket.playerState.shipClassId=targetId;
      websocket.playerState.shipClass=cleanText(message.shipClass,"Spacecraft",48);
      sendProgress(websocket);markDirty(room);return;
    }
    if(message?.type==="fire"){const angle=finite(message.angle,websocket.playerState.angle,-Math.PI*4,Math.PI*4);if(createProjectile(room,websocket,angle,now))markDirty(room);return;}
    if(message?.type==="request_respawn"){
      if(now-websocket.lastRespawnAt<8000)return;
      websocket.lastRespawnAt=now;
      const team=teamForPlayer(room,websocket.identity.id);
      const station=team?.stationId?room.stations.get(team.stationId):null;
      const canUseStation=station?.claimState==="claimed"&&station.health>0;
      const respawn=canUseStation?spawnNearStation(station):randomSpawn(room);
      for(const entry of room.stations.values())entry.dockedPlayerIds=entry.dockedPlayerIds.filter(id=>id!==websocket.identity.id);
      websocket.playerState=teleportState(websocket.playerState,websocket.identity,respawn,now);
      websocket.playerState.healthRatio=1;
      websocket.send(JSON.stringify({type:"respawn",respawn,stationId:canUseStation?station.id:null}));
      markDirty(room);return;
    }
    if(message?.type==="drop_cargo"){
      const type=etherTypes.has(message.etherType)?message.etherType:null;
      const requested=Math.round(finite(message.amount,0,1,100000));
      if(!type||!requested)return;
      const amount=removeInventory(websocket,type,requested);if(!amount){sendError(websocket,"Server inventory does not contain that cargo.");return;}
      makeDrop(room,{type,amount,x:websocket.playerState.x,y:websocket.playerState.y,ownerId:playerId,pickupDelayMs:2000});markDirty(room);return;
    }
    if(message?.type==="pickup_drop"){
      const drop=room.drops.get(String(message.dropId||""));if(!drop)return;
      if(now<drop.createdAt+drop.pickupDelayMs||distance(websocket.playerState,drop)>pickupDistance)return;
      const amount=Math.min(drop.amount,Math.round(finite(message.amount,drop.amount,1,drop.amount)));
      drop.amount-=amount;if(drop.amount<=0)room.drops.delete(drop.id);addInventory(websocket,drop.type,amount);
      websocket.send(JSON.stringify({type:"loot_collected",dropId:drop.id,etherType:drop.type,amount}));markDirty(room);return;
    }
    if(message?.type==="asteroid_destroyed"){
      const asteroidId=cleanText(message.asteroidId,"",96);if(!asteroidId||room.destroyedAsteroids.get(asteroidId)>now||!validAsteroidReport(message,websocket.playerState))return;
      websocket.asteroidReportTimes=websocket.asteroidReportTimes.filter((reportedAt)=>now-reportedAt<asteroidReportWindowMs);
      if(websocket.asteroidReportTimes.length>=maxAsteroidReportsPerWindow)return;
      websocket.asteroidReportTimes.push(now);
      const pos={x:finite(message.x,websocket.playerState.x,-worldLimit,worldLimit),y:finite(message.y,websocket.playerState.y,-worldLimit,worldLimit)};
      if(distance(pos,websocket.playerState)>2400)return;
      const reward=authoritativeAsteroidReward(message,pos);if(!reward)return;
      const respawnMs=300000;
      room.destroyedAsteroids.set(asteroidId,now+respawnMs);
      const type=reward.type;
      let remaining=reward.amount;
      websocket.playerState.xp=Math.min(Number.MAX_SAFE_INTEGER,websocket.playerState.xp+reward.xp);
      websocket.playerState.score=Math.min(2_000_000_000,websocket.playerState.score+reward.score);
      websocket.playerState.level=levelForXP(websocket.playerState.xp);
      const shards=Math.min(12,Math.max(2,Math.ceil(Math.sqrt(remaining))));
      for(let i=0;i<shards&&remaining>0;i+=1){const amount=i===shards-1?remaining:Math.max(1,Math.round(remaining/(shards-i)));remaining-=amount;makeDrop(room,{type,amount,x:pos.x+(Math.random()-.5)*80,y:pos.y+(Math.random()-.5)*80,ownerId:playerId});}
      sendProgress(websocket);markDirty(room);return;
    }
    if(message?.type==="repair_wreck"){
      const station=room.stations.get(String(message.stationId||""));
      if(!station||station.claimState!=="unclaimed"||station.reservedForPlayerId!==playerId||distance(websocket.playerState,station)>stationClaimDistance){sendError(websocket,"Move directly over your broken spacecraft before installing repairs.");return;}
      station.starterRepairRequired=Math.max(1,station.starterRepairRequired||starterWreckRepairCost);
      const missing=Math.max(0,station.starterRepairRequired-(station.starterRepairProgress||0));
      if(missing<=0){sendError(websocket,"The starter hull is already repaired. Land to integrate with it.");return;}
      const installed=removeInventory(websocket,"rawEther",missing);
      if(installed<=0){sendError(websocket,"Mine nearby asteroids and collect Raw Ether before repairing the spacecraft.");return;}
      station.starterRepairProgress=Math.min(station.starterRepairRequired,(station.starterRepairProgress||0)+installed);
      const ratio=station.starterRepairProgress/station.starterRepairRequired;
      station.health=Math.max(station.health,station.maxHealth*(.16+ratio*.18));
      sendProgress(websocket,true);markDirty(room);return;
    }
    if(message?.type==="claim_station"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.claimState!=="unclaimed"||station.reservedForPlayerId!==playerId||team.stationId||distance(websocket.playerState,station)>stationClaimDistance){sendError(websocket,"Move directly into your spacecraft cradle before claiming it.");return;}
      if((station.starterRepairProgress||0)<(station.starterRepairRequired||starterWreckRepairCost)){sendError(websocket,"Repair the broken spacecraft with Raw Ether before landing.");return;}
      station.claimState="claimed";station.ownerTeamId=team.id;station.ownerPlayerId=playerId;station.name=`${websocket.identity.customization.name}'s Craft`;station.reservedForPlayerId=null;station.health=Math.max(station.health,station.maxHealth*.34);team.stationId=station.id;
      for(const entry of room.stations.values())entry.dockedPlayerIds=entry.dockedPlayerIds.filter(id=>id!==playerId);
      station.dockedPlayerIds.push(playerId);websocket.playerState.x=station.x;websocket.playerState.y=station.y;websocket.playerState.vx=0;websocket.playerState.vy=0;websocket.playerState.docked=true;websocket.playerState.updatedAt=now;websocket.playerState.shipClassId="base_ship";websocket.playerState.shipClass="Base Ship";sendProgress(websocket);markDirty(room);return;
    }
    if(message?.type==="rename_station"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.ownerTeamId!==team.id||team.leaderPlayerId!==playerId){sendError(websocket,"Only the team leader can rename this station.");return;}
      station.name=cleanText(message.name,station.name,28);markDirty(room);return;
    }
    if(message?.type==="join_team"){const team=room.teams.get(String(message.teamId||""));if(joinTeam(room,websocket,team,Boolean(message.spawnAtBase)))markDirty(room);return;}
    if(message?.type==="invite_player"){
      const team=teamForPlayer(room,playerId);const targetId=String(message.playerId||"");
      if(!team||team.leaderPlayerId!==playerId||team.memberIds.length>=team.maxMembers||team.memberIds.includes(targetId)){sendError(websocket,"Only the team leader can invite available pilots.");return;}
      if(![...room.clients].some(client=>client.identity?.id===targetId))return;
      for(const [id,invite] of room.invites)if(invite.teamId===team.id&&invite.targetPlayerId===targetId)room.invites.delete(id);
      const invite={id:crypto.randomUUID(),teamId:team.id,teamName:team.name,invitedByPlayerId:playerId,invitedByName:websocket.identity.customization.name,targetPlayerId:targetId,createdAt:now,expiresAt:now+120000};
      room.invites.set(invite.id,invite);markDirty(room);return;
    }
    if(message?.type==="accept_invite"){
      const invite=room.invites.get(String(message.inviteId||""));if(!invite||invite.targetPlayerId!==playerId)return;
      const team=room.teams.get(invite.teamId);if(joinTeam(room,websocket,team,Boolean(message.spawnAtBase))){for(const [id,item] of room.invites)if(item.targetPlayerId===playerId)room.invites.delete(id);markDirty(room);}return;
    }
    if(message?.type==="leave_team"){if(leaveTeam(room,websocket))markDirty(room);return;}
    if(message?.type==="remove_member"){if(removeMember(room,websocket,String(message.playerId||"")))markDirty(room);return;}
    if(message?.type==="transfer_leader"){if(transferLeadership(room,websocket,String(message.playerId||"")))markDirty(room);return;}
    if(message?.type==="decline_invite"){const invite=room.invites.get(String(message.inviteId||""));if(invite?.targetPlayerId===playerId){room.invites.delete(invite.id);markDirty(room);}return;}
  });
  websocket.on("close",()=>{
    const room=rooms.get(websocket.roomId);if(!room)return;
    room.clients.delete(websocket);
    const playerId=websocket.identity?.id;const team=teamForPlayer(room,playerId);
    if(playerId&&!websocket.superseded)room.playerRecords.set(playerId,{state:websocket.playerState,inventory:[...inventoryFor(websocket)]});
    for(const station of room.stations.values()){station.dockedPlayerIds=station.dockedPlayerIds.filter(id=>id!==playerId);if(station.driverPlayerId===playerId){station.driverPlayerId=null;station.driveX=0;station.driveY=0;station.driveUpdatedAt=0;}}
    for(const [id,invite] of room.invites)if(invite.targetPlayerId===playerId||invite.invitedByPlayerId===playerId)room.invites.delete(id);
    markDirty(room);
  });
});
let lastSimulationAt=Date.now();
const simulation=setInterval(()=>{const now=Date.now(),dt=Math.min(0.1,(now-lastSimulationAt)/1000);lastSimulationAt=now;for(const room of rooms.values())simulateRoom(room,now,dt);},simulationIntervalMs);simulation.unref();
const snapshots=setInterval(()=>{for(const room of rooms.values())if(room.clients.size&&room.dirty)broadcastRoom(room.id);},snapshotIntervalMs);snapshots.unref();
const persistence=setInterval(()=>{for(const room of rooms.values())persistRoom(room);},5000);persistence.unref();
const heartbeat=setInterval(()=>{for(const websocket of websocketServer.clients){if(!websocket.isAlive){websocket.terminate();continue;}websocket.isAlive=false;websocket.ping();}},30_000);heartbeat.unref();
server.listen(port,host,()=>console.log(`Baseborn.io listening on http://${host}:${port}`));
function shutdown(signal){console.log(`${signal} received; closing Baseborn.io server`);clearInterval(heartbeat);clearInterval(simulation);clearInterval(snapshots);clearInterval(persistence);for(const room of rooms.values())persistRoom(room);for(const client of websocketServer.clients)client.close(1001,"Server restarting");server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10_000).unref();}
process.on("SIGTERM",()=>shutdown("SIGTERM"));process.on("SIGINT",()=>shutdown("SIGINT"));
