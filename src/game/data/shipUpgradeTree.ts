export const upgradeLevels = [15, 30, 45, 60, 75, 90, 100] as const;
export const REQUIRE_BASE_FOR_EVOLUTION = false;

export type UpgradeLevel = (typeof upgradeLevels)[number];
export type WeaponBranch =
  | "Rockets" | "Laser" | "Repair Beam" | "Booster" | "Speedster" | "Tank" | "Drones"
  | "Machine Gun" | "Force Field" | "Mines" | "Sniper" | "Cannon" | "Arc Lightning";
export type WeaponType =
  | "rockets" | "laser" | "repair_beam" | "booster" | "speedster" | "tank" | "drones"
  | "machine_gun" | "force_field" | "mines" | "sniper" | "cannon" | "arc_lightning" | "plasma";
export type ShipRole =
  | "starter" | "burst_damage" | "precision" | "support" | "rammer" | "mobility" | "fortress"
  | "swarm" | "suppression" | "defense" | "area_control" | "siege" | "chain_control";
export type ShipVariantType = "light" | "balanced" | "heavy" | "mother_light" | "mother_balanced" | "mother_heavy";
export type ImplementationStatus = "playable" | "data_only" | "planned";

export interface ShipNode {
  id: string;
  name: string;
  levelRequired: number;
  branch: WeaponBranch | "Core";
  tier: number;
  parentIds: string[];
  childIds: string[];
  weaponType: WeaponType;
  role: ShipRole;
  variantType: ShipVariantType;
  description: string;
  strengths: string[];
  weaknesses: string[];
  recommendedStats: string[];
  modelShape: string;
  visualProfileId: string;
  colorTheme: string;
  branchColor: string;
  iconType: string;
  displayPriority: number;
  branchIndex: number;
  laneIndex: number;
  abilityTags: string[];
  isMotherShipOption: boolean;
  implementationStatus: ImplementationStatus;
  layout?: {
    laneIndex?: number;
    branchIndex?: number;
    displayPriority?: number;
    focusGroup?: string;
  };
}

export interface BranchDefinition {
  branch: WeaponBranch;
  weaponType: WeaponType;
  role: ShipRole;
  theme: string;
  strengths: string[];
  weaknesses: string[];
  recommendedStats: string[];
  colorTheme: string;
  abilityTags: string[];
  modelShapes: Record<"light" | "balanced" | "heavy", string>;
  namesByLevel: Record<UpgradeLevel, [string, string, string]>;
}

const playableBranches: WeaponBranch[] = ["Rockets", "Laser", "Drones", "Sniper", "Machine Gun", "Booster", "Tank", "Mines"];

export const upgradeBranchOrder: WeaponBranch[] = [
  "Rockets",
  "Laser",
  "Repair Beam",
  "Booster",
  "Speedster",
  "Tank",
  "Drones",
  "Machine Gun",
  "Force Field",
  "Mines",
  "Sniper",
  "Cannon",
  "Arc Lightning",
];

const branchDefinitions: BranchDefinition[] = [
  branch("Rockets", "rockets", "burst_damage", "Explosive projectiles, splash damage, burst attacks, slower reactor cycle.", ["Burst damage", "Area pressure", "Good farming"], ["Slow cycle", "Weak close range", "Can be dodged"], ["Weapon Output", "Reactor Cycle", "Plasma Velocity"], "orange_red", ["explosive", "splash", "medium_range"], [
    ["Rocket Skirmisher", "Rocket Skirmisher", "Rocket Skirmisher"],
    ["Barrage Runner", "Guided Hunter", "Siege Rocketship"],
    ["Cluster Falcon", "Lock-On Marauder", "Warhead Cruiser"],
    ["Nova Bomber", "Spiral Salvo", "Heavy Payload"],
    ["Meteor Launcher", "Eclipse Artillery", "Rocket Phantom"],
    ["Starbreaker", "Void Barrage", "Apocalypse Engine"],
    ["Dreadnought Ark", "Orbital Warbase", "Titan Missile Core"],
  ]),
  branch("Laser", "laser", "precision", "Continuous beams, precision damage, and focused tracking.", ["Precision damage", "Reliable aim pressure", "High accuracy scaling"], ["Lower burst", "Weak close range", "Requires tracking"], ["Plasma Velocity", "Weapon Output", "Reactor Cycle"], "cyan_blue", ["beam", "precision"], [
    ["Laser Cutter", "Laser Cutter", "Laser Cutter"],
    ["Beam Striker", "Focus Lancer", "Split Prism"],
    ["Solar Needle", "Twin Beamcraft", "Prism Refractor"],
    ["Ion Lance", "Burning Ray", "Mirror Array"],
    ["Helios Spear", "Photon Serpent", "Radiant Splitter"],
    ["Sunpiercer", "Void Ray", "Omega Lens"],
    ["Solar Cathedral", "Prism Mothership", "Helios Command Core"],
  ]),
  branch("Repair Beam", "repair_beam", "support", "Support ship with healing, self-repair, ally repair, and defensive play.", ["Self repair", "Team utility", "Long survival"], ["Low damage", "Needs positioning", "Weak finish power"], ["Hull Repair", "Shield Matrix", "Reactor Cycle"], "green_white", ["repair", "support", "shield"], [
    ["Repair Vessel", "Repair Vessel", "Repair Vessel"],
    ["Shield Medic", "Nano Mender", "Salvage Engineer"],
    ["Guardian Medic", "Repair Drone Carrier", "Regenerator"],
    ["Sanctuary Ship", "Nano Web", "Recovery Cruiser"],
    ["Lifeweaver Core", "Shield Architect", "Revival Beacon"],
    ["Immortal Relay", "Angelic Carrier", "Eternal Repair Core"],
    ["Celestial Hospital", "Ark of Restoration", "Sanctuary Mothership"],
  ]),
  branch("Booster", "booster", "rammer", "High recoil movement, boost attacks, hit-and-run, and ramming potential.", ["Burst mobility", "Ramming pressure", "Fast escapes"], ["Hard to steer", "Risky collisions", "Lower range"], ["Thrusters", "Ram Plating", "Shield Matrix"], "yellow_orange", ["boost", "impact", "recoil"], [
    ["Booster Jet", "Booster Jet", "Booster Jet"],
    ["Twin Thruster", "Ram Booster", "Afterburner Fighter"],
    ["Comet Fang", "Flare Runner", "Jetblade"],
    ["Meteor Dash", "Thruster Storm", "Impact Runner"],
    ["Comet Breaker", "Solar Charger", "Void Sprinter"],
    ["Light-Speed Reaper", "Starcrash Engine", "Inferno Booster"],
    ["Comet Ark", "Impact Mothership", "Thruster Titan"],
  ]),
  branch("Speedster", "speedster", "mobility", "Extreme mobility, dodging, fast repositioning, weaker durability.", ["Extreme speed", "Dodging", "Map control"], ["Fragile", "Lower sustained damage", "Punished by traps"], ["Thrusters", "Reactor Cycle", "Weapon Output"], "lime_cyan", ["speed", "phase", "evasion"], [
    ["Speedster", "Speedster", "Speedster"],
    ["Phase Runner", "Orbit Dasher", "Blink Scout"],
    ["Phantom Wing", "Slipstream", "Rapid Harrier"],
    ["Ghostline", "Blink Raider", "Star Drifter"],
    ["Velocity Ghost", "Hyperwing", "Quantum Runner"],
    ["Light Phantom", "Void Racer", "Time-Slip Hunter"],
    ["Quantum Ark", "Velocity Command", "Phase Mothership"],
  ]),
  branch("Tank", "tank", "fortress", "High hull, high shield, slow movement, survival and body-blocking.", ["Huge shields", "Body blocking", "Forgiving trades"], ["Slow", "Easy to kite", "Lower chase"], ["Shield Matrix", "Ram Plating", "Hull Repair"], "steel_blue", ["armor", "shield", "heavy"], [
    ["Iron Hull", "Iron Hull", "Iron Hull"],
    ["Shield Cruiser", "Armor Barge", "Bulwark Ship"],
    ["Fortress Hull", "Titan Plating", "Bastion Cruiser"],
    ["Star Fortress", "Shield Wall", "Heavy Core"],
    ["Siege Bastion", "Void Bulwark", "Armor Citadel"],
    ["Unbreakable Core", "Planetbreaker Hull", "Eternal Bastion"],
    ["Fortress Mothership", "Citadel Ark", "Worldshield Core"],
  ]),
  branch("Drones", "drones", "swarm", "Drone control, orbiting drones, attack drones, and swarm management.", ["Autonomous pressure", "Defense screen", "Multi-target farming"], ["Lower direct fire", "Drone downtime", "Weak to burst"], ["Drone Bay Cycle", "Drone Hull", "Drone Weaponry"], "violet_cyan", ["drone", "swarm", "orbit"], [
    ["Drone Carrier", "Drone Carrier", "Drone Carrier"],
    ["Swarm Guide", "Orbit Commander", "Hunter Carrier"],
    ["Drone Commander", "Hive Pilot", "Orbital Guard"],
    ["Swarm Architect", "Drone Overlord", "Sentinel Carrier"],
    ["Hive Queen", "Orbit Storm", "Drone Nexus"],
    ["Swarm Deity", "Void Hive", "Carrier Prime"],
    ["Hive Mothership", "Drone Worldcore", "Swarm Ark"],
  ]),
  branch("Machine Gun", "machine_gun", "suppression", "Rapid fire, spread, suppression, and plasma walls.", ["High fire volume", "Suppression", "Easy farming"], ["Lower burst", "Lower per-shot damage", "Spread waste"], ["Reactor Cycle", "Weapon Output", "Plasma Stability"], "pink_cyan", ["rapid_fire", "spread", "suppression"], [
    ["Machine Gunner", "Machine Gunner", "Machine Gunner"],
    ["Rapid Sprayer", "Twin Gatling", "Suppressor"],
    ["Bullet Storm", "Gatling Falcon", "Shredder"],
    ["Plasma Hose", "Storm Cannon", "Scatter Engine"],
    ["Bullet Cyclone", "Neon Shredder", "Overheat Gunship"],
    ["Infinity Gatling", "Starstorm Sprayer", "Void Shredder"],
    ["Gatling Mothership", "Bullet Ark", "Stormbase Core"],
  ]),
  branch("Force Field", "force_field", "defense", "Defensive bubbles, knockback, shield zones, and protection.", ["Protection", "Knockback", "Zone safety"], ["Low kill pressure", "Lower burst", "Limited range"], ["Shield Matrix", "Hull Repair", "Plasma Stability"], "blue_violet", ["force_field", "knockback", "shield"], [
    ["Field Guard", "Field Guard", "Field Guard"],
    ["Bubble Defender", "Repulsor Ship", "Shield Projector"],
    ["Barrier Cruiser", "Pulse Guard", "Reflector"],
    ["Dome Maker", "Force Paladin", "Repulsion Core"],
    ["Gravity Shield", "Reflective Bastion", "Field Architect"],
    ["World Barrier", "Void Repulsor", "Eternal Shield"],
    ["Barrier Mothership", "Shield Ark", "Forcefield Citadel"],
  ]),
  branch("Mines", "mines", "area_control", "Trap placement, area denial, ambush, and defensive control.", ["Area denial", "Ambushes", "Defensive farming"], ["Weak chase", "Setup time", "Can be avoided"], ["Reactor Cycle", "Plasma Stability", "Weapon Output"], "amber_violet", ["mine", "trap", "area_control"], [
    ["Mine Layer", "Mine Layer", "Mine Layer"],
    ["Trap Runner", "Gravity Miner", "Cluster Layer"],
    ["Mine Architect", "Detonator", "Trapfield Ship"],
    ["Gravity Trapmaster", "Mine Web", "Explosive Net"],
    ["Void Trapper", "Starfield Layer", "Mine Fortress"],
    ["Singularity Miner", "Apocalypse Trapper", "Eternal Minefield"],
    ["Minefield Mothership", "Gravity Ark", "Trap Citadel"],
  ]),
  branch("Sniper", "sniper", "precision", "Long vision, high projectile speed, high damage, slow reactor cycle.", ["Long range", "High damage", "Pick potential"], ["Slow cycle", "Fragile", "Bad close range"], ["Plasma Velocity", "Plasma Stability", "Weapon Output"], "ice_blue", ["rail", "long_range", "pierce"], [
    ["Sniper Craft", "Sniper Craft", "Sniper Craft"],
    ["Rail Hunter", "Longshot Vessel", "Assassin Scope"],
    ["Void Lancer", "Rail Piercer", "Deep Scope"],
    ["Star Needle", "Phase Rail", "Hunter Lance"],
    ["Eclipse Sniper", "Piercing Ray", "Deathline"],
    ["Omega Railgun", "Void Needle", "Cross-Sector Hunter"],
    ["Railgun Mothership", "Death Star Core", "Longshot Ark"],
  ]),
  branch("Cannon", "cannon", "siege", "Heavy shots, large projectiles, high damage, slower reactor cycle.", ["Heavy hits", "High stability", "Objective pressure"], ["Slow cycle", "Slow shots", "Lower mobility"], ["Weapon Output", "Plasma Stability", "Shield Matrix"], "red_gold", ["cannon", "heavy", "siege"], [
    ["Cannon Ship", "Cannon Ship", "Cannon Ship"],
    ["Heavy Blaster", "Twin Cannon", "Siege Cannon"],
    ["Destroyer Craft", "Heavy Orb", "Burst Cannon"],
    ["Planet Cracker", "Cannon Fortress", "Star Blaster"],
    ["Nova Cannon", "Heavy Impact", "Orbital Destroyer"],
    ["Worldbreaker", "Void Cannon", "Supernova Blaster"],
    ["Cannon Mothership", "Worldbreaker Ark", "Supernova Core"],
  ]),
  branch("Arc Lightning", "arc_lightning", "chain_control", "Chain lightning, electric arcs, and multi-target farming.", ["Chains targets", "Good farming", "Mid-range control"], ["Shorter range", "Lower uptime", "Lower single-target"], ["Reactor Cycle", "Weapon Output", "Plasma Velocity"], "electric_purple", ["chain", "electric", "multi_target"], [
    ["Arc Spark", "Arc Spark", "Arc Spark"],
    ["Chain Zapper", "Storm Vessel", "Tesla Runner"],
    ["Lightning Weaver", "Arc Splitter", "Thunder Core"],
    ["Stormchain", "Tesla Serpent", "Ion Storm"],
    ["Thunder Warden", "Electric Web", "Storm Reaper"],
    ["Zeus Core", "Void Thunder", "Infinite Arc"],
    ["Thunder Mothership", "Tesla Ark", "Stormworld Core"],
  ]),
];

function branch(
  branchName: WeaponBranch,
  weaponType: WeaponType,
  role: ShipRole,
  theme: string,
  strengths: string[],
  weaknesses: string[],
  recommendedStats: string[],
  colorTheme: string,
  abilityTags: string[],
  names: Array<[string, string, string]>,
): BranchDefinition {
  return {
    branch: branchName,
    weaponType,
    role,
    theme,
    strengths,
    weaknesses,
    recommendedStats,
    colorTheme,
    abilityTags,
    modelShapes: {
      light: `${weaponType}_light_frame`,
      balanced: `${weaponType}_balanced_frame`,
      heavy: `${weaponType}_heavy_frame`,
    },
    namesByLevel: Object.fromEntries(upgradeLevels.map((level, index) => [level, names[index]])) as Record<UpgradeLevel, [string, string, string]>,
  };
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const variantNames = ["light", "balanced", "heavy"] as const;
const variantLabels = ["Light", "Balanced", "Heavy"] as const;

function buildTree() {
  const nodes: ShipNode[] = [{
    id: "base_ship",
    name: "Base Ship",
    levelRequired: 1,
    branch: "Core",
    tier: 1,
    parentIds: [],
    childIds: [],
    weaponType: "plasma",
    role: "starter",
    variantType: "balanced",
    description: "A basic starter spacecraft with one forward plasma cannon, balanced speed, balanced hull, and balanced fire rate.",
    strengths: ["Balanced controls", "Simple plasma cannon", "Flexible first upgrade"],
    weaknesses: ["No specialization", "Low burst damage", "No advanced module"],
    recommendedStats: ["Weapon Output", "Reactor Cycle", "Thrusters"],
    modelShape: "base_ship_balanced_frame",
    visualProfileId: "core_base",
    colorTheme: "cyan_violet",
    branchColor: "#5aa6c8",
    iconType: "plasma",
    displayPriority: 0,
    branchIndex: -1,
    laneIndex: 1,
    abilityTags: ["starter", "plasma"],
    isMotherShipOption: false,
    implementationStatus: "playable",
  }];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const addNode = (node: ShipNode) => {
    nodes.push(node);
    byId.set(node.id, node);
  };

  for (const def of branchDefinitions) {
    const branchIndex = upgradeBranchOrder.indexOf(def.branch);
    let previousTierIds = ["base_ship"];
    upgradeLevels.forEach((level, levelIndex) => {
      const tier = levelIndex + 2;
      const isMother = level === 100;
      const nodeIds: string[] = [];
      const names = def.namesByLevel[level];
      const variants = level === 15 ? ["balanced"] as const : variantNames;
      variants.forEach((variant, variantIndex) => {
        const name = level === 15 ? names[0] : names[variantIndex];
        const id = `${slug(def.branch)}_l${level}_${slug(name)}`;
        nodeIds.push(id);
        addNode({
          id,
          name,
          levelRequired: level,
          branch: def.branch,
          tier,
          parentIds: previousTierIds,
          childIds: [],
          weaponType: def.weaponType,
          role: def.role,
          variantType: isMother ? (`mother_${variant}` as ShipVariantType) : variant,
          description: `${name} specializes in ${def.theme}`,
          strengths: def.strengths,
          weaknesses: def.weaknesses,
          recommendedStats: def.recommendedStats,
          modelShape: def.modelShapes[variant],
          visualProfileId: `${slug(def.branch)}_l${level}_${variant}`,
          colorTheme: def.colorTheme,
          branchColor: branchColorForTheme(def.colorTheme),
          iconType: def.weaponType,
          displayPriority: variant === "balanced" ? 0 : variant === "light" ? 1 : 2,
          branchIndex,
          laneIndex: variantIndex,
          abilityTags: def.abilityTags.concat(variantLabels[variantNames.indexOf(variant as (typeof variantNames)[number])] ?? "Balanced"),
          isMotherShipOption: isMother,
          implementationStatus: "playable",
          layout: {
            branchIndex,
            laneIndex: variantIndex,
            displayPriority: variant === "balanced" ? 0 : variant === "light" ? 1 : 2,
            focusGroup: slug(def.branch),
          },
        });
      });
      for (const parentId of previousTierIds) {
        const parent = byId.get(parentId);
        if (parent) parent.childIds = Array.from(new Set(parent.childIds.concat(nodeIds)));
      }
      previousTierIds = nodeIds;
    });
  }
  return nodes;
}

export const shipUpgradeTree: ShipNode[] = buildTree();
export const shipNodeById = new Map(shipUpgradeTree.map((node) => [node.id, node]));
export const coreShipNode = shipNodeById.get("base_ship")!;
const legacyCoreShipId = ["core", "sk" + "iff"].join("_");
export const normalizeShipNodeId = (id: string) => id === legacyCoreShipId ? "base_ship" : id;
export const getShipNode = (id: string) => shipNodeById.get(normalizeShipNodeId(id)) ?? coreShipNode;
export const getBranchDefinitions = () => branchDefinitions;

if (import.meta.env.DEV) {
  import("../systems/UpgradeTreeValidationSystem").then(({ validateUpgradeTree }) => {
    const validation = validateUpgradeTree(shipUpgradeTree);
    if (!validation.valid) console.warn("Baseborn upgrade tree validation warnings:", validation.warnings);
  });
}

function branchColorForTheme(theme: string) {
  const colors: Record<string, string> = {
    orange_red: "#c8793f",
    cyan_blue: "#5aa6c8",
    green_white: "#76bf87",
    yellow_orange: "#c49a45",
    lime_cyan: "#6faec6",
    steel_blue: "#8da2bf",
    violet_cyan: "#8e80b8",
    pink_cyan: "#c6a84d",
    blue_violet: "#7892cf",
    amber_violet: "#bd8b45",
    ice_blue: "#b7c8dc",
    red_gold: "#b65c58",
    electric_purple: "#8e80b8",
  };
  return colors[theme] ?? "#5aa6c8";
}
