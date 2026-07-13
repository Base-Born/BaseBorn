import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const maxPlayersPerRoom = Math.max(2, Number.parseInt(process.env.MAX_PLAYERS_PER_ROOM || "64", 10));
const rooms = new Map();
const publicWorldId = "baseborn-prime";
const publicWorldSeed = 0x5ba5e0d1;
const startedAt = Date.now();
const etherTypes = new Set(["rawEther", "refinedEther", "chargedEther", "radiantEther", "primalEther", "coreEther"]);
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
function cleanCustomization(value){const source=value&&typeof value==="object"?value:{};const color=(key,fallback)=>/^#[0-9a-f]{6}$/i.test(source[key])?source[key]:fallback;const choice=(key,allowed,fallback)=>allowed.includes(source[key])?source[key]:fallback;return{name:cleanText(source.name,"Nova Pilot",16),shipColor:color("shipColor","#2fbce1"),glowColor:color("glowColor","#4cc9f0"),trailColor:color("trailColor","#6edb8f"),projectileColor:color("projectileColor","#eef7ff"),wingVariant:choice("wingVariant",["delta","swept","fork"],"delta"),cockpitVariant:choice("cockpitVariant",["needle","dome","split"],"needle"),decalPattern:choice("decalPattern",["none","stripe","chevron"],"chevron"),thrusterStyle:choice("thrusterStyle",["ion","flare","pulse"],"ion"),glowIntensity:finite(source.glowIntensity,0.8,0,2)};}
function cleanState(value,previous,identity){const source=value&&typeof value==="object"?value:{};return{id:identity.id,name:identity.customization.name,customization:identity.customization,x:finite(source.x,previous?.x||0,-500000,500000),y:finite(source.y,previous?.y||0,-500000,500000),vx:finite(source.vx,0,-5000,5000),vy:finite(source.vy,0,-5000,5000),angle:finite(source.angle,0,-Math.PI*4,Math.PI*4),healthRatio:finite(source.healthRatio,1,0,1),level:Math.round(finite(source.level,1,1,100)),score:Math.round(finite(source.score,0,0,2_000_000_000)),shipClassId:cleanText(source.shipClassId,"base_ship",64),shipClass:cleanText(source.shipClass,"Base Ship",48),docked:Boolean(source.docked),updatedAt:Date.now()};}
function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));}
function randomSpawn(room){
  const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
  const occupied=[...room.clients].map(client=>client.playerState).filter(Boolean);
  for(let attempt=0;attempt<16;attempt+=1){
    const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
    const spawn={x:sx*(450000+Math.random()*36000),y:sy*(450000+Math.random()*36000)};
    if(occupied.every(player=>distance(player,spawn)>12000))return spawn;
  }
  const [sx,sy]=corners[Math.floor(Math.random()*corners.length)];
  return{x:sx*(450000+Math.random()*36000),y:sy*(450000+Math.random()*36000)};
}
function createTeam(playerId,name){
  return{id:crypto.randomUUID(),name:`${name}'s Crew`,leaderPlayerId:playerId,memberIds:[playerId],maxMembers:6,stationId:null,createdAt:Date.now()};
}
function createStarterStation(spawn,playerId){
  const sx=Math.sign(spawn.x)||1,sy=Math.sign(spawn.y)||1;
  return{id:crypto.randomUUID(),name:"Broken Station",x:spawn.x-sx*1400,y:spawn.y-sy*1400,claimState:"unclaimed",ownerTeamId:null,ownerPlayerId:null,reservedForPlayerId:playerId,level:1,health:360,maxHealth:2200,isMobile:false,mothershipUnlocked:false};
}
function spawnNearStation(station){
  const angle=Math.random()*Math.PI*2;
  const distanceFromBase=1100+Math.random()*500;
  return{x:station.x+Math.cos(angle)*distanceFromBase,y:station.y+Math.sin(angle)*distanceFromBase};
}
function getPublicRoom(){
  let room=rooms.get(publicWorldId);
  if(!room){room={id:publicWorldId,seed:publicWorldSeed,clients:new Set(),stations:new Map(),drops:new Map(),destroyedAsteroids:new Map(),teams:new Map(),invites:new Map()};rooms.set(publicWorldId,room);}
  return room;
}
function teamForPlayer(room,playerId){return[...room.teams.values()].find(team=>team.memberIds.includes(playerId))||null;}
function publicTeam(team,room){return{...team,members:team.memberIds.map(id=>{const client=[...room.clients].find(entry=>entry.identity?.id===id);return{id,name:client?.identity?.customization?.name||"Offline Pilot",online:Boolean(client)};})};}
function pruneWorld(room,now=Date.now()){
  for(const [id,drop] of room.drops)if(drop.expiresAt<=now||drop.amount<=0)room.drops.delete(id);
  for(const [id,until] of room.destroyedAsteroids)if(until<=now)room.destroyedAsteroids.delete(id);
  for(const [id,invite] of room.invites)if(invite.expiresAt<=now)room.invites.delete(id);
}
function broadcastRoom(roomId){
  const room=rooms.get(roomId);if(!room)return;
  pruneWorld(room);
  const players=[...room.clients].map(client=>client.playerState).filter(Boolean);
  const stations=[...room.stations.values()];
  const drops=[...room.drops.values()];
  const destroyedAsteroids=[...room.destroyedAsteroids].map(([id,until])=>({id,until}));
  const teams=[...room.teams.values()].map(team=>publicTeam(team,room));
  for(const client of room.clients){
    if(client.readyState!==WebSocket.OPEN)continue;
    const playerId=client.identity?.id;
    const team=teamForPlayer(room,playerId);
    const invites=[...room.invites.values()].filter(invite=>invite.targetPlayerId===playerId);
    client.send(JSON.stringify({type:"snapshot",worldId:room.id,serverTime:Date.now(),players,stations,drops,destroyedAsteroids,teams,teamId:team?.id||null,invites}));
  }
}
function sendError(websocket,message){if(websocket.readyState===WebSocket.OPEN)websocket.send(JSON.stringify({type:"action_error",message}));}
function removeFromTeam(room,playerId){
  const team=teamForPlayer(room,playerId);if(!team)return true;
  if(team.stationId&&team.leaderPlayerId===playerId&&team.memberIds.length>1)return false;
  team.memberIds=team.memberIds.filter(id=>id!==playerId);
  if(team.leaderPlayerId===playerId)team.leaderPlayerId=team.memberIds[0]||"";
  if(!team.memberIds.length){
    if(team.stationId){const station=room.stations.get(team.stationId);if(station){station.claimState="unclaimed";station.ownerTeamId=null;station.ownerPlayerId=null;station.name="Abandoned Station";}}
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
  websocket.playerState=cleanState({...websocket.playerState,x:spawn.x,y:spawn.y,vx:0,vy:0},websocket.playerState,websocket.identity);
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
    if(station){station.claimState="unclaimed";station.ownerTeamId=null;station.ownerPlayerId=null;station.name="Abandoned Station";station.reservedForPlayerId=playerId;}
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

websocketServer.on("connection",(websocket)=>{
  websocket.isAlive=true;websocket.lastStateAt=0;
  websocket.on("pong",()=>{websocket.isAlive=true;});
  websocket.on("message",(raw)=>{
    const now=Date.now();
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(!websocket.roomId){
      if(message?.type!=="join")return;
      const room=getPublicRoom();
      if(room.clients.size>=maxPlayersPerRoom){websocket.send(JSON.stringify({type:"error",code:"room_full",message:"This world is full."}));websocket.close(1013,"World full");return;}
      const customization=cleanCustomization(message.customization);
      websocket.roomId=room.id;websocket.identity={id:crypto.randomUUID(),customization};
      const spawn=randomSpawn(room);
      websocket.playerState=cleanState({...message.state,x:spawn.x,y:spawn.y},null,websocket.identity);
      room.clients.add(websocket);
      const team=createPersonalTeam(room,websocket);
      const station=createStarterStation(spawn,websocket.identity.id);room.stations.set(station.id,station);
      websocket.send(JSON.stringify({type:"welcome",playerId:websocket.identity.id,room:"public",worldId:room.id,worldSeed:room.seed,spawn,serverTime:now}));
      websocket.lastStateAt=0;broadcastRoom(room.id);return;
    }
    const room=rooms.get(websocket.roomId);if(!room)return;
    const playerId=websocket.identity.id;
    if(message?.type==="state"){if(now-websocket.lastStateAt<20)return;websocket.lastStateAt=now;websocket.playerState=cleanState(message.state,websocket.playerState,websocket.identity);broadcastRoom(room.id);return;}
    if(message?.type==="request_respawn"){const respawn=randomSpawn(room);websocket.playerState=cleanState({...websocket.playerState,x:respawn.x,y:respawn.y,vx:0,vy:0},websocket.playerState,websocket.identity);websocket.send(JSON.stringify({type:"respawn",respawn}));broadcastRoom(room.id);return;}
    if(message?.type==="drop_cargo"){
      const type=etherTypes.has(message.etherType)?message.etherType:null;
      const amount=Math.round(finite(message.amount,0,1,100000));
      if(!type||!amount)return;
      makeDrop(room,{type,amount,x:websocket.playerState.x,y:websocket.playerState.y,ownerId:playerId,pickupDelayMs:2000});broadcastRoom(room.id);return;
    }
    if(message?.type==="pickup_drop"){
      const drop=room.drops.get(String(message.dropId||""));if(!drop)return;
      if(now<drop.createdAt+drop.pickupDelayMs||distance(websocket.playerState,drop)>1200)return;
      const amount=Math.min(drop.amount,Math.round(finite(message.amount,drop.amount,1,drop.amount)));
      drop.amount-=amount;if(drop.amount<=0)room.drops.delete(drop.id);
      websocket.send(JSON.stringify({type:"loot_collected",dropId:drop.id,etherType:drop.type,amount}));broadcastRoom(room.id);return;
    }
    if(message?.type==="asteroid_destroyed"){
      const asteroidId=cleanText(message.asteroidId,"",96);if(!asteroidId||room.destroyedAsteroids.get(asteroidId)>now)return;
      const pos={x:finite(message.x,websocket.playerState.x,-500000,500000),y:finite(message.y,websocket.playerState.y,-500000,500000)};
      if(distance(pos,websocket.playerState)>2400)return;
      const respawnMs=Math.round(finite(message.respawnMs,270000,30000,300000));
      room.destroyedAsteroids.set(asteroidId,now+respawnMs);
      const type=etherTypes.has(message.etherType)?message.etherType:"rawEther";
      let remaining=Math.round(finite(message.amount,1,1,10000));
      const shards=Math.min(12,Math.max(2,Math.ceil(Math.sqrt(remaining))));
      for(let i=0;i<shards&&remaining>0;i+=1){const amount=i===shards-1?remaining:Math.max(1,Math.round(remaining/(shards-i)));remaining-=amount;makeDrop(room,{type,amount,x:pos.x+(Math.random()-.5)*80,y:pos.y+(Math.random()-.5)*80,ownerId:playerId});}
      broadcastRoom(room.id);return;
    }
    if(message?.type==="claim_station"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.claimState!=="unclaimed"||team.stationId||distance(websocket.playerState,station)>2200){sendError(websocket,"This station is unavailable or already claimed.");return;}
      station.claimState="claimed";station.ownerTeamId=team.id;station.ownerPlayerId=playerId;station.name=websocket.identity.customization.name;station.reservedForPlayerId=null;team.stationId=station.id;broadcastRoom(room.id);return;
    }
    if(message?.type==="rename_station"){
      const station=room.stations.get(String(message.stationId||""));const team=teamForPlayer(room,playerId);
      if(!station||!team||station.ownerTeamId!==team.id||team.leaderPlayerId!==playerId){sendError(websocket,"Only the team leader can rename this station.");return;}
      station.name=cleanText(message.name,station.name,28);broadcastRoom(room.id);return;
    }
    if(message?.type==="join_team"){const team=room.teams.get(String(message.teamId||""));if(joinTeam(room,websocket,team,Boolean(message.spawnAtBase)))broadcastRoom(room.id);return;}
    if(message?.type==="invite_player"){
      const team=teamForPlayer(room,playerId);const targetId=String(message.playerId||"");
      if(!team||team.leaderPlayerId!==playerId||team.memberIds.length>=team.maxMembers||team.memberIds.includes(targetId)){sendError(websocket,"Only the team leader can invite available pilots.");return;}
      if(![...room.clients].some(client=>client.identity?.id===targetId))return;
      for(const [id,invite] of room.invites)if(invite.teamId===team.id&&invite.targetPlayerId===targetId)room.invites.delete(id);
      const invite={id:crypto.randomUUID(),teamId:team.id,teamName:team.name,invitedByPlayerId:playerId,invitedByName:websocket.identity.customization.name,targetPlayerId:targetId,createdAt:now,expiresAt:now+120000};
      room.invites.set(invite.id,invite);broadcastRoom(room.id);return;
    }
    if(message?.type==="accept_invite"){
      const invite=room.invites.get(String(message.inviteId||""));if(!invite||invite.targetPlayerId!==playerId)return;
      const team=room.teams.get(invite.teamId);if(joinTeam(room,websocket,team,Boolean(message.spawnAtBase))){for(const [id,item] of room.invites)if(item.targetPlayerId===playerId)room.invites.delete(id);broadcastRoom(room.id);}return;
    }
    if(message?.type==="leave_team"){if(leaveTeam(room,websocket))broadcastRoom(room.id);return;}
    if(message?.type==="remove_member"){if(removeMember(room,websocket,String(message.playerId||"")))broadcastRoom(room.id);return;}
    if(message?.type==="transfer_leader"){if(transferLeadership(room,websocket,String(message.playerId||"")))broadcastRoom(room.id);return;}
    if(message?.type==="decline_invite"){const invite=room.invites.get(String(message.inviteId||""));if(invite?.targetPlayerId===playerId){room.invites.delete(invite.id);broadcastRoom(room.id);}return;}
  });
  websocket.on("close",()=>{
    const room=rooms.get(websocket.roomId);if(!room)return;
    room.clients.delete(websocket);
    const playerId=websocket.identity?.id;const team=teamForPlayer(room,playerId);
    if(team&&team.memberIds.length===1&&!team.stationId)room.teams.delete(team.id);
    for(const [id,invite] of room.invites)if(invite.targetPlayerId===playerId||invite.invitedByPlayerId===playerId)room.invites.delete(id);
    if(room.clients.size===0)rooms.delete(websocket.roomId);else broadcastRoom(room.id);
  });
});
const heartbeat=setInterval(()=>{for(const websocket of websocketServer.clients){if(!websocket.isAlive){websocket.terminate();continue;}websocket.isAlive=false;websocket.ping();}},30_000);heartbeat.unref();
server.listen(port,host,()=>console.log(`Baseborn.io listening on http://${host}:${port}`));
function shutdown(signal){console.log(`${signal} received; closing Baseborn.io server`);clearInterval(heartbeat);for(const client of websocketServer.clients)client.close(1001,"Server restarting");server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10_000).unref();}
process.on("SIGTERM",()=>shutdown("SIGTERM"));process.on("SIGINT",()=>shutdown("SIGINT"));
