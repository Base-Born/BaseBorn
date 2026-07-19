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
8. Deposit Ether, convert it into spacecraft fuel, repair onboard systems, and unlock the upgrade bay.

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
- Becomes the crew's storage, repair, fuel-conversion, and upgrade hub after claiming
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

## Multiplayer

The Railway-ready Node.js service provides one persistent public world with:

- Player presence and interpolation
- Validated movement
- Shared projectiles and PvP damage
- Shared asteroid destruction and five-minute respawns
- Shared Ether drops and server-owned cargo balances
- Derelict-spacecraft claim contention
- Team creation, joining, invitations, leadership, and shared ownership
- Leaderboard synchronization
- Optional file-backed world persistence through `WORLD_STATE_PATH`

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
| `Y` | Open the spacecraft evolution tree |
| `E` | Toggle auto-fire |
| `Q` | Toggle auto-throttle |

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

## Current scope

This milestone completes the pod-first opening loop and preserves the deeper repair and upgrade systems inside the claimed spacecraft. The next planned design phase can add new onboard upgrades and define how several team spacecraft physically connect into a larger station.
