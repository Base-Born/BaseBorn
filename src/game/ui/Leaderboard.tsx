import { Crown } from "lucide-react";
import { formatScore } from "../systems/LeaderboardSystem";
import type { LeaderboardEntry } from "../types/leaderboardTypes";

export function Leaderboard({ rows }: { rows: LeaderboardEntry[] }) {
  return (
    <aside className="leaderboard">
      <h2>Leaderboard</h2>
      {rows.map((row, index) => (
        <div className={row.isLocalPlayer ? "leader leader--player" : "leader"} key={row.id}>
          <span>{index + 1}. {row.raceTag ? `[${row.raceTag}] ` : ""}{row.name}{row.isLocalPlayer && <em>YOU</em>}</span>
          <small>Lv {row.level} / {row.shipClass}</small>
          <b>{row.isMothership && <Crown size={12} />}{formatScore(row.score)}</b>
        </div>
      ))}
    </aside>
  );
}

