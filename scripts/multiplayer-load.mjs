import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

const port = 3200;
const playerCount = 24;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server/index.js"], { cwd: process.cwd(), env: { ...process.env, PORT:String(port), HOST:"127.0.0.1" }, stdio:["ignore","ignore","pipe"] });
let stderr="";server.stderr.on("data",chunk=>{stderr+=chunk;});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
  for(let attempt=0;attempt<50;attempt+=1){try{const response=await fetch(`${base}/health`);if(response.ok)return;}catch{}await wait(100);}
  throw new Error(`Load-test server did not start. ${stderr}`);
}

function connect(index){
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(`ws://127.0.0.1:${port}/multiplayer`);const stats={snapshots:0};
    socket.on("open",()=>socket.send(JSON.stringify({type:"join",sessionId:randomUUID(),customization:{name:`Load${index}`,shipColor:"#2fbce1",glowColor:"#4cc9f0",trailColor:"#4cc9f0",projectileColor:"#eef7ff",wingVariant:"delta",cockpitVariant:"needle",decalPattern:"chevron",thrusterStyle:"ion",glowIntensity:.8}})));
    socket.on("message",raw=>{const message=JSON.parse(raw.toString());if(message.type==="snapshot")stats.snapshots+=1;if(message.type==="welcome")resolve({socket,stats,spawn:message.spawn});});
    socket.on("error",reject);
  });
}

try{
  await waitForHealth();
  const clients=await Promise.all(Array.from({length:playerCount},(_,index)=>connect(index)));
  const started=Date.now();let tick=0;
  while(Date.now()-started<2000){
    for(const client of clients){
      const angle=(tick%40)/40*Math.PI*2;
      client.socket.send(JSON.stringify({type:"state",state:{x:client.spawn.x+Math.cos(angle)*Math.min(300,tick*8),y:client.spawn.y+Math.sin(angle)*Math.min(300,tick*8),vx:0,vy:0,angle,thrustForward:1,thrustStrafe:0,docked:false,level:99,score:999999}}));
    }
    tick+=1;await wait(50);
  }
  const status=await fetch(`${base}/api/status`).then(response=>response.json());
  assert.equal(status.players,playerCount);
  for(const client of clients){assert(client.stats.snapshots>=15,"each client should receive fixed-rate snapshots");assert(client.stats.snapshots<=70,"snapshots must be batched instead of emitted per input");client.socket.close();}
  console.log(`Multiplayer load test passed: ${playerCount} clients at 20 input updates/sec with bounded snapshot delivery.`);
}finally{
  server.kill("SIGTERM");
  await Promise.race([new Promise(resolve=>server.once("exit",resolve)),wait(3000)]);
}
