# BaseBorn playable-MVP finalization plan

## Release definition

BaseBorn is considered playable when a new pilot can enter without instructions from a developer, complete the pod tutorial, earn persistent progression, encounter other pilots in the same world, fight or cooperate under understandable zone rules, recover from death or disconnect, and play from desktop or mobile without blocked controls.

This is a single-world `.io` MVP, not a claim that content development is finished forever. New branches, enemies, team-craft fusion, regional sharding, moderation tooling, analytics, and live events are post-launch expansion work.

## Audit findings and execution

| Priority | Finding | Release impact | Resolution |
|---|---|---|---|
| P0 | Asteroid value was proposed by the destroying client | Resource and leaderboard inflation | Server now derives reward, XP, and score from validated identity, region, quality, and deterministic size weighting |
| P0 | Returning UI could restart at level 1 with empty cargo | Progress appeared lost after reload | Welcome/progression profiles now restore XP, level, score, ship, stats, health, and server inventory |
| P0 | HUD called the outer belt safe while server PvP still damaged players there | Rules contradicted presentation | Server damage now requires both attacker and target to be in a PvP-enabled region |
| P0 | Shared bullets ignored allocated combat stats | Upgrades did not matter in multiplayer | Server projectile speed, damage, and reload now use validated stat allocation |
| P1 | Client could submit impossible stat totals | Combat build spoofing | Server clamps every stat and rejects totals above earned level points |
| P1 | WebSocket clients had no burst ceiling | One client could monopolize the event loop | Per-connection message-window enforcement added above normal 20 Hz play traffic |
| P1 | Production responses lacked a complete browser-security baseline | Avoidable embedding and browser-capability risk | CSP, frame protection, permission policy, MIME protection, and opener isolation added |
| P1 | No repository CI workflow | Regressions could reach Railway from GitHub | Node 22 CI now runs clean install, complete tests, and production build |
| P1 | Responsive behavior had not been release-checked after networking changes | Phone controls could regress unnoticed | Desktop 1440×900, landscape 844×390, and portrait 390×844 were checked with no overflow or runtime warnings |

## Acceptance gates

1. `npm run build` completes from a clean dependency install.
2. TypeScript produces no errors.
3. Multiplayer smoke coverage validates joining, movement checks, authoritative mining, cargo pickup, claims, driving, teams, combat, reconnect restoration, and respawn behavior.
4. The load test sustains 24 simulated clients sending 20 updates per second with bounded snapshot delivery.
5. Atomic world persistence survives a save-and-load cycle.
6. The production dependency audit reports no high-severity vulnerabilities.
7. The production app loads under its CSP with no browser warnings or errors.
8. Desktop, phone-landscape, and portrait fallback layouts have no document overflow and keep all active controls within the viewport.
9. Railway can use `/health`; persistent deployments set `WORLD_STATE_PATH` to a mounted volume.

## Post-MVP roadmap

These are additions, not blockers for the current playable release:

1. Move alien AI from deterministic local simulation to regional server simulation when PvE co-op becomes a launch focus.
2. Add Redis or another shared state layer before running more than one Railway game-process replica.
3. Add account authentication before progression must move across browsers or devices; the MVP deliberately uses a browser-local anonymous session identity.
4. Add moderation, telemetry, seasonal ladders, replay capture, and live-balance configuration before a public competitive launch.
5. Implement physical fusion of multiple team spacecraft after its gameplay rules and ownership model are finalized.
