import { Plus, X } from "lucide-react";
import type { CSSProperties } from "react";
import { stats, type StatKey } from "../data/stats";
import type { GameSnapshot } from "../types";
import { getUpgradeImpactProfile } from "../data/upgradeImpactProfiles";

export function ShipUpgradePanel({
  snapshot,
  onUpgrade,
  onClose,
}: {
  snapshot: GameSnapshot;
  onUpgrade: (key: StatKey) => void;
  onClose: () => void;
}) {
  return (
    <aside className="shipUpgradePanel">
      <header>
        <div>
          <h2>Core Tuning</h2>
          <span>Level {snapshot.level} · earned level points</span>
        </div>
        <div className="shipUpgradePanel__headerActions">
          <strong>x{snapshot.upgradePoints}</strong>
          <button type="button" className="shipUpgradePanel__close" onClick={onClose} aria-label="Close core tuning" title="Close core tuning"><X size={18} /></button>
        </div>
      </header>
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
              title={locked || `${impact.gameplay} ${impact.modelChange}`}
              onClick={() => onUpgrade(stat.key)}
            >
              <span className="shipUpgradeText">
                <b>{stat.name}</b>
                <small>{locked || impact.gameplay}</small>
              </span>
              <span className="shipUpgradeKey">[{index + 1}]</span>
              <span className="shipUpgradePips" aria-label={`${normal} normal and ${hyper} hyper ranks`}>
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
