# BaseBorn playable-MVP release checklist

Last reviewed: July 22, 2026.

## Release definition

BaseBorn is considered playable when a new pilot can enter without developer guidance, complete the Survey Pod recovery tutorial, earn persistent progression, encounter other pilots in the same world, understand the safety rules, recover from death or disconnect, and use all essential controls on desktop or mobile.

This is the definition of the current single-process `.io` MVP. It is not a claim that future content development is complete.

## Completed release work

| Area | Release problem | Implemented resolution |
|---|---|---|
| Starting experience | The former station-first sequence conflicted with the new concept | New pilots spawn in a Survey Pod beside a reserved derelict spacecraft, mine 12 Raw Ether, repair it, and integrate |
| Pod identity | The old spacecraft model could replace the Survey Pod | Rendering now selects the pod explicitly from the authoritative ship class and versions the cached pod asset |
| Shared mining | Docked spacecraft kills could remove an asteroid without producing loot | Player-caused kills are tracked independently from flight state and reported while docked |
| Asteroid validation | Legitimate long-range or boundary-drifting kills could be rejected | The server accepts bounded upgraded range and validates drift against the asteroid's deterministic origin chunk |
| Progression integrity | Clients could propose asteroid value and impossible stat totals | The server calculates rewards and clamps allocations to earned level points |
| Multiplayer combat | Other players could miss bullets or receive unscaled damage | Projectiles, penetration, fire rate, damage, and PvP hits are synchronized and server owned |
| World rules | The HUD called the outer belt safe while damage remained possible | Both attacker and target must be inside PvP-enabled space for player damage |
| Continuity | Reloading could appear to reset level and cargo | Reconnect restores XP, score, level, class, stats, health, and server cargo |
| Interface | Large docked panels blocked the playfield | The HUD now uses a compact name/score/XP panel and condensed docked controls |
| Camera | Desktop and mobile views were too close | Camera targets now adapt across ultrawide, desktop, tablet, phone, docked, and Sniper states |
| Mobile | Browser controls and HUD panels overlapped gameplay | Touch layouts use safe areas, separate movement/aim sticks, and responsive panel sizing |
| Operations | Railway needed a dependable build and health contract | Railpack build, Node start command, `/health`, restart policy, optional volume persistence, and GitHub CI are configured |

## Acceptance gates

1. `npm ci` succeeds with Node.js 22.12 or newer.
2. `npm run typecheck` produces no TypeScript errors.
3. `npm run test:movement` validates keyboard and controller thrust, reverse, rotation, damping, and inertial heading.
4. `npm run test:multiplayer` validates joining, movement limits, shared asteroid drops and respawns, claims, driving, synchronized projectiles, damage, teams, reconnects, and respawning.
5. `npm run test:load` sustains 24 simulated clients at 20 input updates per second with bounded snapshots.
6. `npm run test:persistence` verifies atomic world-state save and restoration.
7. `npm run build` produces the production client.
8. The production UI has no active-control overlap at desktop, ultrawide, tablet, phone landscape, and portrait fallback sizes.
9. Railway reports healthy through `/health` and uses a mounted volume when persistent world state is required.

## Current operational constraints

- The anonymous player identity belongs to one browser and is not an account.
- Run one Railway game-process replica; the in-memory live world is not shared between replicas.
- `WORLD_STATE_PATH` must point to persistent storage if progression should survive container replacement.
- The game world is one public map per running server instance, not a multi-region shard network.

## Post-MVP roadmap

1. Move shared live state to Redis or a database before horizontal scaling.
2. Add account authentication for cross-browser progression.
3. Expand authoritative server simulation for cooperative PvE.
4. Add moderation, telemetry, replay capture, seasonal ladders, and live balance configuration.
5. Finish physical fusion of multiple team spacecraft after ownership, driving, damage, and disconnection rules are finalized.
6. Add more weapon-evolution branches, enemies, objectives, and central-universe encounters.
