import type { LeaderboardEntry } from "../types/leaderboardTypes";
import type { Player } from "../entities/Player";
import type { RemotePlayerState } from "../network/protocol";

export function formatScore(score: number) {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (score >= 10_000) return `${(score / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return Math.round(score).toLocaleString();
}

export function buildLeaderboard(player: Player, remotePlayers: RemotePlayerState[] = []): LeaderboardEntry[] {
  return [{
    id: player.id,
    name: player.name,
    score: player.score,
    level: player.level,
    shipClass: player.ship.name,
    isLocalPlayer: true,
    isMothership: player.ship.node.isMotherShipOption,
    entityType: "player" as const,
  }, ...remotePlayers.map((remote) => ({
    id: remote.id,
    name: remote.name,
    score: remote.score,
    level: remote.level,
    shipClass: remote.shipClass,
    isLocalPlayer: false,
    isMothership: remote.shipClassId.includes("mother"),
    entityType: "player" as const,
  }))].sort((a, b) => b.score - a.score || b.level - a.level || a.name.localeCompare(b.name)).slice(0, 10);
}

