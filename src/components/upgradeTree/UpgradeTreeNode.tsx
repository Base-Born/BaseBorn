import type { MouseEvent } from "react";
import type { CSSProperties } from "react";
import type { PositionedUpgradeNode } from "../../game/systems/UpgradeTreeLayoutSystem";
import type { UpgradeNodeState } from "../../game/systems/UpgradeAvailabilitySystem";
import { ShipPreviewIcon, branchCssVars } from "./branchVisuals";

export function UpgradeTreeNode({
  node,
  state,
  requirement,
  canChoose,
  onChoose,
  onFocusBranch,
  onHover,
  onLeave,
}: {
  node: PositionedUpgradeNode;
  state: UpgradeNodeState;
  requirement: string;
  canChoose: boolean;
  onChoose: (id: string) => void;
  onFocusBranch: () => void;
  onHover: (node: PositionedUpgradeNode, event: MouseEvent<HTMLButtonElement>) => void;
  onLeave: () => void;
}) {
  const className = [
    "upgradeTreeNode",
    `upgradeTreeNode--${state}`,
    node.compact ? "upgradeTreeNode--compact" : "",
    node.branch === "Core" ? "upgradeTreeNode--core" : "",
    node.isMotherShipOption ? "upgradeTreeNode--mother" : "",
  ].filter(Boolean).join(" ");
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;
  const fanDx = 820 - nodeCenterX;
  const fanDy = 820 - nodeCenterY;
  const ringDelay = node.levelRequired <= 1 ? 0 : Math.max(0, node.tier - 1) * 12;
  const branchDelay = node.branchIndex * 4 + Math.max(0, node.laneIndex) * 5;
  const fanDelay = node.id === "base_ship" ? 0 : Math.min(170, ringDelay + branchDelay);

  return (
    <button
      className={className}
      style={{
        ...branchCssVars(node.branch),
        "--node-opacity": node.opacity,
        "--fan-dx": `${fanDx}px`,
        "--fan-dy": `${fanDy}px`,
        "--fan-delay": `${fanDelay}ms`,
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        opacity: node.opacity,
      } as CSSProperties}
      title={requirement}
      aria-disabled={!canChoose}
      onClick={() => {
        if (canChoose) onChoose(node.id);
      }}
      onMouseEnter={(event) => onHover(node, event)}
      onMouseMove={(event) => onHover(node, event)}
      onMouseLeave={onLeave}
      onFocus={onFocusBranch}
    >
      <span className="nodeIcon"><ShipPreviewIcon node={node} /></span>
      <span className="nodeText">
        <strong>{node.name}</strong>
        <small>{node.isMotherShipOption ? "100" : node.branch === "Core" ? "Core" : node.levelRequired}</small>
      </span>
      {state === "current" && <em>Current</em>}
      {state === "available" && <em>Ready</em>}
    </button>
  );
}
