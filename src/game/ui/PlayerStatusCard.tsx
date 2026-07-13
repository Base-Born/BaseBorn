import type { GameSnapshot } from "../types";

export function PlayerStatusCard({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <aside className="playerStatusCard">
      <div className="levelBadge">Lv {snapshot.level}</div>
      <div>
        <strong>{snapshot.shipClass}</strong>
        <span>{snapshot.baseFrame.name} / {snapshot.buildSummary}</span>
      </div>
      <div className="scoreLine">Score {snapshot.score.toLocaleString()}</div>
      <div className="pointsLine">{snapshot.upgradePoints} ship upgrade points</div>
    </aside>
  );
}
