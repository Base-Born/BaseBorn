import type { GameSnapshot } from "../types";

export function ObjectiveTracker({ snapshot }: { snapshot: GameSnapshot }) {
  const objective = snapshot.currentObjective;
  if (!objective) return null;
  const progress = objective.targetAmount ? Math.min(100, ((objective.currentAmount ?? 0) / objective.targetAmount) * 100) : 0;

  return (
    <aside className="objectiveTracker">
      <header>
        <span>Current Objective</span>
        <b>{objective.category}</b>
      </header>
      <strong>{objective.title}</strong>
      <p>{objective.description}</p>
      {snapshot.stationFinder.visible && (
        <div className="objectiveTracker__finder">
          <span>{snapshot.stationFinder.stationName}</span>
          <b>{snapshot.stationFinder.bearingLabel} / {Math.round(snapshot.stationFinder.distance).toLocaleString()}m</b>
          <small>{snapshot.stationFinder.hint}</small>
        </div>
      )}
      {objective.targetAmount && (
        <div className="objectiveTracker__progress">
          <i style={{ width: `${progress}%` }} />
          <span>{snapshot.objectiveProgress}</span>
        </div>
      )}
      {snapshot.objectiveHint && <small>{snapshot.objectiveHint}</small>}
    </aside>
  );
}
