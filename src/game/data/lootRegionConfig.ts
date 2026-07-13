export type LootRegionId = "center" | "inner" | "mid" | "outer";
export type LootZoneType = "center_pvp" | "high_risk_pvp" | "pvp" | "pve";

export type LootRegionConfig = {
  id: LootRegionId;
  label: string;
  displayName: string;
  maxDistance: number;
  color: string;
  fillColor: string;
  borderColor: string;
  lootDescription: string;
  pvpEnabled: boolean;
  zoneType: LootZoneType;
};

export const LOOT_REGION_CONFIG: Record<LootRegionId, LootRegionConfig> = {
  center: {
    id: "center",
    label: "Center",
    displayName: "Center Belt",
    maxDistance: 0.18,
    color: "#bd8b45",
    fillColor: "rgba(245, 158, 11, 0.09)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    lootDescription: "Best Ether",
    pvpEnabled: true,
    zoneType: "center_pvp",
  },
  inner: {
    id: "inner",
    label: "Inner",
    displayName: "High-Risk Inner Zone",
    maxDistance: 0.42,
    color: "#a855f7",
    fillColor: "rgba(130, 111, 169, 0.06)",
    borderColor: "rgba(130, 111, 169, 0.22)",
    lootDescription: "Epic Ether",
    pvpEnabled: true,
    zoneType: "high_risk_pvp",
  },
  mid: {
    id: "mid",
    label: "Mid",
    displayName: "PvP Mid Zone",
    maxDistance: 0.88,
    color: "#3b82f6",
    fillColor: "rgba(59, 130, 246, 0.06)",
    borderColor: "rgba(59, 130, 246, 0.22)",
    lootDescription: "Rare Ether",
    pvpEnabled: true,
    zoneType: "pvp",
  },
  outer: {
    id: "outer",
    label: "Outer",
    displayName: "Safe Outer Zone",
    maxDistance: 1,
    color: "#6b7280",
    fillColor: "rgba(107, 114, 128, 0.04)",
    borderColor: "rgba(107, 114, 128, 0.18)",
    lootDescription: "Common Ether",
    pvpEnabled: false,
    zoneType: "pve",
  },
};

export const LOOT_REGION_ORDER: LootRegionId[] = ["center", "inner", "mid", "outer"];
