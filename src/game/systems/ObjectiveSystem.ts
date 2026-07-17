import { ETHER_CONFIG } from "../data/etherConfig";
import { ETHER_TYPES } from "../data/etherTypes";
import { getNextHullTier } from "../data/hullTiers";
import { createObjective, type Objective } from "../data/objectives";
import type { Player } from "../entities/Player";
import { getStationHealthWarning } from "./StationSystem";
import type { StationSystem } from "./StationSystem";

export class ObjectiveSystem {
  getCurrentObjective(player: Player, stations: StationSystem): Objective {
    const claimed = stations.claimedStation;
    const interaction = stations.getNearestInteraction(player);

    if (stations.baseLostState?.teamNeedsNewStation) {
      return createObjective({
        id: "rebuild_after_base_loss",
        title: "Find a New Derelict Spacecraft",
        description: "Your carrier was destroyed. Claim a new derelict spacecraft to rebuild your crew's mobile base.",
        priority: 120,
        category: "station",
        hint: "All spacecraft storage and upgrades were lost with the carrier.",
      });
    }

    if (!claimed) {
      if (interaction.kind === "claim") {
        return createObjective({
          id: "claim_station",
          title: "Land and Claim the Spacecraft",
          description: "Move directly into the empty cradle, then press F to lock your pod into the derelict spacecraft.",
          priority: 100,
          category: "station",
          hint: "The docking sequence is intentionally close-range. Once claimed, the spacecraft becomes your upgrade and storage hub.",
        });
      }
      return createObjective({
        id: "find_station",
        title: "Find the Derelict Spacecraft",
        description: "Fly the Survey Pod toward the nearby derelict spacecraft signal.",
        priority: 100,
        category: "discovery",
        hint: "Press V for a waypoint. Your pod laser can already break nearby asteroids and collect Ether.",
      });
    }

    const healthWarning = getStationHealthWarning(claimed);
    if (healthWarning) {
      return createObjective({
        id: "defend_base",
        title: "Defend Your Spacecraft",
        description: healthWarning,
        priority: 115,
        category: "combat",
        currentAmount: Math.max(0, claimed.health),
        targetAmount: claimed.maxHealth,
        hint: "If the carrier is destroyed, its storage, upgrades, and respawn access are lost.",
      });
    }

    const nextStage = claimed.repairStages[claimed.repairStageIndex];
    if (nextStage) {
      const missing = Object.entries(nextStage.cost).find(([type, amount]) => claimed.storage.ether[type as keyof typeof claimed.storage.ether] < (amount ?? 0));
      if (missing) {
        const [type, amount] = missing;
        const current = claimed.storage.ether[type as keyof typeof claimed.storage.ether];
        return createObjective({
          id: "deposit_" + type,
          title: "Gather " + ETHER_TYPES[type as keyof typeof ETHER_TYPES].label,
          description: "Deposit the rare component required for " + nextStage.name + ".",
          priority: 90,
          category: "cargo",
          currentAmount: current,
          targetAmount: amount,
          hint: "Use the pod laser to mine asteroids, then dock with your spacecraft and deposit the cargo.",
        });
      }

      if (claimed.fuel.currentFuel < nextStage.fuelCost) {
        const convertible = Object.entries(claimed.storage.ether).reduce(
          (sum, [type, amount]) => sum + amount * ETHER_CONFIG[type as keyof typeof ETHER_CONFIG].fuelPerUnit * claimed.fuel.conversionEfficiency,
          0,
        );
        return createObjective({
          id: convertible > 0 ? "convert_station_fuel" : "gather_fuel_ether",
          title: convertible > 0 ? "Convert Ether to Spacecraft Fuel" : "Mine Ether with the Pod Laser",
          description: convertible > 0
            ? "Convert deposited Ether into fuel for the claimed spacecraft."
            : "Fire the Survey Pod laser at nearby asteroids, collect the Ether, then return and dock with your spacecraft.",
          priority: 92,
          category: convertible > 0 ? "station" : "cargo",
          currentAmount: claimed.fuel.currentFuel,
          targetAmount: nextStage.fuelCost,
          hint: convertible > 0 ? "Dock, open Fuel Conversion, and convert stored Ether." : "Aim with the pointer, fire the laser, fly over drops to collect them, then press F at the cradle.",
        });
      }

      return createObjective({
        id: "repair_" + nextStage.id,
        title: "Repair " + nextStage.name,
        description: "Spacecraft fuel and components are ready. Repair the next onboard system.",
        priority: 88,
        category: "repair",
        currentAmount: claimed.repairStageIndex,
        targetAmount: claimed.repairStages.length,
        hint: "Dock inside the spacecraft, then click Repair Stage or press R.",
      });
    }

    if (!player.loadout.craftedModuleIds.length && claimed.craftingTier > 0) {
      return createObjective({
        id: "craft_first_module",
        title: "Craft Your First Module",
        description: "Use spacecraft storage to craft a weapon, shield, engine, or utility module.",
        priority: 80,
        category: "crafting",
        hint: "Crafted modules provide the real ship power in the new progression.",
      });
    }

    if (!player.loadout.installedModules.length && player.loadout.craftedModuleIds.length) {
      return createObjective({
        id: "install_first_module",
        title: "Install a Crafted Module",
        description: "Install a crafted module into an available hull slot.",
        priority: 78,
        category: "crafting",
        hint: "Hull tiers unlock more module slots.",
      });
    }

    const nextHull = getNextHullTier(player.loadout.hullTier);
    if (nextHull) {
      return createObjective({
        id: `upgrade_hull_${nextHull.tier}`,
        title: `Upgrade Hull to Tier ${nextHull.tier}`,
        description: `Prepare for ${nextHull.name}.`,
        priority: 72,
        category: "hull",
        currentAmount: player.level,
        targetAmount: nextHull.levelRequirement,
        hint: "Leveling unlocks hull eligibility, but spacecraft storage pays the upgrade cost.",
      });
    }

    const firstDefense = claimed.upgrades.find((upgrade) => upgrade.category === "kinetic_turrets");
    if (firstDefense && firstDefense.level <= 0) {
      return createObjective({
        id: "build_first_turret",
        title: "Build Spacecraft Defense",
        description: "Install Kinetic Auto Turrets so your carrier spacecraft can defend itself.",
        priority: 70,
        category: "defense",
        hint: "A claimed spacecraft should not be helpless while you mine.",
      });
    }

    return createObjective({
      id: "explore_belts",
      title: "Explore Asteroid Belts",
      description: "Farm richer belts closer to the center for better Ether, XP, and components.",
      priority: 50,
      category: "exploration",
      hint: "Open space is for travel. Belts are where serious resources spawn.",
    });
  }
}
