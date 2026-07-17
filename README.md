# Baseborn.io

Find a wreck. Dock inside. Build a moving base.

Baseborn.io is a browser-based space survival .io prototype built with React, TypeScript, Vite, and an HTML canvas renderer. The current game loop centers on asteroid mining, Ether cargo, docking into a claimed base station, repairing that station, piloting it inward with a basic booster, crafting modules, building defenses, and progressing toward future mothership/hyperdrive play.

## Story

### Build from the remains of a dead universe

The Ether Collapse destroyed the civilizations that once ruled the stars.

Now, abandoned stations drift through space, ancient machines guard forgotten worlds, and powerful Ether grows inside the asteroids scattered across the universe.

You awaken as one of the BaseBorn a pilot created to rebuild from the ruins.

Begin with a damaged ship.

Mine asteroids.

Collect Ether.

Claim a broken station.

Convert Ether into fuel and use it to upgrade everything you own.

Build new weapons, engines, shields, drones, defenses, and station systems. Every choice changes how your ship looks, moves, fights, and supports your team.

Reach level 100 and transform your ship into a personal mothership.

Join up to five other pilots and connect your motherships together to create a Galactic Space Station an enormous team-controlled structure shaped by the ships, modules, and roles your team chooses.

Build a fortress.

Build an assault station.

Build a support network.

Build something no other team has.

Travel toward the center of the universe, where the most powerful Ether and the greatest dangers are waiting.

Your ship is temporary.

Your station is your lifeline.

Your choices define what you become.

**Mine. Build. Evolve. Connect. Survive.**

**You are BaseBorn.**

[Read the complete BaseBorn universe story](docs/STORY.md).

[Read the complete BaseBorn upgrade system](docs/UPGRADE_SYSTEM.md).

## Current Status

Baseborn.io is a deployable browser game with a Railway-ready Node.js service. Multiplayer rooms synchronize player presence, validated movement, appearance, server-owned PvP projectiles and damage, shared Ether drops, asteroid destruction, station ownership, teams, minimap markers, and leaderboard state over WebSockets. PvE enemies and the deeper station crafting simulation remain browser-owned while those systems are migrated incrementally.

Implemented gameplay includes:

- 400,000 x 400,000 shared world map, tuned for denser multiplayer encounters
- Safe outer PvE zone and richer inner belts
- Mineable asteroid sizes and rarities
- Ether drops and cargo management
- Centralized Ether-to-Station-Fuel conversion economy
- Dock-gated ship stats, hulls, crafting, defenses, repairs, and hyperdrive spending
- Six-slot personal hangar with ship acquisition and station-only switching
- Base Ship starter class
- Core ship stat upgrades and ship evolution tree
- Drone ship behavior with destructible drones
- Claimable broken base stations
- Docking and undocking flow
- Dock-only station command access
- Staged station repairs
- Basic station booster movement after first repair
- Station storage, crafting, loadout, defense, team, landing pad, and hyperdrive command tabs
- Local minimap, sector readout, objective tracker, cargo panel, and leaderboard
- Server-batched 20 Hz multiplayer snapshots instead of per-input room broadcasts
- Shared server-simulated PvP projectiles with teammate friendly-fire protection
- Server cargo ledgers, close-range pickups, validated asteroid reports, and anti-mint checks
- Stable browser multiplayer identity across refreshes and reconnects
- Responsive phone, tablet, desktop, and ultrawide HUD layouts
- Installable fullscreen PWA shell with runtime asset caching

## Tech Stack

- React 19
- TypeScript
- Vite
- HTML canvas rendering
- Lucide React icons
- Playwright as a development/test dependency

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Default local URL:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Railway Deployment

Run the production server with multiplayer locally:

```bash
npm run start:local
```

Open `http://127.0.0.1:3000`. Players using the same room query join the same sector, for example `/?room=friends`. Room names allow lowercase letters, numbers, `_`, and `-`.

This repository is ready for a single Railway service deployed from GitHub:

1. Push the repository to GitHub and create a Railway project from that repository.
2. Railway reads `railway.json`, runs `npm ci && npm run build`, and starts `npm start`.
3. Generate a public Railway domain for the service.
4. Set the service healthcheck path to `/health` if Railway has not imported it automatically.
5. Do not set a fixed port. Railway injects `PORT`; the server binds it on `0.0.0.0`.

Optional environment variables:

- `MAX_PLAYERS_PER_ROOM` (default `64`).
- `WORLD_STATE_PATH` enables atomic world persistence. On Railway, mount a persistent volume and set this to a file inside that mount, such as `/data/baseborn-world.json`.

The frontend and WebSocket server share one origin, so Railway HTTPS automatically uses secure `wss://` connections without a second service or CORS configuration.

Useful endpoints:

- `/health` returns deployment health plus current room/player counts.
- `/api/status` returns multiplayer capacity and presence information.

Run the complete verification suite before deployment:

```bash
npm test
npm run build
```

The suite type-checks the client, tests state validation, shared projectiles and damage, cargo anti-mint behavior, station claim contention, team workflows, stable reconnects, and exercises 24 simultaneous clients at 20 input updates per second.

### Multiplayer trust model

The server owns player identity, bounded movement reconciliation, PvP health, projectile simulation, cargo balances, shared drops, score awarded by shared events, team membership, and station claims. Clients retain immediate movement and firing prediction so controls remain responsive, then consume fixed-rate server snapshots. Modified clients cannot directly submit arbitrary health, level, leaderboard score, cargo, teleport positions, or station ownership.

Current architectural boundary: alien PvE combat and advanced station crafting/repair internals are still local systems. File-backed shared-world persistence is available for a Railway volume; account progression would still benefit from a transactional database before adding permanent competitive rewards.

## Core Game Loop

1. Spawn in the safe outer zone as the Base Ship.
2. Find the nearby broken `Starter Wreck` or another abandoned station.
3. Press `F` near the station to claim it.
4. Mine asteroids for XP and Ether.
5. Return to the station and press `F` to dock.
6. Use station command while docked to deposit cargo.
7. Spend the emergency reactor reserve to restore the Reactor Core and Fuel Converter.
8. Convert deposited Ether into Station Fuel; rarer Ether produces dramatically more.
9. Spend Station Fuel on repairs, ships, modules, defenses, and travel.
10. Repair `Core Systems Online` for 120 Raw Ether.
11. Once the team leader docks, use `WASD` to pilot the station with its command drive.
12. Move inward to farm better materials, upgrade the base, craft modules, and improve defenses.
13. Later progression prepares the station for advanced upgrades, mothership systems, and hyperdrive.

There is no fixed win screen yet. The current goal is to grow from a weak ship and broken station into a mobile fortified base economy.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow Keys | Move the ship while undocked; directly pilot the station while its owner is docked |
| Mouse | Aim |
| Left Click / Space | Fire or command drones |
| Right Click | Repel drones from cursor |
| E | Toggle auto fire |
| Q | Toggle auto throttle |
| F | Claim station / dock / undock |
| R | Pulse station scanner while undocked; repair next station stage while docked |
| V | Show an arrow waypoint to the nearest broken station or your team station |
| M | Toggle minimap zoom between sector and local view |
| U | Open station command only while docked; otherwise toggles ship panel |
| Y | Open ship upgrades |
| H | Toggle cargo pickup |
| G | Drop lowest-quality carried Ether |

Station management is intentionally dock-gated. Being near the station is not enough to repair, upgrade, craft, deposit, or command it.

## Docking And Station Safety

After a station is claimed:

- `F` docks when the ship is near the station.
- The ship animates into the station core.
- Station command systems unlock only after the docking animation finishes.
- `F` undocks from inside the station and animates the ship back out.
- While fully docked, the ship is hidden inside the station and safe from normal ship damage/collisions.
- If the station is destroyed while the ship is inside, the docked ship is destroyed through the station failure path.

## Mobile Base Station

The first repair stage is:

| Stage | Cost | Unlocks |
| --- | --- | --- |
| Core Systems Online | 120 Raw Ether | Ownership beacon, docking support, and the first repair milestone |

After the station is claimed:

- The team leader / station owner can pilot the base.
- The leader must be fully docked inside the station.
- `WASD` moves the entire station like a spacecraft with normalized diagonal input, responsive acceleration, strong release braking, collision response, and visible directional thrusters.
- Station position and velocity are simulated by the multiplayer server, so every connected pilot sees the same moving base and docked crew travel with it.
- Basic booster speed starts at `stationBasePilotSpeed + boosterLevel * stationPilotSpeedPerBoosterLevel`.
- Current values are `210 + 1 * 20 = 230 units/second` for the first booster level.
- Normal booster movement collides with asteroids and enemies. Hyperdrive/warp is the special phased movement mode intended to pass through asteroids.

Future booster upgrades can increase `boosterLevel`; hyperdrive remains the intended late-game long-distance movement system.

## Station Repair Stages

| Stage | Cost | Unlocks |
| --- | --- | --- |
| Core Systems Online | 120 Raw Ether | Ownership beacon, basic docking, basic station booster |
| Storage Online | 220 Raw Ether, 80 Refined Ether | Station storage, deposit console |
| Crafting Online | 260 Raw Ether, 140 Refined Ether | Module crafting, tier 1 recipes |
| Defense Slots Online | 220 Refined Ether, 90 Charged Ether | Defense slots, light turret plans |
| Landing Pads Online | 360 Raw Ether, 220 Refined Ether, 120 Charged Ether | Team docking pads, local base support |
| Upgrade Console Online | 220 Radiant Ether, 60 Primal Ether | Hull console, advanced crafting |
| Full Station Restoration | 180 Primal Ether, 35 Core Ether | Mothership transformation eligibility |

Station command tabs currently include overview, storage, repair, defenses, crafting, loadout, landing pads, team, and hyperdrive.

Team Hub supports leader-only invitations, leadership transfer, member removal, leaving a team, and an optional spawn-near-base choice when joining or accepting an invitation.

## Station Scanner

Before claiming a station, the objective tracker shows the nearest broken station name, bearing, and distance. Press `R` while undocked to trigger a station scanner pulse. The pulse temporarily marks station signals and shows scanner feedback in the HUD. While docked, `R` is reserved for quick station repair.

## Station Defense Upgrades

Station defenses are repaired and upgraded from the command panel while docked.

| Upgrade | Ether Tier | Requirement | Purpose |
| --- | --- | --- | --- |
| Kinetic Auto Turrets | Raw Ether | Defenses repaired, station level 1 | Basic self-defense |
| Reinforced Armor Plating | Refined Ether | Storage repaired, station level 3 | Higher durability and damage reduction |
| Missile Defense System | Charged Ether | Defenses repaired, station level 8 | Burst defense |
| Shield Dome Generator | Radiant Ether | Defenses repaired, station level 14 | Regenerating station shield |
| Repair Drone Bay | Primal Ether | Landing pads repaired, station level 25 | Station hull repair over time |
| Core Defense Matrix | Core Ether | Full restoration, station level 50 | Endgame defense multiplier |

## Map

| Setting | Value |
| --- | ---: |
| World size | 1,000,000 x 1,000,000 |
| Half width / height | 500,000 |
| Center point | 0, 0 |
| Center zone radius | 45,000 |
| Asteroid belt inner radius | 17,500 |
| Asteroid belt outer radius | 42,500 |
| Minimap grid | 10 x 10 |
| Desktop minimap size | 320 |
| Large minimap size | 340 |
| Mobile minimap size | 210 |

Players spawn in safe outer corner regions. The starter station is placed near the player at the beginning of a run.

## Zones And Belts

Loot quality improves toward the center. The safe outer zone is PvE, while inner zones are designed as higher-risk areas.

Asteroids now populate the whole map. Belts add a small local density and rarity bias, while distance from the center remains the primary rarity rule.

| Region | Base Asteroids Per Chunk | Main Loot Direction |
| --- | ---: | --- |
| Outer | 18-26 | Mostly Common, with some Uncommon/Rare |
| Mid | 22-30 | Uncommon/Rare with some Epic |
| Inner | 26-36 | Rare/Epic with a Legendary chance |
| Center | 32-44 | Epic/Legendary/Core |

The minimap shows belt rings and sectors, not zone-name labels. Zone changes appear as on-screen notifications.

## Asteroids

Every asteroid is mineable. Difficulty and rewards depend on size and rarity.

### Asteroid Sizes

| Size | Radius | Health Multiplier | Reward Multiplier | Resistance Multiplier |
| --- | ---: | ---: | ---: | ---: |
| Pebble | 14-18 | 0.45x | 0.75x | 0.75x |
| Small | 19-25 | 0.75x | 1x | 0.90x |
| Standard | 26-34 | 1.10x | 1.60x | 1.00x |
| Large | 35-46 | 2x | 2.60x | 1.15x |
| Massive | 47-60 | 3.70x | 4x | 1.35x |
| Giant | 61-78 | 6.50x | 6x | 1.60x |
| Colossal | 79-100 | 11x | 9x | 1.95x |
| Titan | 101-128 | 18x | 13x | 2.35x |
| Moonlet | 129-165 | 30x | 19x | 2.80x |
| Worldstone | 166-220 | 48x | 28x | 3.25x |

### Asteroid Rarities

| Rarity | Shape | Ether Type | Health | XP | Ether Yield | Mining Resistance | Required Mining Power |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Common | Irregular cratered crag | Raw Ether | 1x | 1x | 1x | 1 | 1 |
| Uncommon | Multi-lobed cluster | Refined Ether | 1.8x | 2.5x | 2.25x | 1.4 | 2 |
| Rare | Four-point crystal | Charged Ether | 3.2x | 6x | 5x | 2.1 | 4 |
| Epic | Sharp radiant shard | Radiant Ether | 6x | 14x | 11x | 3.5 | 7 |
| Legendary | Six-rayed crown | Primal Ether | 11x | 35x | 26x | 6 | 11 |
| Core | Armored reactor core | Core Ether | 22x | 90x | 65x | 10 | 16 |

Asteroid values are computed from base values plus size and rarity modifiers. Current base values are:

| Base Value | Amount |
| --- | ---: |
| Health | 30 |
| XP | 8 |
| Ether | 8 |
| Score | 10 |

Mining resistance reduces damage if the ship's effective hit damage or mining power is too low. Bigger and rarer asteroids are intentionally slower to break. Every destroyed asteroid respawns after five minutes, and its destroyed state is shared by the multiplayer server.

High-speed asteroid impacts use relative velocity and approximate ship/asteroid mass. An unarmored starter hull takes the full crash damage and cannot mine by ramming. Reconstructed hulls, Max Health plating, and installed defense modules add hull armor: armored ships still take impact damage, but at a reduced amount, and fast rams deal mining damage to the asteroid. Body Damage further strengthens ramming and collision resistance. Autonomous Repair restores hull after its damage delay, with each invested level increasing the repair rate.

## Ether And Cargo

Ether types:

| Ether Type | Source |
| --- | --- |
| Raw Ether | Common asteroids |
| Refined Ether | Uncommon asteroids |
| Charged Ether | Rare asteroids |
| Radiant Ether | Epic asteroids |
| Primal Ether | Legendary asteroids |
| Core Ether | Core asteroids |

Current cargo behavior is shared capacity across all Ether types.

- Starting cargo capacity is 100 total.
- Cargo HUD shows total used capacity and carried stacks.
- Cargo pickup can be toggled with `H`.
- `G` drops the lowest-quality carried Ether stack first.
- If cargo is full, incoming Ether is not accepted.

## Station Fuel Conversion

Any deposited Ether can be converted into Station Fuel from the Fuel Conversion tab. Low-quality Ether gives less fuel and rare Ether gives much more. Station Fuel is the primary progression currency and also powers hyperdrive travel.

| 100 Ether | Station Fuel |
| --- | ---: |
| Raw | 10 |
| Refined | 25 |
| Charged | 60 |
| Radiant | 150 |
| Primal | 400 |
| Core | 1000 |
- The Cargo Hold stat increases capacity by 100 per point.

## Player Progression

The player can reach level 100. Leveling grants upgrade points for ship stats.

Core stats:

| Hotkey | Upgrade | Effect |
| --- | --- | --- |
| 1 | Hull Repair | Regenerates hull after avoiding damage |
| 2 | Shield Matrix | Increases shield and hull durability |
| 3 | Ram Plating | Increases collision damage and impact resistance |
| 4 | Plasma Velocity | Increases projectile velocity and drone speed |
| 5 | Plasma Stability | Increases projectile durability and drone hull |
| 6 | Weapon Output | Increases weapon, missile, beam, mining, and drone damage |
| 7 | Reactor Cycle | Improves fire rate, module cycle speed, and drone respawn/cycle speed |
| 8 | Thrusters | Increases movement speed |
| 9 | Cargo Hold | Increases cargo capacity |

Drone ships show drone-specific labels for some of these stats.

## Ship Evolution

The starter ship is the Base Ship. Its root upgrade id is `base_ship`.

Evolution levels:

```text
15, 30, 45, 60, 75, 90, 100
```

Upgrade branches:

- Rockets
- Laser
- Repair Beam
- Booster
- Speedster
- Tank
- Drones
- Machine Gun
- Force Field
- Mines
- Sniper
- Cannon
- Arc Lightning

The tree supports light, balanced, and heavy variants at most tiers. Level 100 options are mothership-style options.

## Hull Tiers

| Tier | Name | Requirement | Cargo |
| ---: | --- | --- | ---: |
| 1 | Salvaged Hull | Level 1 | 100 |
| 2 | Reconstructed Vessel | Level 5, Core Systems | 200 |
| 3 | Combat-Ready Ship | Level 15, Storage, Crafting Tier 1 | 300 |
| 4 | Specialized Vessel | Level 30, Crafting, Crafting Tier 2 | 400 |
| 5 | Advanced Warship | Level 50, Defenses, Crafting Tier 3 | 600 |
| 6 | Command Vessel | Level 75, Upgrade Console, Crafting Tier 4 | 800 |
| 7 | Mothership-Class Vessel | Level 100, Full Restoration, Crafting Tier 5 | 1000 |

## Drone Ships

Drone ships use drones as their main weapon system instead of direct-fire cannons.

- Idle drones auto-farm nearby asteroids.
- Drones stay near the ship unless commanded.
- Left click / Space sends drones toward the cursor.
- Right click repels drones from the cursor.
- Drones can take damage.
- Drone health, damage, speed, and respawn timing scale with upgrades/modules.
- Destroyed drones respawn through the drone bay/cycle logic.

## Enemies And Defenders

Current enemy/alien types:

- Sentinel
- Interceptor
- Beam Guard
- Mine Warden
- Carrier
- Core Guardian

Bot role labels include farmer, aggressor, sniper, rammer, carrier, and coward. Alien defenders patrol the center area, aggro nearby players, and respawn over time.

## HUD And UI

Current UI includes:

- Main menu with ship name entry, random name, play button, how-to-play, links, and ship preview
- Top HUD with hull, shield, zone, auto-fire, and auto-throttle
- Left HUD stack with objective, player status, cargo, and compact station status
- Cargo management panel
- Dock-gated station interaction panel
- Full station command panel
- Ship upgrade panel
- Upgrade tree overlay
- Minimap with 10 x 10 sectors and center/belt markers
- Zone notifications
- Death/respawn flow

## Rendering

Canvas-rendered elements:

- Player ship
- Enemy ships
- Drones
- Asteroids
- Projectiles
- Ether drops
- Base stations
- Space background, zones, and camera movement

React-rendered elements:

- Main menu
- HUD
- Cargo panel
- Station interaction and command panels
- Ship upgrades
- Upgrade tree overlay
- Minimap

## Project Structure

```text
src/
  App.tsx                         Main React app and screen flow
  main.tsx                        React app entry
  styles.css                      Global styles
  styles/                         Menu, HUD, upgrade, leaderboard styles

  components/
    menu/                         Main menu and how-to-play UI
    upgradeTree/                  Upgrade tree canvas, nodes, tooltips, visuals

  game/
    Game.ts                       Main game loop and snapshot emitter
    config.ts                     Global tuning, XP tables, stat caps
    data/                         Static gameplay data
    entities/                     Runtime entities
    rendering/                    Canvas drawing helpers
    systems/                      Gameplay systems
    types/                        Shared game type definitions
    ui/                           In-game React HUD and command components
```

## Key Systems

| System | Responsibility |
| --- | --- |
| `Game` | Main loop, update order, snapshots, hotkeys |
| `InputSystem` | Keyboard, mouse, firing, pointer world position |
| `RenderSystem` | Canvas rendering orchestration |
| `CollisionSystem` | Projectile, asteroid, drone, enemy, and player collisions |
| `AsteroidSystem` | Active asteroid lifecycle |
| `AsteroidSpawnSystem` | Chunk-based asteroid spawning |
| `AsteroidMiningSystem` | Mining damage and mining resistance |
| `EtherDropSystem` | Ether shard spawning, tractor pull, pickup |
| `CargoSystem` | Shared Ether cargo capacity and spending |
| `LevelSystem` | XP awards and upgrade point grants |
| `UpgradeSystem` | Ship stat upgrades and evolution |
| `UpgradeAvailabilitySystem` | Evolution availability rules |
| `ShipUpgradeSystem` | Base frame and ship stat upgrade rules |
| `StationInteractionSystem` | Station card actions and dock-gated action state |
| `StationSystem` | Claiming, docking, repairs, station storage, booster piloting, defenses |
| `LootDistributionSystem` | Zone lookup and asteroid rarity distribution |
| `SpawnSystem` | Safe corner spawn points |
| `AlienAggroSystem` | Alien defender targeting and aggro slots |
| `LeaderboardSystem` | Local leaderboard rows |
| `MinimapSystem` | Sector mapping and minimap coordinate transforms |

## Development Notes

- `dist/` is generated by Vite and should not be edited manually.
- `node_modules/` is generated by `npm install`.
- Run `npm run build` before committing gameplay or UI changes.
- The game exposes `globalThis.__basebornGame` in development mode for debugging.
- Unused legacy UI/system files have been removed during the current rework.
- The old starter naming has been removed; use Base Ship / `base_ship`.

## Current Limitations

- Multiplayer presence and movement networking is implemented; shared authoritative PvP combat and persistence are not yet implemented.
- Mode selection is simplified; some future modes are not active yet.
- Some upgrade branches are data/visual/planned branches rather than fully unique gameplay branches.
- Hyperdrive fuel conversion and state scaffolding are present, but late-game warp travel still needs fuller gameplay implementation.
- Planet ownership/discovery types exist, but planets are currently not spawned in the main loop.

## Suggested Next Work

- Move PvP combat, shared world simulation, and persistence to an authoritative server.
- Add booster upgrade recipes and UI leveling for faster station piloting.
- Expand hyperdrive into a complete late-game station travel flow.
- Expand scanner results into richer rare meteor, raid, and threat pings.
- Finish data-only upgrade branches.
- Add tests for mining, cargo, station repair, docking, and station piloting.
- Add saved progression or match/session persistence.
