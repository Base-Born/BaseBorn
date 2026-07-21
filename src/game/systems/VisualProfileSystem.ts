import { getModuleIdentity } from "../data/moduleIdentity";
import type { Player } from "../entities/Player";
import { getShipVisualProfile, type ShipVisualProfile } from "../rendering/ShipVisualProfiles";

const visualCache = new WeakMap<Player, { signature: string; profile: ShipVisualProfile }>();
const roleColors: Record<string, string> = { Assault: "#ff6b78", Fortress: "#68a7ff", Support: "#6edb8f", Mobility: "#4cc9f0", Technology: "#a78bfa", Mining: "#ffd166", Command: "#d9c5ff", Logistics: "#b5c3cf", Recon: "#7de4ff", Siege: "#ff9d66" };

export function getPlayerVisualProfile(player: Player): ShipVisualProfile {
  const build = player.buildIdentity;
  const signature = `${player.currentShipId}|${build.visualProfileId}|${build.damageState}|${Object.values(player.stats).join(":")}`;
  const cached = visualCache.get(player);
  if (cached?.signature === signature) return cached.profile;
  const base = getShipVisualProfile(player.ship.node);
  const rank = (key: keyof typeof player.stats) => player.stats[key] ?? 0;
  const profile: ShipVisualProfile = {
    ...base,
    id: `${base.id}:${build.visualProfileId}`,
    detailLevel: Math.min(10, base.detailLevel + Math.floor(build.upgradeMilestones.length / 4)),
    buildIdentity: {
      moduleGeometry: build.slotTopology.flatMap((slot) => {
        if (!slot.moduleId) return [];
        const installed = build.installedModules.find((module) => module.id === slot.moduleId);
        const identity = getModuleIdentity(slot.moduleId);
        return installed?.enabled && identity ? [{ id: slot.id, geometry: identity.geometry, x: slot.x, y: slot.y, accent: identity.accent }] : [];
      }),
      armorTier: Math.floor(rank("maxHealth") / 3),
      shieldTier: 0,
      thrusterTier: Math.floor(rank("movementSpeed") / 3),
      ramTier: Math.floor(rank("bodyDamage") / 3),
      repairDroneCount: build.installedModules.some((module) => module.enabled && module.id === "repair_drone_mk2") ? Math.max(2, rank("autonomousRepair") >= 10 ? 3 : 2) : rank("autonomousRepair") >= 10 ? 2 : rank("autonomousRepair") >= 5 ? 1 : 0,
      damageState: build.damageState,
      roleAccent: roleColors[build.primaryRole] ?? base.accentColor,
      structuralBranch: build.structuralBranch.id,
    },
  };
  visualCache.set(player, { signature, profile });
  return profile;
}
