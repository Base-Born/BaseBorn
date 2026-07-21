import type { ProjectileKind } from "../types";
import { getShipNode, type ShipNode, type ShipVariantType, type WeaponType } from "./shipUpgradeTree";

export type ShipBehaviorProfile = {
  cannons: number;
  spread: number;
  fireRate: number;
  damage: number;
  speed: number;
  projectile: ProjectileKind;
  droneCount?: number;
  rearCannon?: boolean;
  orbitCannons?: number;
  healthScale: number;
  radiusScale: number;
  mining: MiningStats;
};

export type MiningStats = {
  miningPower: number;
  miningEfficiency: number;
  asteroidDamageMultiplier: number;
  highQualityMiningBonus: number;
  cargoCapacityBonus: number;
  etherYieldMultiplier: number;
  pickupRadius: number;
  tractorBeamStrength: number;
};

export const STARTER_POD_SIZE_SCALE = 2.24;

const weaponProjectile: Record<WeaponType, ProjectileKind> = {
  plasma: "plasma",
  rockets: "missile",
  laser: "rail",
  repair_beam: "plasma",
  booster: "plasma",
  speedster: "plasma",
  tank: "gravity",
  drones: "drone",
  machine_gun: "plasma",
  force_field: "gravity",
  mines: "mine",
  sniper: "rail",
  cannon: "gravity",
  arc_lightning: "split",
};

const variantMods: Record<ShipVariantType, Partial<ShipBehaviorProfile>> = {
  light: { speed: 1.16, fireRate: 1.12, damage: 0.86, healthScale: 0.9, radiusScale: 0.92 },
  balanced: { speed: 1, fireRate: 1, damage: 1, healthScale: 1, radiusScale: 1 },
  heavy: { speed: 0.82, fireRate: 0.82, damage: 1.28, healthScale: 1.28, radiusScale: 1.16 },
  mother_light: { speed: 0.82, fireRate: 1.16, damage: 1.55, healthScale: 2.15, radiusScale: 1.75 },
  mother_balanced: { speed: 0.72, fireRate: 1, damage: 1.85, healthScale: 2.6, radiusScale: 1.95 },
  mother_heavy: { speed: 0.58, fireRate: 0.82, damage: 2.25, healthScale: 3.2, radiusScale: 2.22 },
};

const weaponBase: Record<WeaponType, Partial<ShipBehaviorProfile>> = {
  plasma: { cannons: 1, spread: 0, fireRate: 1, damage: 1, speed: 1 },
  rockets: { cannons: 2, spread: 0.16, fireRate: 0.72, damage: 1.25, speed: 0.94 },
  laser: { cannons: 1, spread: 0, fireRate: 0.88, damage: 1.55, speed: 1.02 },
  repair_beam: { cannons: 1, spread: 0, fireRate: 0.9, damage: 0.72, speed: 0.94 },
  booster: { cannons: 1, spread: 0, fireRate: 0.78, damage: 0.82, speed: 1.28 },
  speedster: { cannons: 1, spread: 0, fireRate: 1.08, damage: 0.78, speed: 1.35 },
  tank: { cannons: 1, spread: 0, fireRate: 0.72, damage: 1.1, speed: 0.66 },
  drones: { cannons: 0, spread: 0, fireRate: 0.72, damage: 0.72, speed: 0.92, droneCount: 4 },
  machine_gun: { cannons: 4, spread: 0.42, fireRate: 1.72, damage: 0.48, speed: 0.98 },
  force_field: { cannons: 1, spread: 0, fireRate: 0.82, damage: 0.9, speed: 0.86, orbitCannons: 2 },
  mines: { cannons: 1, spread: 0, fireRate: 0.86, damage: 1.2, speed: 0.9, rearCannon: true },
  sniper: { cannons: 1, spread: 0, fireRate: 0.52, damage: 2.15, speed: 0.92 },
  cannon: { cannons: 1, spread: 0, fireRate: 0.48, damage: 2.45, speed: 0.78 },
  arc_lightning: { cannons: 2, spread: 0.22, fireRate: 1.05, damage: 0.86, speed: 1 },
};

const defaults: ShipBehaviorProfile = {
  cannons: 1,
  spread: 0,
  fireRate: 1,
  damage: 1,
  speed: 1,
  projectile: "plasma",
  healthScale: 1,
  radiusScale: 1,
  mining: {
    miningPower: 1,
    miningEfficiency: 1,
    asteroidDamageMultiplier: 1,
    highQualityMiningBonus: 0,
    cargoCapacityBonus: 0,
    etherYieldMultiplier: 1,
    pickupRadius: 70,
    tractorBeamStrength: 1,
  },
};

function miningStatsForNode(node: ShipNode): MiningStats {
  if (node.id === "space_pod") {
    return {
      ...defaults.mining,
      miningPower: 2.2,
      miningEfficiency: 1.15,
      asteroidDamageMultiplier: 1.45,
      cargoCapacityBonus: -55,
      etherYieldMultiplier: 1.05,
      pickupRadius: 92,
      tractorBeamStrength: 1.35,
    };
  }
  const miningName = `${node.id} ${node.name}`.toLowerCase();
  if (miningName.includes("mining") || miningName.includes("miner") || miningName.includes("harvester") || miningName.includes("excavator") || miningName.includes("refinery")) {
    const tierPower = Math.max(1, node.tier);
    const motherBonus = node.isMotherShipOption ? 1.7 : 1;
    return {
      miningPower: Math.round((2 + tierPower * 1.8) * motherBonus),
      miningEfficiency: Math.min(8, 1.6 + tierPower * 0.75),
      asteroidDamageMultiplier: Math.min(10, 1.8 + tierPower * 0.85),
      highQualityMiningBonus: Math.min(12, 1.2 + tierPower * 0.9),
      cargoCapacityBonus: Math.round((180 + tierPower * 150) * motherBonus),
      etherYieldMultiplier: Math.min(2.5, 1.05 + tierPower * 0.16),
      pickupRadius: Math.min(250, 108 + tierPower * 18),
      tractorBeamStrength: Math.min(5, 1.8 + tierPower * 0.35),
    };
  }
  if (node.weaponType === "tank") {
    return {
      ...defaults.mining,
      miningPower: 2 + Math.floor(node.tier / 2),
      asteroidDamageMultiplier: 1.35 + node.tier * 0.12,
      cargoCapacityBonus: 40 + node.tier * 18,
      pickupRadius: 78,
    };
  }
  return defaults.mining;
}

export function getBehaviorProfileForNode(nodeOrId: ShipNode | string): ShipBehaviorProfile {
  const node = typeof nodeOrId === "string" ? getShipNode(nodeOrId) : nodeOrId;
  const weapon = weaponBase[node.weaponType] ?? {};
  const variant = variantMods[node.variantType] ?? {};
  const profile = {
    ...defaults,
    ...weapon,
    ...variant,
    projectile: weaponProjectile[node.weaponType] ?? "plasma",
    cannons: node.weaponType === "drones" ? 0 : Math.min(8, Math.max(1, (weapon.cannons ?? defaults.cannons) + Math.max(0, node.tier - 3))),
    droneCount: node.weaponType === "drones" ? Math.min(12, (weapon.droneCount ?? 3) + node.tier) : weapon.droneCount,
    orbitCannons: node.weaponType === "force_field" ? Math.min(8, (weapon.orbitCannons ?? 1) + Math.floor(node.tier / 2)) : weapon.orbitCannons,
    mining: miningStatsForNode(node),
  };
  if (node.id === "space_pod") {
    profile.cannons = 1;
    profile.fireRate = 1.2;
    profile.damage = 0.58;
    profile.speed = 1.22;
    profile.healthScale = 0.72;
    profile.radiusScale = STARTER_POD_SIZE_SCALE;
    profile.projectile = "rail";
  }
  if (node.id === "machine_gun_l15_twin") {
    profile.cannons = 2;
    profile.spread = 0.1;
    profile.fireRate = 1.24;
    profile.damage = 0.78;
  }
  return profile;
}
