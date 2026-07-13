import type { ProjectileKind } from "../types";

export type ShipClassId =
  | "scout-frigate" | "twin-striker" | "longshot-vessel" | "scatter-raider" | "rearguard-cruiser" | "drone-carrier"
  | "triple-striker" | "pulse-sniper" | "rail-hunter" | "nebula-sprayer" | "orbital-guard" | "missile-skirmisher" | "mine-layer" | "drone-commander" | "repair-vessel" | "ram-comet" | "auto-turret-ship" | "shield-breaker"
  | "star-reaper" | "void-lancer" | "nova-barrage" | "comet-breaker" | "meteor-fang" | "solar-cyclone" | "orbit-storm" | "hive-carrier" | "phantom-cloak" | "rift-sniper" | "ion-spreader" | "plasma-streamer" | "gravity-trapper" | "minefield-architect" | "auto-sentinel" | "swarm-mother" | "shield-paladin" | "repair-oracle" | "rocket-phantom" | "star-fortress" | "quantum-splitter" | "blackout-raider" | "eclipse-harrier" | "singularity-core";

export type ShipClass = {
  id: ShipClassId;
  name: string;
  tier: 1 | 2 | 3 | 4;
  parent?: ShipClassId;
  description: string;
  recommended: string[];
  unlockLevel: number;
  behavior: {
    cannons: number;
    spread: number;
    fireRate: number;
    damage: number;
    speed: number;
    projectile: ProjectileKind;
    droneCount?: number;
    rearCannon?: boolean;
    orbitCannons?: number;
  };
};

export const shipClasses: ShipClass[] = [
  { id: "scout-frigate", name: "Scout Frigate", tier: 1, unlockLevel: 1, description: "Balanced starter craft with one front plasma cannon.", recommended: ["Any"], behavior: { cannons: 1, spread: 0, fireRate: 1, damage: 1, speed: 1, projectile: "plasma" } },
  { id: "twin-striker", name: "Twin Striker", tier: 2, parent: "scout-frigate", unlockLevel: 15, description: "Two linked cannons with high fire volume.", recommended: ["Glass Cannon", "Plasma Wall"], behavior: { cannons: 2, spread: 0.12, fireRate: 1.18, damage: 0.78, speed: 1, projectile: "plasma" } },
  { id: "longshot-vessel", name: "Longshot Vessel", tier: 2, parent: "scout-frigate", unlockLevel: 15, description: "Long range precision craft with slower reload.", recommended: ["Sniper"], behavior: { cannons: 1, spread: 0, fireRate: 0.62, damage: 1.85, speed: 0.94, projectile: "rail" } },
  { id: "scatter-raider", name: "Scatter Raider", tier: 2, parent: "scout-frigate", unlockLevel: 15, description: "Rapid unstable weapon fire with wide spread.", recommended: ["Plasma Wall", "Assassin"], behavior: { cannons: 4, spread: 0.48, fireRate: 1.32, damage: 0.62, speed: 1.04, projectile: "plasma" } },
  { id: "rearguard-cruiser", name: "Rearguard Cruiser", tier: 2, parent: "scout-frigate", unlockLevel: 15, description: "Front and rear cannons for defensive retreats.", recommended: ["Fortress"], behavior: { cannons: 1, spread: 0, fireRate: 1, damage: 1, speed: 0.96, projectile: "plasma", rearCannon: true } },
  { id: "drone-carrier", name: "Drone Carrier", tier: 2, parent: "scout-frigate", unlockLevel: 15, description: "Commands orbiting drones with no direct guns.", recommended: ["Drone Commander"], behavior: { cannons: 0, spread: 0, fireRate: 0.82, damage: 0.82, speed: 0.92, projectile: "drone", droneCount: 3 } },
  { id: "triple-striker", name: "Triple Striker", tier: 3, parent: "twin-striker", unlockLevel: 30, description: "Three forward cannons.", recommended: ["Glass Cannon"], behavior: { cannons: 3, spread: 0.18, fireRate: 1.18, damage: 0.86, speed: 0.98, projectile: "plasma" } },
  { id: "pulse-sniper", name: "Pulse Sniper", tier: 3, parent: "longshot-vessel", unlockLevel: 30, description: "Charged plasma bursts at long range.", recommended: ["Sniper"], behavior: { cannons: 1, spread: 0, fireRate: 0.48, damage: 2.4, speed: 0.9, projectile: "rail" } },
  { id: "rail-hunter", name: "Rail Hunter", tier: 3, parent: "longshot-vessel", unlockLevel: 30, description: "Narrow high-speed rail shots.", recommended: ["Sniper", "Assassin"], behavior: { cannons: 1, spread: 0, fireRate: 0.74, damage: 1.75, speed: 1.06, projectile: "rail" } },
  { id: "nebula-sprayer", name: "Nebula Sprayer", tier: 3, parent: "scatter-raider", unlockLevel: 30, description: "Rapid spread pressure ship.", recommended: ["Plasma Wall"], behavior: { cannons: 6, spread: 0.62, fireRate: 1.55, damage: 0.52, speed: 1, projectile: "plasma" } },
  { id: "orbital-guard", name: "Orbital Guard", tier: 3, parent: "rearguard-cruiser", unlockLevel: 30, description: "Side and rear weapons guard escape lanes.", recommended: ["Fortress"], behavior: { cannons: 2, spread: 0.1, fireRate: 0.95, damage: 0.95, speed: 0.9, projectile: "plasma", rearCannon: true, orbitCannons: 2 } },
  { id: "missile-skirmisher", name: "Missile Skirmisher", tier: 3, parent: "scatter-raider", unlockLevel: 30, description: "Slow homing missiles for hit-and-run pressure.", recommended: ["Assassin"], behavior: { cannons: 2, spread: 0.16, fireRate: 0.72, damage: 1.35, speed: 1.02, projectile: "missile" } },
  { id: "mine-layer", name: "Mine Layer", tier: 3, parent: "rearguard-cruiser", unlockLevel: 30, description: "Drops durable mines behind the ship.", recommended: ["Area Control"], behavior: { cannons: 1, spread: 0, fireRate: 0.82, damage: 1.4, speed: 0.94, projectile: "mine", rearCannon: true } },
  { id: "drone-commander", name: "Drone Commander", tier: 3, parent: "drone-carrier", unlockLevel: 30, description: "More drones and stronger command cadence.", recommended: ["Drone Commander"], behavior: { cannons: 0, spread: 0, fireRate: 0.7, damage: 0.72, speed: 0.9, projectile: "drone", droneCount: 5 } },
  { id: "repair-vessel", name: "Repair Vessel", tier: 3, parent: "rearguard-cruiser", unlockLevel: 30, description: "Low damage but excellent shield recovery.", recommended: ["Fortress"], behavior: { cannons: 1, spread: 0, fireRate: 0.9, damage: 0.72, speed: 0.88, projectile: "plasma" } },
  { id: "ram-comet", name: "Ram Comet", tier: 3, parent: "scatter-raider", unlockLevel: 30, description: "High collision damage and strong thrusters.", recommended: ["Comet Rammer"], behavior: { cannons: 1, spread: 0, fireRate: 0.72, damage: 0.62, speed: 1.22, projectile: "plasma" } },
  { id: "auto-turret-ship", name: "Auto-Turret Ship", tier: 3, parent: "rearguard-cruiser", unlockLevel: 30, description: "Independent side turrets fire at nearby threats.", recommended: ["Fortress"], behavior: { cannons: 1, spread: 0, fireRate: 0.9, damage: 0.84, speed: 0.9, projectile: "plasma", orbitCannons: 2 } },
  { id: "shield-breaker", name: "Shield Breaker", tier: 3, parent: "longshot-vessel", unlockLevel: 30, description: "Slow heavy projectiles with high penetration.", recommended: ["Sniper"], behavior: { cannons: 1, spread: 0, fireRate: 0.54, damage: 2.2, speed: 0.86, projectile: "gravity" } },
  ...[
    ["star-reaper", "Star Reaper", "triple-striker", "High damage glass cannon.", "plasma", 4, 0.16, 1.35, 1.1],
    ["void-lancer", "Void Lancer", "rail-hunter", "Extreme railgun range.", "rail", 1, 0, 0.5, 2.8],
    ["nova-barrage", "Nova Barrage", "triple-striker", "Heavy burst multi-cannon ship.", "plasma", 5, 0.24, 1.06, 1.25],
    ["comet-breaker", "Comet Breaker", "ram-comet", "Boost-based ramming craft.", "plasma", 1, 0, 0.72, 0.72],
    ["meteor-fang", "Meteor Fang", "ram-comet", "Short range side-blade brawler.", "gravity", 2, 0.7, 0.78, 1.2],
    ["solar-cyclone", "Solar Cyclone", "orbital-guard", "Multi-direction rotating fire.", "plasma", 3, 1.2, 1.08, 0.9],
    ["orbit-storm", "Orbit Storm", "drone-commander", "Orbiting drones as shield and weapon.", "orbit", 1, 0, 0.78, 0.85],
    ["hive-carrier", "Hive Carrier", "drone-commander", "Many drones, low direct firepower.", "drone", 1, 0, 0.62, 0.66],
    ["phantom-cloak", "Phantom Cloak", "rail-hunter", "Semi-invisible when quiet.", "rail", 1, 0, 0.7, 1.55],
    ["rift-sniper", "Rift Sniper", "pulse-sniper", "Slow devastating shots and long vision.", "rail", 1, 0, 0.38, 3],
    ["ion-spreader", "Ion Spreader", "nebula-sprayer", "Wide projectile wall.", "plasma", 8, 0.9, 1.2, 0.48],
    ["plasma-streamer", "Plasma Streamer", "nebula-sprayer", "Continuous stream of small bolts.", "plasma", 3, 0.22, 2.25, 0.32],
    ["gravity-trapper", "Gravity Trapper", "mine-layer", "Gravity mines slow enemies.", "gravity", 1, 0, 0.7, 1.2],
    ["minefield-architect", "Minefield Architect", "mine-layer", "Creates durable defensive mine zones.", "mine", 1, 0, 1.05, 1.1],
    ["auto-sentinel", "Auto Sentinel", "auto-turret-ship", "Multiple independent turrets.", "plasma", 1, 0, 0.85, 0.9],
    ["swarm-mother", "Swarm Mother", "drone-commander", "Spawns temporary swarm drones.", "drone", 1, 0, 0.72, 0.72],
    ["shield-paladin", "Shield Paladin", "repair-vessel", "High shield and low damage.", "plasma", 2, 0.1, 0.82, 0.72],
    ["repair-oracle", "Repair Oracle", "repair-vessel", "Regeneration survival craft.", "plasma", 1, 0, 0.86, 0.7],
    ["rocket-phantom", "Rocket Phantom", "missile-skirmisher", "Hit-and-run missile ship.", "missile", 2, 0.18, 0.92, 1.35],
    ["star-fortress", "Star Fortress", "orbital-guard", "Slow armored multi-cannon ship.", "plasma", 4, 0.42, 0.84, 0.95],
    ["quantum-splitter", "Quantum Splitter", "shield-breaker", "Projectiles split mid-flight.", "split", 1, 0, 0.7, 1.25],
    ["blackout-raider", "Blackout Raider", "rail-hunter", "Short-range burst assassin.", "rail", 3, 0.26, 0.9, 1.35],
    ["eclipse-harrier", "Eclipse Harrier", "missile-skirmisher", "Fast flanker with angled thrusters.", "missile", 2, 0.12, 1, 1.05],
    ["singularity-core", "Singularity Core", "shield-breaker", "Experimental gravity pulses.", "gravity", 1, 0, 0.55, 2.1],
  ].map(([id, name, parent, description, projectile, cannons, spread, fireRate, damage]) => ({
    id: id as ShipClassId,
    name: name as string,
    tier: 4 as const,
    parent: parent as ShipClassId,
    unlockLevel: 45,
    description: description as string,
    recommended: ["Advanced"],
    behavior: {
      cannons: cannons as number,
      spread: spread as number,
      fireRate: fireRate as number,
      damage: damage as number,
      speed: id === "comet-breaker" || id === "eclipse-harrier" ? 1.24 : id === "star-fortress" ? 0.72 : 0.95,
      projectile: projectile as ProjectileKind,
      droneCount: ["orbit-storm", "hive-carrier", "swarm-mother"].includes(id as string) ? (id === "hive-carrier" ? 9 : 6) : undefined,
      rearCannon: ["star-fortress", "solar-cyclone"].includes(id as string),
      orbitCannons: ["auto-sentinel", "solar-cyclone", "star-fortress"].includes(id as string) ? 4 : undefined,
    },
  })),
];

export const getShipClass = (id: ShipClassId) => shipClasses.find((ship) => ship.id === id) ?? shipClasses[0];
export const choicesForLevel = (level: number, current: ShipClassId) => shipClasses.filter((ship) => ship.unlockLevel <= level && ship.parent === current);
