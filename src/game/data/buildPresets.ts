import type { StatKey } from "./stats";

export type BuildPreset = {
  name: string;
  description: string;
  stats: Record<StatKey, number>;
  ships: string[];
};

export const buildPresets: BuildPreset[] = [
  {
    name: "Glass Cannon",
    description: "Fragile, fast, and lethal with high weapon output.",
    stats: { autonomousRepair: 1, maxHealth: 1, maxShield: 1, bodyDamage: 0, movementSpeed: 6, bulletSpeed: 6, bulletDamage: 7, reloadSpeed: 7 },
    ships: ["Star Reaper", "Nova Barrage", "Plasma Streamer"],
  },
  {
    name: "Comet Rammer",
    description: "Wins by surviving impacts and controlling distance.",
    stats: { autonomousRepair: 4, maxHealth: 7, maxShield: 7, bodyDamage: 7, movementSpeed: 7, bulletSpeed: 0, bulletDamage: 1, reloadSpeed: 2 },
    ships: ["Ram Comet", "Comet Breaker", "Meteor Fang"],
  },
  {
    name: "Plasma Wall",
    description: "Dense projectile clouds with heavy bolts and quick cycles.",
    stats: { autonomousRepair: 2, maxHealth: 6, maxShield: 3, bodyDamage: 1, movementSpeed: 6, bulletSpeed: 1, bulletDamage: 7, reloadSpeed: 7 },
    ships: ["Scatter Raider", "Nebula Sprayer", "Ion Spreader"],
  },
  {
    name: "Sniper",
    description: "Precision range build for high-speed projectiles.",
    stats: { autonomousRepair: 1, maxHealth: 2, maxShield: 2, bodyDamage: 0, movementSpeed: 7, bulletSpeed: 7, bulletDamage: 7, reloadSpeed: 2 },
    ships: ["Longshot Vessel", "Rail Hunter", "Void Lancer"],
  },
  {
    name: "Drone Commander",
    description: "Uses weapon, velocity, integrity, and cycle stats to scale drones.",
    stats: { autonomousRepair: 3, maxHealth: 6, maxShield: 3, bodyDamage: 1, movementSpeed: 3, bulletSpeed: 5, bulletDamage: 5, reloadSpeed: 7 },
    ships: ["Drone Carrier", "Drone Commander", "Hive Carrier"],
  },
  {
    name: "Fortress",
    description: "Heavy survival craft with defensive firing patterns.",
    stats: { autonomousRepair: 7, maxHealth: 7, maxShield: 7, bodyDamage: 3, movementSpeed: 1, bulletSpeed: 2, bulletDamage: 4, reloadSpeed: 3 },
    ships: ["Shield Paladin", "Star Fortress", "Repair Oracle"],
  },
  {
    name: "Assassin",
    description: "Fast flanking and burst damage with low durability.",
    stats: { autonomousRepair: 1, maxHealth: 4, maxShield: 2, bodyDamage: 2, movementSpeed: 7, bulletSpeed: 4, bulletDamage: 7, reloadSpeed: 6 },
    ships: ["Blackout Raider", "Eclipse Harrier", "Rocket Phantom"],
  },
  {
    name: "Area Control",
    description: "Mines and traps that claim space instead of chasing kills.",
    stats: { autonomousRepair: 4, maxHealth: 7, maxShield: 4, bodyDamage: 2, movementSpeed: 3, bulletSpeed: 1, bulletDamage: 5, reloadSpeed: 7 },
    ships: ["Mine Layer", "Gravity Trapper", "Minefield Architect"],
  },
];
