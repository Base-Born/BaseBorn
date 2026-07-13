export const statKeys = [
  "autonomousRepair",
  "maxHealth",
  "maxShield",
  "bodyDamage",
  "movementSpeed",
  "bulletSpeed",
  "bulletDamage",
  "reloadSpeed",
] as const;

export type StatKey = (typeof statKeys)[number];

export type StatCategory = "ship" | "module";

export type StatDef = {
  key: StatKey;
  name: string;
  category: StatCategory;
  effect: string;
  color: string;
};

export const stats: StatDef[] = [
  { key: "autonomousRepair", name: "Autonomous Repair", category: "ship", effect: "Repairs hull after avoiding damage.", color: "#e5a77b" },
  { key: "maxHealth", name: "Max Health", category: "ship", effect: "Increases hull durability.", color: "#ff8aa0" },
  { key: "maxShield", name: "Max Shield", category: "ship", effect: "Adds shield capacity and improves shield recovery.", color: "#d48cff" },
  { key: "bodyDamage", name: "Body Damage", category: "ship", effect: "Improves ram damage and collision resistance.", color: "#a78bfa" },
  { key: "movementSpeed", name: "Movement Speed", category: "ship", effect: "Increases movement speed, acceleration, and thruster intensity.", color: "#4cc9f0" },
  { key: "bulletSpeed", name: "Bullet Speed", category: "module", effect: "Increases projectile velocity and drone movement speed.", color: "#68a7ff" },
  { key: "bulletDamage", name: "Bullet Damage", category: "module", effect: "Increases weapon, missile, beam, mining, and drone damage.", color: "#ff6b78" },
  { key: "reloadSpeed", name: "Reload Speed", category: "module", effect: "Improves fire rate, module cycle speed, and drone respawn/cycle speed.", color: "#6edb8f" },
];

export type VisibleStatConfig = StatDef & { label: string; tooltip: string };

export function getVisibleStatLabelsForShip(): VisibleStatConfig[] {
  return stats.map((stat) => ({
    ...stat,
    label: stat.name,
    tooltip: stat.effect,
  }));
}

export const emptyStats = (): Record<StatKey, number> => ({
  autonomousRepair: 0,
  maxHealth: 0,
  maxShield: 0,
  bodyDamage: 0,
  movementSpeed: 0,
  bulletSpeed: 0,
  bulletDamage: 0,
  reloadSpeed: 0,
});
