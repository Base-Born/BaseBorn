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
const worldRevision = "pod-start-v1";
const startedAt = Date.now();
const worldStatePath = process.env.WORLD_STATE_PATH || "";
const etherTypes = new Set(["rawEther", "refinedEther", "chargedEther", "radiantEther", "primalEther", "coreEther"]);
const worldLimit = 200000;
const snapshotIntervalMs = 50;
const simulationIntervalMs = 25;
const maxMovementSpeed = 1800;
const pickupDistance = 180;
const stationClaimDistance = 145;
const stationDockDistance = 180;
const asteroidChunkSize = 1600;
const projectileSpeed = 720;
const projectileLifetimeMs = 1800;
const asteroidReportDistance = projectileSpeed * projectileLifetimeMs / 1000 + 64;
const asteroidReportWindowMs = 300;
const maxAsteroidReportsPerWindow = 8;
const projectileDamage = 14;
const stationPilotSpeed = 230;
const stationPilotResponse = 6.8;
const stationPilotBrakeResponse = 8.5;
const contentTypes = { ".css":"text/css; charset=utf-8", ".html":"text/html; charset=utf-8", ".ico":"image/x-icon", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".map":"application/json; charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp", ".woff2":"font/woff2" };

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" });
  response.end(JSON.stringify(body));
}
function roomPopulation() { let players=0; for (const room of rooms.values()) players += room.clients.size; return players; }
function serveFile(response, filePath) {
  const extension=extname(filePath).toLowerCase();
  response.writeHead(200, { "Content-Type":contentTypes[extension]||"application/octet-stream", "Cache-Control":filePath.includes(`${join("assets", "")}`)?"public, max-age=31536000, immutable":"no-cache", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"same-origin" });
  createReadStream(filePath).pipe(response);
}

const server=createServer((request,response)=>{
  const url=new URL(request.url||"/",`http://${request.headers.host||"localhost"}`);
  if(url.pathname==="/health"){sendJson(response,200,{status:"ok",uptimeSeconds:Math.floor((Date.now()-startedAt)/1000),players:roomPopulation(),rooms:rooms.size});return;}
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
  const score=previous?.score??0;
  const level=previous?.level??1;
  return{id:identity.id,name:identity.customization.name,customization:identity.customization,x,y,vx:finite(source.vx,0,-maxMovementSpeed,maxMovementSpeed),vy:finite(source.vy,0,-maxMovementSpeed,maxMovementSpeed),thrustForward:finite(source.thrustForward,0,-1,1),thrustStrafe:finite(source.thrustStrafe,0,-1,1),angle:finite(source.angle,0,-Math.PI*4,Math.PI*4),healthRatio:previous?.healthRatio??1,level,score,shipClassId:cleanText(source.shipClassId,previous?.shipClassId||"space_pod",64),shipClass:cleanText(source.shipClass,previous?.shipClass||"Survey Pod",48),docked:previous?.docked??false,updatedAt:now};
}
function teleportState(previous,identity,position,now=Date.now()){
  const next=cleanState({...previous,...position,vx:0,vy:0,thrustForward:0,thrustStrafe:0},null,identity,now);
  if(previous){next.score=previous.score;next.level=previous.level;next.shipClassId=previous.shipClassId;next.shipClass=previous.shipClass;}
  return next;
}
function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));}
function randomSpawn(room){
  const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  const occupied=[...room.clients].map(client=>client.playerState).filter(Boolean);
  for(let attempt=0;attempt<16;attempt+=1){
    const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
    const spawn={x:sx*(180000+Math.random()*14400),y:sy*(180000+Math.random()*14400)};
    if(occupied.every(player=>distance(player,spawn)>12000))return spawn;
  }
  const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
  return{x:sx*(180000+Math.random()*14400),y:sy*(180000+Math.random()*14400)};
}
function createTeam(playerId,name){
  return{id:crypto.randomUUID(),name:`${name}'s Crew`,leaderPlayerId:playerId,memberIds:[playerId],maxMembers:6,stationId:null,createdAt:Date.now()};
}
function createStarterStation(spawn,playerId){
  const sx=Math.sign(spawn.x)||1,sy=Math.sign(spawn.y)||1;
  return{id:crypto.randomUUID(),name:"Derelict Survey Craft",x:spawn.x-sx*920,y:spawn.y-sy*920,vx:0,vy:0,driveX:0,driveY:0,driverPlayerId:null,driveUpdatedAt:0,claimState:"unclaimed",ownerTeamId:null,ownerPlayerId:null,reservedForPlayerId:playerId,level:1,health:360,maxHealth:2200,isMobile:false,mothershipUnlocked:false,dockedPlayerIds:[]};
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
    for(const station of room.stations.values()){if(!Array.isArray(station.dockedPlayerIds))station.dockedPlayerIds=[];station.vx=finite(station.vx,0,-stationPilotSpeed,stationPilotSpeed);station.vy=finite(station.vy,0,-stationPilotSpeed,stationPilotSpeed);station.driveX=0;station.driveY=0;station.driverPlayerId=null;station.driveUpdatedAt=0;}
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
  const stations=[...room.stations.values()].map(({driveX,driveY,driveUpdatedAt,...station})=>station);
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
  return Math.floor(x/asteroidChunkSize)===chunkX&&Math.floor(y/asteroidChunkSize)===chunkY;
}
function createProjectile(room,websocket,angle,now){
  if(websocket.playerState.docked||websocket.playerState.healthRatio<=0||now-(websocket.lastFireAt||0)<120)return null;
  websocket.lastFireAt=now;
  const id=crypto.randomUUID();
  const projectile={id,ownerId:websocket.identity.id,x:websocket.playerState.x+Math.cos(angle)*34,y:websocket.playerState.y+Math.sin(angle)*34,vx:Math.cos(angle)*projectileSpeed,vy:Math.sin(angle)*projectileSpeed,radius:7,color:websocket.identity.customization.projectileColor,createdAt:now,expiresAt:now+projectileLifetimeMs};
  room.projectiles.set(id,projectile);return projectile;
}
function simulateRoom(room,now,dt){
  pruneWorld(room,now);
  let changed=false;
  for(const station of room.stations.values()){
    if(now-(station.driveUpdatedAt||0)>180){station.driveX=0;station.driveY=0;station.driverPlayerId=null;}
    const magnitude=Math.hypot(station.driveX||0,station.driveY||0);
    const dx=magnitude>.001?station.driveX/magnitude:0,dy=magnitude>.001?station.driveY/magnitude:0;
    const response=magnitude>.001?stationPilotResponse:stationPilotBrakeResponse;
    const blend=1-Math.exp(-response*dt);
    station.vx+=(dx*stationPilotSpeed-station.vx)*blend;station.vy+=(dy*stationPilotSpeed-station.vy)*blend;
    if(magnitude<=.001&&Math.hypot(station.vx,station.vy)<.5){station.vx=0;station.vy=0;}
    if(Math.hypot(station.vx,station.vy)>.01){station.x=Math.max(-worldLimit+500,Math.min(worldLimit-500,station.x+station.vx*dt));station.y=Math.max(-worldLimit+500,Math.min(worldLimit-500,station.y+station.vy*dt));station.isMobile=true;changed=true;}
    for(const client of room.clients){if(!client.playerState||!station.dockedPlayerIds.includes(client.identity.id))continue;client.playerState.x=station.x;client.playerState.y=station.y;client.playerState.vx=station.vx;client.playerState.vy=station.vy;client.playerState.updatedAt=now;}
  }
  for(const [id,projectile] of room.projectiles){
    projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
    changed=true;
    if(Math.abs(projectile.x)>worldLimit+200||Math.abs(projectile.y)>worldLimit+200){room.projectiles.delete(id);changed=true;continue;}
    const owner=[...room.clients].find(client=>client.identity?.id===projectile.ownerId);
    const ownerTeam=owner?teamForPlayer(room,owner.identity.id):null;
    for(const target of room.clients){
      if(!target.playerState||target.identity.id===projectile.ownerId||target.playerState.docked||target.playerState.healthRatio<=0)continue;
      const targetTeam=teamForPlayer(room,target.identity.id);if(ownerTeam&&targetTeam?.id===ownerTeam.id)continue;
      if(distance(projectile,target.playerState)>26+projectile.radius)continue;
      target.playerState.healthRatio=Math.max(0,target.playerState.healthRatio-projectileDamage/120);
      room.projectiles.delete(id);changed=true;
      if(target.readyState===WebSocket.OPEN)target.send(JSON.stringify({type:"player_damaged",healthRatio:target.playerState.healthRatio,sourcePlayerId:projectile.ownerId}));
      if(target.playerState.healthRatio<=0&&owner?.playerState){owner.playerState.score+=500;owner.playerState.level=Math.min(100,Math.max(owner.playerState.level,1+Math.floor(owner.playerState.score/1200)));}
      break;
    }
  }
  if(changed)markDirty(room);
}

websocketServer.on("connection",(websocket)=>{
  websocket.isAlive=true;websocket.lastStateAt=0;websocket.asteroidReportTimes=[];websocket.lastFireAt=0;websocket.lastRespawnAt=0;websocket.inventory=new Map();
  websocket.on("pong",()=>{websocket.isAlive=true;});
  websocket.on("message",(raw)=>{
    const now=Date.now();
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
      websocket.playerState=record?{...record.state,name:customization.name,customization,updatedAt:now}:cleanState({...message.state,x:spawn.x,y:spawn.y},null,websocket.identity);
      websocket.inventory=new Map(record?.inventory||[]);
      room.clients.add(websocket);
      if(!teamForPlayer(room,playerId))createPersonalTeam(room,websocket);
      const hasStation=[...room.stations.values()].some(station=>station.reservedForPlayerId===playerId||station.ownerPlayerId===playerId);
      if(!hasStation){const station=createStarterStation(spawn,websocket.identity.id);room.stations.set(station.id,station);}
      websocket.send(JSON.stringify({type:"welcome",playerId:websocket.identity.id,room:"public",worldId:room.id,worldSeed:room.seed,spawn,serverTime:now}));
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
      next.docked=canDock;websocket.playerState=next;markDirty(room);return;
    }
    if(message?.type==="station_input"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.ownerTeamId!==team.id||station.ownerPlayerId!==playerId||!station.dockedPlayerIds.includes(playerId))return;
      if(station.driverPlayerId&&station.driverPlayerId!==playerId&&now-(station.driveUpdatedAt||0)<=180)return;
      station.driverPlayerId=playerId;station.driveUpdatedAt=now;station.driveX=finite(message.x,0,-1,1);station.driveY=finite(message.y,0,-1,1);markDirty(room);return;
    }
    if(message?.type==="fire"){const angle=finite(message.angle,websocket.playerState.angle,-Math.PI*4,Math.PI*4);if(createProjectile(room,websocket,angle,now))markDirty(room);return;}
    if(message?.type==="request_respawn"){if(websocket.playerState.healthRatio>0&&now-websocket.lastRespawnAt<8000)return;websocket.lastRespawnAt=now;const respawn=randomSpawn(room);websocket.playerState=teleportState(websocket.playerState,websocket.identity,respawn,now);websocket.playerState.healthRatio=1;websocket.send(JSON.stringify({type:"respawn",respawn}));markDirty(room);return;}
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
      const respawnMs=300000;
      room.destroyedAsteroids.set(asteroidId,now+respawnMs);
      const type=etherTypes.has(message.etherType)?message.etherType:"rawEther";
      let remaining=Math.round(finite(message.amount,1,1,500));
      websocket.playerState.score=Math.min(2_000_000_000,websocket.playerState.score+remaining*5);
      websocket.playerState.level=Math.min(100,1+Math.floor(Math.sqrt(websocket.playerState.score/180)));
      const shards=Math.min(12,Math.max(2,Math.ceil(Math.sqrt(remaining))));
      for(let i=0;i<shards&&remaining>0;i+=1){const amount=i===shards-1?remaining:Math.max(1,Math.round(remaining/(shards-i)));remaining-=amount;makeDrop(room,{type,amount,x:pos.x+(Math.random()-.5)*80,y:pos.y+(Math.random()-.5)*80,ownerId:playerId});}
      markDirty(room);return;
    }
    if(message?.type==="claim_station"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.claimState!=="unclaimed"||team.stationId||distance(websocket.playerState,station)>stationClaimDistance){sendError(websocket,"Move directly into the spacecraft cradle before claiming it.");return;}
      station.claimState="claimed";station.ownerTeamId=team.id;station.ownerPlayerId=playerId;station.name=`${websocket.identity.customization.name}'s Craft`;station.reservedForPlayerId=null;team.stationId=station.id;markDirty(room);return;
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
