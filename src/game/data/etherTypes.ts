export type EtherType = "rawEther" | "refinedEther" | "chargedEther" | "radiantEther" | "primalEther" | "coreEther";

export type EtherCost = Partial<Record<EtherType, number>>;

export interface EtherDropData {
  id: string;
  type: EtherType;
  x: number;
  y: number;
  amount: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  createdAt: number;
  ownerId?: string;
  pickupDelayMs: number;
  expiresAt: number;
}

export interface CargoStorage {
  capacity: number;
  used: number;
  ether: Record<EtherType, number>;
}

export const ETHER_TYPES: Record<EtherType, { label: string; color: string; glow: string }> = {
  rawEther: { label: "Raw Ether", color: "#eef3f6", glow: "rgba(238, 243, 246, .28)" },
  refinedEther: { label: "Refined Ether", color: "#76dc92", glow: "rgba(118, 220, 146, .3)" },
  chargedEther: { label: "Charged Ether", color: "#68a7ff", glow: "rgba(104, 167, 255, .32)" },
  radiantEther: { label: "Radiant Ether", color: "#b58cff", glow: "rgba(181, 140, 255, .32)" },
  primalEther: { label: "Primal Ether", color: "#ffd166", glow: "rgba(255, 209, 102, .34)" },
  coreEther: { label: "Core Ether", color: "#ff935c", glow: "rgba(255, 147, 92, .36)" },
};

export function emptyEtherCargo(): Record<EtherType, number> {
  return {
    rawEther: 0,
    refinedEther: 0,
    chargedEther: 0,
    radiantEther: 0,
    primalEther: 0,
    coreEther: 0,
  };
}
