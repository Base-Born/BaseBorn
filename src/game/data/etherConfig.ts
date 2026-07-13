import type { EtherType } from "./etherTypes";

export type EtherRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "core";

export interface EtherConfigEntry {
  id: EtherType;
  name: string;
  rarity: EtherRarity;
  displayColor: string;
  fuelPerUnit: number;
  minimapColor: string;
  dropWeight: number;
  radialSpawnWeight: number;
  particleStyle: "dust" | "spark" | "arc" | "halo" | "flare" | "singularity";
}

export const ETHER_CONFIG: Record<EtherType, EtherConfigEntry> = {
  rawEther: { id: "rawEther", name: "Raw Ether", rarity: "common", displayColor: "#eef3f6", fuelPerUnit: 0.1, minimapColor: "#dce6eb", dropWeight: 100, radialSpawnWeight: 1, particleStyle: "dust" },
  refinedEther: { id: "refinedEther", name: "Refined Ether", rarity: "uncommon", displayColor: "#76dc92", fuelPerUnit: 0.25, minimapColor: "#76dc92", dropWeight: 55, radialSpawnWeight: 1.2, particleStyle: "spark" },
  chargedEther: { id: "chargedEther", name: "Charged Ether", rarity: "rare", displayColor: "#68a7ff", fuelPerUnit: 0.6, minimapColor: "#68a7ff", dropWeight: 24, radialSpawnWeight: 1.55, particleStyle: "arc" },
  radiantEther: { id: "radiantEther", name: "Radiant Ether", rarity: "epic", displayColor: "#b58cff", fuelPerUnit: 1.5, minimapColor: "#b58cff", dropWeight: 10, radialSpawnWeight: 2.1, particleStyle: "halo" },
  primalEther: { id: "primalEther", name: "Primal Ether", rarity: "legendary", displayColor: "#ffd166", fuelPerUnit: 4, minimapColor: "#ffd166", dropWeight: 3, radialSpawnWeight: 3.25, particleStyle: "flare" },
  coreEther: { id: "coreEther", name: "Core Ether", rarity: "core", displayColor: "#ff935c", fuelPerUnit: 10, minimapColor: "#ff935c", dropWeight: 0.6, radialSpawnWeight: 5, particleStyle: "singularity" },
};

export const ETHER_CONFIG_LIST = Object.values(ETHER_CONFIG);
