import { getBaseShipFrame } from "../data/baseShipFrames";
import type { BuildIdentitySnapshot,BuildRole,DamageState,StructuralBranchId } from "../data/buildIdentity";
import { getModuleIdentity } from "../data/moduleIdentity";
import { MODULE_SYNERGIES } from "../data/moduleSynergies";
import { getPhysicalSlotTopology } from "../data/moduleSlots";
import { getModuleDefinition } from "../data/shipModules";
import type { PlayerLoadout } from "../data/stationTypes";
import type { StatKey } from "../data/stats";
import { getReachedUpgradeMilestones } from "../data/upgradeImpactProfiles";

const ROLES:BuildRole[]=["Assault","Fortress","Support","Mobility","Technology","Mining","Command","Logistics","Recon","Siege"];
const frameRoles:Record<string,Partial<Record<BuildRole,number>>>={balanced:{Assault:3,Fortress:3,Mobility:3,Technology:3},tank:{Fortress:12,Assault:3},speed:{Mobility:13,Recon:6},tech:{Technology:12,Support:4,Command:3}};
const statRoles:Record<StatKey,BuildRole>={autonomousRepair:"Support",maxHealth:"Fortress",maxShield:"Fortress",bodyDamage:"Assault",movementSpeed:"Mobility",bulletSpeed:"Recon",bulletDamage:"Assault",reloadSpeed:"Siege"};

export type BuildIdentityInput={vehicleId:string;frameId:string;hullTier:number;stats:Record<StatKey,number>;loadout:PlayerLoadout;health:number;maxHealth:number;currentHeat?:number};

function damageState(health:number,max:number):DamageState{const r=max>0?health/max:0;return r<=0?"destroyed":r<=.18?"critical":r<=.4?"heavily_damaged":r<=.65?"damaged":r<=.85?"lightly_damaged":"healthy";}
function structuralBranch(input:BuildIdentityInput):{id:StructuralBranchId;name:string;description:string}{const s=input.stats;if(s.movementSpeed>s.maxHealth+s.bodyDamage/2)return{id:"lightweight",name:"Lightweight Chassis",description:"Slim structure trades protection for acceleration."};if(s.maxHealth+s.bodyDamage>=8)return{id:"reinforced",name:"Reinforced Chassis",description:"Armor sections increase mass, resistance, and ram presence."};if(input.loadout.installedModules.length>=3||input.hullTier>=4)return{id:"expanded",name:"Expanded Chassis",description:"External mounts broaden module and cargo capacity."};return{id:"specialized",name:"Specialized Chassis",description:"Frame affinity focuses the ship around its strongest systems."};}

export function calculateBuildIdentity(input:BuildIdentityInput):BuildIdentitySnapshot{
 const frame=getBaseShipFrame(input.frameId);const branch=structuralBranch(input);const topology=getPhysicalSlotTopology(input.frameId,input.loadout.installedModules);
 const capacity=80+input.hullTier*16+(input.frameId==="tech"?28:input.frameId==="tank"?14:0)+input.stats.maxShield*2;
 const heatCapacity=70+input.hullTier*9+(input.frameId==="speed"?12:0)+input.stats.reloadSpeed*1.5;
 const controlCapacity=12+input.hullTier*3+(input.frameId==="tech"?12:0);
 let powerUsed=0,mass=45+(input.frameId==="tank"?24:input.frameId==="speed"?-9:0),heatGeneration=0,controlUsed=0;
 const affinities=Object.fromEntries(ROLES.map(r=>[r,0])) as Record<BuildRole,number>;for(const [r,v] of Object.entries(frameRoles[input.frameId]??{}))affinities[r as BuildRole]+=v??0;
 for(const key of Object.keys(input.stats) as StatKey[])affinities[statRoles[key]]+=input.stats[key]*.7;
 const installed=input.loadout.installedModules.map((entry,index)=>{const identity=getModuleIdentity(entry.moduleId);const def=getModuleDefinition(entry.moduleId);if(identity){mass+=identity.mass;heatGeneration+=identity.heat;controlUsed+=identity.control;for(const [r,v] of Object.entries(identity.roles))affinities[r as BuildRole]+=v??0;}const nextPower=powerUsed+(identity?.power??0);const enabled=nextPower<=capacity;if(enabled)powerUsed=nextPower;const slot=topology.find(s=>s.moduleId===entry.moduleId)??topology[index];return{id:entry.moduleId,name:def?.name??entry.moduleId,family:identity?.family??"Unaligned",enabled,slotId:slot?.id??("slot-"+index),visual:identity?.visual??"Visible external module",drawback:identity?.drawback??"Consumes slot capacity"};});
 const enabledTags=installed.filter(m=>m.enabled).flatMap(m=>getModuleIdentity(m.id)?.tags??[]);
 const activeSynergies=MODULE_SYNERGIES.filter(s=>s.requiredTags.every(tag=>enabledTags.filter(t=>t===tag).length>=(s.requiredCount??1))).map(s=>({id:s.id,name:s.name,effect:s.effect,visualEffect:s.visualEffect}));
 for(const s of activeSynergies){if(s.id==="reinforced_ram")affinities.Assault+=6;if(s.id==="aegis_reconstruction")affinities.Support+=7;if(s.id==="survey_lance")affinities.Mining+=7;if(s.id==="coordinated_battery")affinities.Siege+=6;}
 const availableSynergies=MODULE_SYNERGIES.filter(s=>!activeSynergies.some(a=>a.id===s.id)).map(s=>({id:s.id,name:s.name,missing:s.requiredTags.filter(tag=>enabledTags.filter(t=>t===tag).length<(s.requiredCount??1))})).sort((a,b)=>a.missing.length-b.missing.length).slice(0,3);
 const ranked=ROLES.map(role=>({role,value:Math.round(affinities[role])})).sort((a,b)=>b.value-a.value);
 const currentHeat=input.currentHeat??0;const overloaded=input.loadout.installedModules.some((_,i)=>!installed[i].enabled);const overheated=currentHeat>=heatCapacity;
 const strengths=[ranked[0].role+" specialization",activeSynergies.length?activeSynergies[0].name:"Flexible module growth",branch.name].slice(0,3);
 const weaknesses=[overloaded?"Insufficient reactor power":mass>90?"High mass reduces acceleration":heatGeneration>heatCapacity*.55?"High heat generation":"Limited specialization",installed.find(m=>!m.enabled)?.name?"Disabled module: "+installed.find(m=>!m.enabled)?.name:"No active system failures"].slice(0,2);
 return{vehicleId:input.vehicleId,frame:frame.name,structuralBranch:branch,primaryRole:ranked[0].role,secondaryRole:ranked[1].role,roleAffinities:affinities,strengths,weaknesses,slotTopology:topology,installedModules:installed,activeSynergies,availableSynergies,budgets:{powerUsed,powerCapacity:capacity,mass:Math.max(20,mass+(branch.id==="reinforced"?18:branch.id==="expanded"?12:branch.id==="lightweight"?-8:0)),heatGeneration,heatCapacity,currentHeat,controlUsed,controlCapacity,overloaded,overheated},damageState:damageState(input.health,input.maxHealth),upgradeMilestones:getReachedUpgradeMilestones(input.stats).map(m=>({statId:m.statId,rank:m.rank,label:m.label,visualChange:m.modelChange,tacticalChange:m.gameplay})),visualProfileId:[input.frameId,branch.id,...installed.filter(m=>m.enabled).map(m=>m.id),...activeSynergies.map(s=>s.id)].join(":"),roleLabel:ranked[0].role+" / "+ranked[1].role,teamContribution:ranked[0].role==="Support"?"Sustain and recovery":ranked[0].role==="Fortress"?"Front-line protection":ranked[0].role==="Mining"?"Resource extraction":ranked[0].role==="Command"?"Fleet coordination":"Combat pressure"};
}
export function getEnabledBuildModuleIds(input:BuildIdentityInput){return calculateBuildIdentity(input).installedModules.filter(m=>m.enabled).map(m=>m.id);}
