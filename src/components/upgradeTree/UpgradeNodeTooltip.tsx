import type { ShipNode } from "../../game/data/shipUpgradeTree";
import type { UpgradeNodeState } from "../../game/systems/UpgradeAvailabilitySystem";
import type { CSSProperties } from "react";
import { ShipPreviewIcon } from "./branchVisuals";

export function UpgradeNodeTooltip({
  node,
  state,
  requirement,
  x,
  y,
}: {
  node: ShipNode;
  state: UpgradeNodeState;
  requirement: string;
  x: number;
  y: number;
}) {
  return (
    <aside className="upgradeNodeTooltip" style={{ left: x, top: y }}>
      <div className="upgradeNodeTooltip__preview" style={{ "--branch-accent": node.branchColor } as CSSProperties}>
        <ShipPreviewIcon node={node} />
      </div>
      <header>
        <strong>{node.name}</strong>
        <span>{state === "available" ? "Click to evolve" : requirement}</span>
      </header>
      <p>{node.description}</p>
      <dl>
        <div><dt>Level</dt><dd>{node.levelRequired}</dd></div>
        <div><dt>Branch</dt><dd>{node.branch}</dd></div>
        <div><dt>Variant</dt><dd>{node.variantType.replace("_", " ")}</dd></div>
      </dl>
      <div className="tooltipColumns">
        <section>
          <b>Strengths</b>
          {node.strengths.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
        </section>
        <section>
          <b>Weaknesses</b>
          {node.weaknesses.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
        </section>
      </div>
      <footer>{node.recommendedStats.join(" / ")}</footer>
    </aside>
  );
}
