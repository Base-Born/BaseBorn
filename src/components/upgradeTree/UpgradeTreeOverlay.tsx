import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { shipUpgradeTree, type ShipNode } from "../../game/data/shipUpgradeTree";
import { getUpgradeNodeState, getUpgradeRequirement } from "../../game/systems/UpgradeAvailabilitySystem";
import {
  calculateUpgradeTreeLayout,
  getUpgradePathNodeIds,
  type PositionedUpgradeNode,
} from "../../game/systems/UpgradeTreeLayoutSystem";
import { UpgradeNodeTooltip } from "./UpgradeNodeTooltip";
import { UpgradeTreeCanvas, type TreeCamera } from "./UpgradeTreeCanvas";
import "../../styles/upgrade-tree.css";

function getFitZoom() {
  if (typeof window === "undefined") return 0.72;
  return Math.max(0.5, Math.min(0.82, Math.min(window.innerWidth, window.innerHeight) / 1180));
}

export function UpgradeTreeOverlay({
  level,
  currentShipId,
  choices,
  onChoose,
  onClose,
}: {
  level: number;
  currentShipId: string;
  choices: ShipNode[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [camera, setCamera] = useState<TreeCamera>(() => ({ x: 0, y: 0, zoom: getFitZoom() }));
  const [tooltip, setTooltip] = useState<{ node: PositionedUpgradeNode; x: number; y: number } | null>(null);
  const [isOpening, setIsOpening] = useState(true);
  const mode = "overview";
  const availableIds = useMemo(() => new Set(choices.map((choice) => choice.id)), [choices]);
  const pathIds = useMemo(() => getUpgradePathNodeIds(currentShipId, shipUpgradeTree), [currentShipId]);
  const layout = useMemo(() => calculateUpgradeTreeLayout(shipUpgradeTree, { mode, selectedBranch: null, currentShipId }), [currentShipId]);

  useEffect(() => {
    const openingTimer = window.setTimeout(() => setIsOpening(false), 460);
    return () => window.clearTimeout(openingTimer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "escape") onClose();
    };
    const onResize = () => setCamera({ x: 0, y: 0, zoom: getFitZoom() });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [onClose]);

  const handleHover = (node: PositionedUpgradeNode, event: MouseEvent<HTMLButtonElement>) => {
    setTooltip({ node, x: Math.min(window.innerWidth - 330, event.clientX + 18), y: Math.min(window.innerHeight - 260, event.clientY + 14) });
  };

  return (
    <aside className={`upgradeTreeOverlay ${isOpening ? "upgradeTreeOverlay--opening" : ""}`} aria-label="Upgrade tree viewer">
      <div className="radialTreeHint">Hold Y - Release to close</div>
      <UpgradeTreeCanvas
        layout={layout}
        camera={camera}
        mode={mode}
        selectedBranch={null}
        level={level}
        currentShipId={currentShipId}
        availableIds={availableIds}
        pathIds={pathIds}
        onChoose={onChoose}
        onFocusBranch={() => undefined}
        onNodeHover={handleHover}
        onNodeLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <UpgradeNodeTooltip
          node={tooltip.node}
          state={getUpgradeNodeState(tooltip.node, currentShipId, availableIds, pathIds)}
          requirement={getUpgradeRequirement(tooltip.node, level, currentShipId)}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </aside>
  );
}
