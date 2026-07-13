import type { CSSProperties, MouseEvent } from "react";
import type { WeaponBranch } from "../../game/data/shipUpgradeTree";
import type { PositionedUpgradeNode } from "../../game/systems/UpgradeTreeLayoutSystem";
import {
  canChooseUpgrade,
  getUpgradeNodeState,
  getUpgradeRequirement,
} from "../../game/systems/UpgradeAvailabilitySystem";
import { branchAccent } from "./branchVisuals";
import { UpgradeTreeNode } from "./UpgradeTreeNode";

export interface TreeCamera {
  x: number;
  y: number;
  zoom: number;
}

export function UpgradeTreeCanvas({
  layout,
  camera,
  mode,
  selectedBranch,
  level,
  currentShipId,
  availableIds,
  pathIds,
  onChoose,
  onFocusBranch,
  onNodeHover,
  onNodeLeave,
}: {
  layout: PositionedUpgradeNode[];
  camera: TreeCamera;
  mode: "overview" | "focus";
  selectedBranch: WeaponBranch | null;
  level: number;
  currentShipId: string;
  availableIds: Set<string>;
  pathIds: Set<string>;
  onChoose: (id: string) => void;
  onFocusBranch: (branch: WeaponBranch | null) => void;
  onNodeHover: (node: PositionedUpgradeNode, event: MouseEvent<HTMLButtonElement>) => void;
  onNodeLeave: () => void;
}) {
  const visible = layout.filter((node) => node.visible);
  const byId = new Map(layout.map((node) => [node.id, node]));
  const width = 1640;
  const height = 1640;

  return (
    <div className="upgradeTreeViewport">
      <div
        className="upgradeTreeWorld"
        style={{
          width,
          height,
          transform: `translate(-50%, -50%) translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
        }}
      >
        <svg className="upgradeTreeLines" width={width} height={height} aria-hidden="true">
          {visible.flatMap((node) => {
            return node.parentIds.map((parentId) => {
              const parent = byId.get(parentId);
              if (!parent || !parent.visible) return null;
              const active = pathIds.has(node.id) && pathIds.has(parent.id);
              const available = availableIds.has(node.id);
              const stateClass = active ? "active" : available ? "available" : "locked";
              const startX = parent.x + parent.width / 2;
              const startY = parent.y + parent.height / 2;
              const endX = node.x + node.width / 2;
              const endY = node.y + node.height / 2;
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const curveX = midX + (820 - midX) * 0.08;
              const curveY = midY + (820 - midY) * 0.08;
              return (
                <path
                  className={`upgradeTreeLine ${stateClass}`}
                  d={`M ${startX} ${startY} Q ${curveX} ${curveY}, ${endX} ${endY}`}
                  key={`${parent.id}-${node.id}`}
                  style={{ "--branch-accent": branchAccent[node.branch] } as CSSProperties}
                />
              );
            });
          })}
        </svg>
        {visible.map((node) => {
          const state = getUpgradeNodeState(node, currentShipId, availableIds, pathIds);
          const canChoose = canChooseUpgrade(node, availableIds);
          return (
            <UpgradeTreeNode
              key={node.id}
              node={node}
              state={state}
              requirement={getUpgradeRequirement(node, level, currentShipId)}
              canChoose={canChoose}
              onChoose={onChoose}
              onFocusBranch={() => onFocusBranch(node.branch === "Core" ? null : node.branch)}
              onHover={onNodeHover}
              onLeave={onNodeLeave}
            />
          );
        })}
      </div>
    </div>
  );
}
