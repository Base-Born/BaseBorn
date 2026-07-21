# BaseBorn

BaseBorn is a real-time multiplayer space-survival game for desktop and mobile browsers. Every pilot begins alone in a Survey Pod, mines a shared asteroid field, repairs a nearby derelict spacecraft, integrates the pod into it, and develops a specialized combat and exploration build.

[Play the Railway build](https://baseborn.up.railway.app) · [Game story](docs/STORY.md) · [Release checklist](docs/FINALIZATION_PLAN.md)

## OpenAI Build Week submission

- **Source repository:** [github.com/Base-Born/BaseBorn](https://github.com/Base-Born/BaseBorn)
- **Playable deployment:** [baseborn.up.railway.app](https://baseborn.up.railway.app)
- **Development approach:** Human-directed, AI-assisted game development with OpenAI Codex and GPT-5.6

### How Codex and GPT-5.6 were used

BaseBorn was created through an iterative collaboration between its human creator and **OpenAI Codex powered by GPT-5.6**. The creator defined the game concept, supplied the story and visual references, selected the mechanics, tested multiplayer builds, and directed each redesign. Codex and GPT-5.6 helped turn that direction into a working, deployable game by:

- Auditing and restructuring the React, TypeScript, Canvas 2D, Node.js, and WebSocket codebase
- Implementing the Survey Pod tutorial, spacecraft recovery, mining, Ether drops, cargo, progression, weapon evolution, teams, leaderboard, and respawn flow
- Building and debugging server-authoritative multiplayer synchronization for players, projectiles, asteroids, loot, docking, ownership, and persistence
- Refining movement physics, controller and touch input, directional thrusters, aiming, collision damage, health regeneration, and responsive camera behavior
- Reworking the interface for desktop, ultrawide, tablet, and mobile displays, including PWA installation support
- Diagnosing Railway build and runtime issues and preparing the production build, health check, and deployment configuration
- Creating automated movement, multiplayer, load, and persistence checks; reviewing browser output; and fixing regressions found during play-testing
- Maintaining the README, story, upgrade reference, release checklist, and final repository audit for submission

Codex was used as an engineering and design collaborator throughout development, while the product direction and final decisions remained human-led. BaseBorn does not require an LLM at runtime; Codex and GPT-5.6 were used to build, debug, test, document, and prepare the project for submission.

## The playable loop

1. Spawn in a silver Survey Pod beside your reserved derelict spacecraft.
2. Aim at nearby asteroids and use the pod's single mining beam.
3. Collect the synchronized Ether drops and earn XP and score.
4. Deliver 12 Raw Ether to repair the derelict starter hull.
5. Land on the repaired craft and integrate the pod as its command module.
6. Continue mining, repair onboard systems, allocate level points, and choose weapon evolutions.
7. Join or invite other pilots, enter the riskier inner sectors, and compete on the live leaderboard.

Repairs, claiming, docking, cargo, progression, shared loot, and combat are validated by the multiplayer server.

## Current features

### Flight and combat

- Smooth keyboard, touch, and controller movement with inertia and damping
- Pointer or aim-stick weapon control independent from the hull
- Directional blue thrusters that activate only while the corresponding force is applied
- Single-target Survey Pod mining beam
- Server-synchronized multiplayer projectiles and PvP damage
- Manual respawn button with no forced countdown
- Close-range docking and undocking animations without sideways ejection

### Asteroids and Ether

- Deterministic shared asteroid field across one persistent `400,000 × 400,000` world
- Six rarity families with distinct shapes, durability, mining resistance, rewards, and distribution
- Increasing rarity toward the dangerous center
- Five-minute asteroid respawns
- Shared server-created Ether drops that any pilot can collect
- Server-authoritative rewards, XP, score, cargo balances, and anti-duplication validation
- Physics-based impact damage with hull armor, body damage, and health regeneration support

### Progression

- XP and score from asteroid mining and combat
- One core-tuning point per level from levels 2–34, capped at 33 points
- Eight stats: Health Regen, Max Health, Body Damage, Bullet Speed, Bullet Penetration, Bullet Damage, Reload, and Movement Speed
- A universal spacecraft base instead of the removed four-frame selection
- Level-gated spacecraft evolutions with visual weapon previews, including Twin and Sniper paths at level 15
- Projectile penetration as projectile durability; drone paths reinterpret it as drone health
- Reload becomes drone replacement speed for drone builds

### Multiplayer and teams

- One public map shared by all connected players on the server instance
- Live presence, interpolation, leaderboard, teams, invitations, leadership, and shared ownership
- Shared projectiles, asteroid destruction, loot, and five-minute respawn state
- Safe outer belt with PvP enabled deeper in the map
- Reconnect restoration for XP, score, level, ship class, stats, health, and cargo
- Optional file-backed world persistence through `WORLD_STATE_PATH`

### Interface and devices

- Compact bottom-center name, score, level, and XP HUD inspired by readable `.io` interfaces
- Condensed docked-spacecraft actions without the former full-screen resource matrix
- Dedicated cargo and spacecraft-system screens for detailed management
- Responsive camera zoom for desktop, ultrawide, tablet, and phone layouts
- Mobile movement and aim sticks with safe-area-aware controls
- Installable PWA support for launching without the normal browser address bar

## Controls

| Input | Action |
|---|---|
| `W` / `S` or Up / Down | Forward or reverse thrust |
| `A` / `D` or Left / Right | Turn the pod, spacecraft, or driven craft |
| Pointer | Aim the mining beam or mounted weapon |
| Left click / `Space` | Mine or fire |
| `F` | Repair, integrate, dock, or undock when in range |
| `V` | Show or refresh the spacecraft waypoint |
| `R` | Scan while flying or repair the next docked system |
| `U` | Open spacecraft systems while docked |
| `G` | Drop the lowest-quality cargo stack |
| `H` | Toggle automatic cargo pickup |
| `1`–`8` | Spend a point on the matching core stat |
| `Y` | Open core tuning when points are available; show the evolution tree |
| `E` | Toggle auto-fire |
| `Q` | Toggle auto-throttle |
| Respawn button | Respawn near the active team spacecraft or in the safe outer belt |

On mobile, the left stick controls movement, the right stick controls aim, and contextual buttons provide fire, interaction, scan, cargo, and upgrade actions.

## Technology

- React 19 and TypeScript
- Vite
- Canvas 2D rendering
- Node.js 22
- `ws` WebSockets
- Railway deployment
- Playwright-assisted browser verification

## Run locally

Node.js 22.12 or newer is required.

```bash
npm ci
npm run dev
```

Production-equivalent run:

```bash
npm run build
npm start
```

The production server serves the built client, exposes `/health`, and accepts WebSocket connections at `/multiplayer`.

## Verification

```bash
npm run typecheck
npm run test:movement
npm run test:multiplayer
npm run test:load
npm run test:persistence
npm test
npm run build
```

The automated suite covers keyboard/controller movement, asteroid synchronization and drops, five-minute respawns, recovered-spacecraft driving, shared projectiles and damage, cargo validation, reconnects, teams, claims, leadership, 24-client load, and atomic persistence.

## Railway deployment

[`railway.json`](railway.json) contains the production settings:

- Builder: Railpack
- Build command: `npm run build`
- Start command: `npm start`
- Health check: `/health`
- Restart policy: on failure, up to five retries

Railway supplies `PORT`. For persistent progression, mount a Railway volume at `/data` and set:

```text
WORLD_STATE_PATH=/data/baseborn-world.json
```

Automatic deployment should target the GitHub `main` branch. The repository's GitHub Actions workflow runs the full test suite and production build on every push and pull request.

## Project structure

```text
public/assets/starter/       Survey Pod and derelict/claimed spacecraft art
src/components/              Menu and upgrade-tree components
src/game/entities/           Player, asteroid, projectile, drone, and enemy entities
src/game/rendering/          Spacecraft, asteroid, Ether, and background rendering
src/game/systems/            Simulation, mining, docking, progression, and networking
src/game/ui/                 Responsive desktop and mobile interfaces
src/styles/                  Shared and responsive interface styling
server/                      Static server, WebSocket world, validation, persistence
scripts/                     Movement, multiplayer, load, and persistence smoke tests
docs/                        Story, release criteria, and design references
```

The starter asset directory is the canonical visual set. Player rendering uses `space-pod.png` before integration and `claimed-spacecraft-no-gun.png` afterward, with weapon mounts rendered independently. Retired ship and station artwork is not included in the production repository.

## Current scope

BaseBorn currently targets a playable single-process multiplayer MVP with one shared world per server instance. Physical fusion of multiple team spacecraft, additional evolution branches, expanded PvE, moderation, regional sharding, seasons, and account-based cross-browser progression remain future work.

The anonymous session identity is stored locally in the browser. Run only one Railway game-process replica until world state is moved to shared infrastructure such as Redis or a database.
