import type { ModuleStatBonuses, ModuleSlotType, ShipModuleDefinition } from "./stationTypes";

export const SHIP_MODULES: ShipModuleDefinition[] = [
  {
    id: "pulse_laser_mk1",
    name: "Pulse Laser Mk I",
    slotType: "weapon",
    tier: 1,
    craftingTier: 1,
    levelRequirement: 1,
    cost: { rawEther: 90, refinedEther: 25 },
    stats: { damageMultiplier: 1.15, projectileSpeedMultiplier: 1.08 },
    description: "Reliable starter weapon module for asteroid clearing.",
  },
  {
    id: "mining_lance_mk1",
    name: "Mining Lance Mk I",
    slotType: "mining",
    tier: 1,
    craftingTier: 2,
    levelRequirement: 20,
    cost: { refinedEther: 120, chargedEther: 45 },
    stats: { miningDamageMultiplier: 1.35, damageMultiplier: 1.05 },
    description: "Improves mining pressure against larger asteroid hulls.",
  },
  {
    id: "reinforced_shield_mk1",
    name: "Reinforced Shield Mk I",
    slotType: "defense",
    tier: 1,
    craftingTier: 1,
    levelRequirement: 5,
    cost: { rawEther: 120, refinedEther: 60 },
    stats: { shieldMultiplier: 1.22, regenPerSecond: 1.2 },
    description: "Adds stable shield capacity and slow self-repair.",
  },
  {
    id: "ion_engine_mk1",
    name: "Ion Engine Mk I",
    slotType: "engine",
    tier: 1,
    craftingTier: 1,
    levelRequirement: 12,
    cost: { refinedEther: 90, chargedEther: 55 },
    stats: { speedMultiplier: 1.14 },
    description: "Improves acceleration and cruising speed.",
  },
  {
    id: "cargo_rack_mk1",
    name: "Cargo Rack Mk I",
    slotType: "utility",
    tier: 1,
    craftingTier: 1,
    levelRequirement: 1,
    cost: { rawEther: 110 },
    stats: { cargoBonus: 100 },
    description: "Adds more shared Ether cargo capacity.",
  },
  {
    id: "twin_cannon_mk2",
    name: "Twin Cannon Mk II",
    slotType: "weapon",
    tier: 2,
    craftingTier: 3,
    levelRequirement: 35,
    cost: { chargedEther: 160, radiantEther: 70 },
    stats: { damageMultiplier: 1.32, fireRateMultiplier: 1.12 },
    description: "Heavier weapon feed for mid-map combat and mining.",
  },
  {
    id: "missile_rack_mk2", name: "Valkyr Salvo Rack", slotType: "weapon", tier: 2, craftingTier: 2, levelRequirement: 25,
    cost: { refinedEther: 150, chargedEther: 80 }, stats: { damageMultiplier: 1.28, fireRateMultiplier: 0.88 },
    description: "Visible tracking missile pods deliver coordinated explosive bursts at the cost of heat and reload speed.",
  },
  {
    id: "heavy_railgun_mk3", name: "Titan Heavy Railgun", slotType: "weapon", tier: 3, craftingTier: 3, levelRequirement: 50,
    cost: { chargedEther: 240, radiantEther: 110 }, stats: { damageMultiplier: 1.58, projectileSpeedMultiplier: 1.34, fireRateMultiplier: 0.72 },
    description: "A massive recoil rail with armor penetration, extreme mass, and a slow cycle.",
  },
  {
    id: "accelerator_railgun_mk3", name: "Nova Accelerator Rail", slotType: "weapon", tier: 3, craftingTier: 3, levelRequirement: 50,
    cost: { chargedEther: 220, radiantEther: 95 }, stats: { damageMultiplier: 1.2, projectileSpeedMultiplier: 1.72, fireRateMultiplier: 0.92 },
    description: "Long accelerator rails trade impact damage for velocity, range, and targeting response.",
  },
  {
    id: "repair_drone_mk2", name: "Helix Repair Drone Bay", slotType: "utility", tier: 2, craftingTier: 3, levelRequirement: 35,
    cost: { refinedEther: 180, chargedEther: 100 }, stats: { healthMultiplier: 1.06, regenPerSecond: 3.4 },
    description: "Launches visible reconstruction drones; strong sustain requires power and control capacity.",
  },
  {
    id: "fortress_shield_mk2", name: "Aegis Fortress Shield", slotType: "defense", tier: 2, craftingTier: 3, levelRequirement: 40,
    cost: { chargedEther: 190, radiantEther: 70 }, stats: { shieldMultiplier: 1.46, regenPerSecond: 0.7, speedMultiplier: 0.95 },
    description: "Large emitters create a high-capacity segmented field with slow regeneration and heavy mass.",
  },
  {
    id: "regenerative_shield_mk2", name: "Helix Regenerative Shield", slotType: "defense", tier: 2, craftingTier: 3, levelRequirement: 40,
    cost: { chargedEther: 175, radiantEther: 85 }, stats: { shieldMultiplier: 1.18, regenPerSecond: 4.5 },
    description: "A lighter shield lattice trades capacity for rapid visible reconstruction.",
  },  {
    id: "mothership_core",
    name: "Mothership Core",
    slotType: "core",
    tier: 5,
    craftingTier: 5,
    levelRequirement: 100,
    cost: { primalEther: 500, coreEther: 150 },
    stats: { healthMultiplier: 1.35 },
    description: "Required to transform a restored station into a mobile mothership.",
  },
];

export function getModuleDefinition(moduleId: string) {
  return SHIP_MODULES.find((module) => module.id === moduleId);
}

export function getCraftableModules(craftingTier: number, playerLevel: number) {
  return SHIP_MODULES.filter((module) => module.craftingTier <= craftingTier && module.levelRequirement <= playerLevel);
}

export function emptyModuleBonuses(): Required<ModuleStatBonuses> {
  return {
    healthMultiplier: 1,
    shieldMultiplier: 1,
    speedMultiplier: 1,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    projectileSpeedMultiplier: 1,
    miningDamageMultiplier: 1,
    cargoBonus: 0,
    regenPerSecond: 0,
  };
}

export function combineModuleBonuses(moduleIds: string[]) {
  const bonuses = emptyModuleBonuses();
  for (const moduleId of moduleIds) {
    const module = getModuleDefinition(moduleId);
    if (!module) continue;
    const stats = module.stats;
    bonuses.healthMultiplier *= stats.healthMultiplier ?? 1;
    bonuses.shieldMultiplier *= stats.shieldMultiplier ?? 1;
    bonuses.speedMultiplier *= stats.speedMultiplier ?? 1;
    bonuses.damageMultiplier *= stats.damageMultiplier ?? 1;
    bonuses.fireRateMultiplier *= stats.fireRateMultiplier ?? 1;
    bonuses.projectileSpeedMultiplier *= stats.projectileSpeedMultiplier ?? 1;
    bonuses.miningDamageMultiplier *= stats.miningDamageMultiplier ?? 1;
    bonuses.cargoBonus += stats.cargoBonus ?? 0;
    bonuses.regenPerSecond += stats.regenPerSecond ?? 0;
  }
  return bonuses;
}

export function getSlotLabel(slotType: ModuleSlotType) {
  return slotType[0].toUpperCase() + slotType.slice(1);
}
