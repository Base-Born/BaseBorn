# BaseBorn

BaseBorn is a browser-based multiplayer space survival game built with React, TypeScript, Vite, Canvas 2D, Node.js, and WebSockets. The current rework starts every new pilot in a small Survey Pod instead of at a space station.

## Current starting sequence

1. Spawn in a lightweight Survey Pod in one of the safe outer sectors.
2. Use `WASD` to maneuver. The pointer continues to aim later spacecraft weapons.
3. Hold the attack control to lock one mining beam onto the closest asteroid in range.
4. Fly over shared Ether drops to collect them in the pod's small cargo hold.
5. Follow the tutorial waypoint to the nearby derelict spacecraft.
6. Move directly into its central pod cradle and press `F` to land and claim it.
7. The pod docks into the spacecraft with a short integration animation.
8. Deposit Ether, repair onboard systems, and earn core-tuning points by gaining levels.

Claiming is intentionally close-range. A derelict spacecraft cannot be claimed from outside its central cradle, and multiplayer ownership is resolved by the server so two crews cannot claim the same craft.

## New starter vehicles

### Survey Pod

- Compact silver-white survival pod based on the supplied BaseBorn concept asset
- Independent forward, reverse, and strafe maneuvering
- Directional blue thrusters that only fire while thrust is applied
- Built-in single-beam mining laser with nearest-asteroid targeting
- Lower hull strength and smaller cargo capacity than a full spacecraft
- Server-synchronized movement, appearance, and shared mining rewards

### Derelict spacecraft

- Circular carrier spacecraft with an empty central pod cradle
- Separate abandoned and pod-integrated visual states
- Becomes the crew's storage, repair, and fuel-conversion hub after claiming
- Uses close-range docking plus anchored integration and undocking animations that do not eject the pod
- Can later unlock carrier movement, defenses, crafting, and advanced systems

The future team-combination system is not part of this starting-sequence milestone. The multiplayer and team foundation remains in place so multiple upgraded spacecraft can later connect into a larger shared structure.

## Asteroids and resources

Asteroids are deterministic shared-world objects distributed by distance from the map center. Common material dominates the outer sectors, while increasingly rare shapes and Ether qualities appear inward.

- Asteroids have rarity-specific silhouettes, health, mass, collision damage, and Ether yields.
- Destroyed asteroids respawn after five minutes.
- Ether drops are shared between players and synchronized by the server.
- Impact damage depends on relative speed and asteroid mass.
- Hull and health-regeneration upgrades support collision-focused mining builds.

## Level progression

Each level from 2 through 34 awards one core-tuning point, for a maximum of 33 points. The four old base-frame choices have been removed: every pilot uses the same universal spacecraft hull, while stats and later equipment evolutions define the build. Core tuning contains Health Regen, Max Health, Body Damage, Bullet Speed, Bullet Penetration, Bullet Damage, Reload, and Movement Speed. Bullet Penetration controls projectile durability and becomes drone health for drone-based evolutions.

## Multiplayer

The Railway-ready Node.js service provides one persistent public world with:

- Player presence and interpolation
- Validated movement
- Shared projectiles with server-owned fire rate, projectile speed, damage, and PvP damage
- PvE-only protection in the outer belt, matching the HUD's safe-zone status
- Shared asteroid destruction and five-minute respawns
- Server-calculated asteroid rarity rewards, XP, score, and level progression
- Shared Ether drops and server-owned cargo balances
- Derelict-spacecraft claim contention
- Team creation, joining, invitations, leadership, and shared ownership
- Leaderboard synchronization
- Reconnect restoration for XP, level, score, ship class, stat allocation, health, and cargo
- Optional file-backed world persistence through `WORLD_STATE_PATH`

The service also validates same-origin WebSocket upgrades, limits message bursts, disables unused browser permissions, prevents framing, and exposes build/persistence readiness through `/health`.

This rework uses world revision `pod-start-v1`. Older persisted worlds are not loaded into the new starting sequence, preventing previous station-era player and ownership state from leaking into the pod tutorial.

## Controls

| Input | Action |
|---|---|
| `WASD` / Arrow keys | Move the active pod or piloted spacecraft |
| Pointer | Aim |
| Left click / `Space` | Fire the mining laser or active weapon |
| `F` | Land and claim / dock / undock |
| `V` | Show or refresh the spacecraft waypoint |
| `R` | Scan while flying / repair the next system while docked |
| `U` | Open spacecraft systems while docked |
| `G` | Drop the lowest-quality cargo stack |
| `H` | Toggle cargo pickup |
| `1`–`8` | Spend an available level point on the matching core stat |
| `Y` | Open core tuning when level points are available |
| `E` | Toggle auto-fire |
| `Q` | Toggle auto-throttle |
| Respawn button | Return near your active spacecraft, or to a safe outer-zone spawn if no valid craft remains |

Mobile controls provide separate movement and aim sticks, fire and interaction actions, and adaptive HUD layouts.

## Local development

Requirements: Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

Production-equivalent local run:

```bash
npm run build
npm start
```

Useful checks:

```bash
npm run typecheck
npm run test:multiplayer
npm run test:load
npm run test:persistence
npm test
npm audit --omit=dev --audit-level=high
```

## Railway deployment

The repository is configured to build the Vite client and serve it with the multiplayer Node.js process.

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `/health`
- WebSocket endpoint: `/multiplayer`
- Required runtime variable: Railway supplies `PORT`
- Optional persistence variable: `WORLD_STATE_PATH=/data/baseborn-world.json` with a Railway volume mounted at `/data`

Pushing to the GitHub branch connected to Railway triggers deployment when automatic deployments are enabled in Railway.

For persistent progression on Railway, mount a volume at `/data` and configure:

```text
WORLD_STATE_PATH=/data/baseborn-world.json
```

## Playable MVP completion status

| Area | Release requirement | Status |
|---|---|---|
| Opening loop | Spawn, mine, collect, claim, dock, deposit, repair | Complete |
| Flight | Pointer aim, WASD/touch movement, directional thrusters | Complete |
| Progression | XP, levels, stat allocation, evolution paths | Complete |
| Multiplayer | One shared map, presence, teams, leaderboard, shared loot | Complete |
| Combat | Shared projectiles, server damage, stat-scaled weapons, respawn | Complete |
| Safety | Outer PvE belt and inner PvP risk zones | Complete |
| Continuity | Session identity and server-backed player/cargo restoration | Complete |
| Devices | Desktop, ultrawide, tablet, phone landscape, portrait fallback, PWA | Complete |
| Operations | Railway health check, persistence option, load tests, CI | Complete |

The audit and release acceptance criteria are documented in [`docs/FINALIZATION_PLAN.md`](docs/FINALIZATION_PLAN.md).

## Project structure

```text
public/assets/starter/       Survey Pod and derelict/claimed spacecraft sprites
src/game/entities/          Player, asteroid, projectile, drone, and enemy entities
src/game/rendering/         Ship, asteroid, Ether, and background rendering
src/game/systems/           Gameplay, docking, mining, upgrades, teams, and simulation
src/game/ui/                Desktop, tablet, and mobile interface components
server/                     Static production server, WebSocket world, and persistence
scripts/                    Multiplayer, load, and persistence smoke tests
```

## Release scope

This repository now targets a playable single-process multiplayer MVP: one persistent public world, up to 64 connected pilots per instance, pod-first onboarding, progression, combat, teams, shared resources, and a claimed spacecraft hub. New enemy families, additional evolution branches, multi-region orchestration, and physical team-craft fusion are post-MVP content expansions.
