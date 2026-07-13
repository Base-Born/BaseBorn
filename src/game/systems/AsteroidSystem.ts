import type { Asteroid } from "../entities/Asteroid";
import type { Vec2 } from "../types";
import { AsteroidSpawnSystem } from "./AsteroidSpawnSystem";

export class AsteroidSystem {
  private spawner = new AsteroidSpawnSystem();

  update(dt: number, playerPos: Vec2, now: number) {
    const asteroids = this.spawner.update(playerPos, now);
    asteroids.forEach((asteroid) => asteroid.update(dt));
    return asteroids;
  }

  markDestroyed(asteroid: Asteroid, now: number) {
    this.spawner.markDestroyed(asteroid, now);
  }

  syncSharedDestroyed(entries: Array<{ id: string; until: number }>) {
    this.spawner.syncSharedDestroyed(entries);
  }
}
