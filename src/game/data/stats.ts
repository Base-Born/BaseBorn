export const statKeys = [
  "autonomousRepair",
  "maxHealth",
  "bodyDamage",
  "bulletSpeed",
  "bulletPenetration",
  "bulletDamage",
  "reloadSpeed",
  "movementSpeed",
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
  { key: "autonomousRepair", name: "Health Regen", category: "ship", effect: "Repairs hull after avoiding damage.", color: "#e5a77b" },
  { key: "maxHealth", name: "Max Health", category: "ship", effect: "Increases hull durability.", color: "#ff8aa0" },
  { key: "bodyDamage", name: "Body Damage", category: "ship", effect: "Improves ram damage and collision resistance.", color: "#a78bfa" },
  { key: "bulletSpeed", name: "Bullet Speed", category: "module", effect: "Increases projectile velocity and drone movement speed.", color: "#68a7ff" },
  { key: "bulletPenetration", name: "Bullet Penetration", category: "module", effect: "Improves projectile durability and drone health against enemy fire.", color: "#f4d35e" },
  { key: "bulletDamage", name: "Bullet Damage", category: "module", effect: "Increases weapon, missile, beam, mining, and drone damage.", color: "#ff6b78" },
  { key: "reloadSpeed", name: "Reload", category: "module", effect: "Improves fire rate, module cycle speed, and drone respawn/cycle speed.", color: "#6edb8f" },
  { key: "movementSpeed", name: "Movement Speed", category: "ship", effect: "Increases movement speed, acceleration, and thruster intensity.", color: "#4cc9f0" },
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
  bulletPenetration: 0,
  bodyDamage: 0,
  movementSpeed: 0,
  bulletSpeed: 0,
  bulletDamage: 0,
  reloadSpeed: 0,
});
