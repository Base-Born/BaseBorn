import { Plus, X } from "lucide-react";
import type { CSSProperties } from "react";
import type { BaseFrameType, BaseShipFrame } from "../data/baseShipFrames";
import { stats, type StatKey } from "../data/stats";
import type { GameSnapshot } from "../types";
import { BaseShipFrameSelectPanel } from "./BaseShipFrameSelectPanel";
import { BuildIdentityPanel } from "./build/BuildIdentityPanel";
import { getUpgradeImpactProfile } from "../data/upgradeImpactProfiles";

export function ShipUpgradePanel({
  snapshot,
  frames,
  onSelectFrame,
  onUpgrade,
  onClose,
}: {
  snapshot: GameSnapshot;
  frames: BaseShipFrame[];
  onSelectFrame: (frameId: BaseFrameType) => void;
  onUpgrade: (key: StatKey) => void;
  onClose: () => void;
}) {
  return (
    <aside className="shipUpgradePanel">
      <header>
        <div>
          <h2>Ship Upgrades</h2>
          <span>Lv {snapshot.level} / {snapshot.baseFrame.name}</span>
        </div>
        <div className="shipUpgradePanel__headerActions">
          <strong>x{snapshot.upgradePoints}</strong>
          <button type="button" className="shipUpgradePanel__close" onClick={onClose} aria-label="Close ship upgrades" title="Close ship upgrades"><X size={18} /></button>
        </div>
      </header>
      <BaseShipFrameSelectPanel frames={frames} selectedFrameId={snapshot.baseFrame.id} onSelect={onSelectFrame} />
      <BuildIdentityPanel build={snapshot.buildIdentity} />
      <div className="shipUpgradeRows">
        {stats.map((stat, index) => {
          const progress = snapshot.shipUpgradeStats.find((entry) => entry.statKey === stat.key);
          const normal = progress?.normalLevel ?? 0;
          const hyper = progress?.hyperLevel ?? 0;
          const locked = progress?.lockReason ?? "";
          const maxed = progress ? progress.totalLevel >= progress.maxNormalLevel + progress.maxHyperLevel : false;
          const impact = getUpgradeImpactProfile(stat.key, Math.min(20, (progress?.totalLevel ?? 0) + 1));
          return (
            <button
              className={hyper > 0 ? "shipUpgradeRow shipUpgradeRow--hyper" : "shipUpgradeRow"}
              disabled={Boolean(locked) || maxed}
              key={stat.key}
              style={{ "--stat-color": stat.color } as CSSProperties}
              title={locked || impact.gameplay + " " + impact.modelChange + " Trade-off: " + impact.drawback}
              onClick={() => onUpgrade(stat.key)}
            >
              <span className="shipUpgradeText">
                <b>{stat.name}</b>
                <small>{locked || impact.modelChange + " · " + impact.drawback + " · " + (progress?.fuelCost ?? 0).toLocaleString() + " Fuel"}</small>
              </span>
              <span className="shipUpgradeKey">[{index + 1}]</span>
              <span className="shipUpgradePips" aria-label={`${normal} normal and ${hyper} hyper`}>
                <span>{Array.from({ length: 10 }, (_, i) => <i className={i < normal ? "filled" : ""} key={`n-${i}`} />)}</span>
                <span className={progress?.isHyperUnlocked ? "hyper unlocked" : "hyper"}>{Array.from({ length: 10 }, (_, i) => <i className={i < hyper ? "filled" : ""} key={`h-${i}`} />)}</span>
              </span>
              <span className="shipUpgradePlus">{maxed ? "MAX" : <Plus size={17} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
