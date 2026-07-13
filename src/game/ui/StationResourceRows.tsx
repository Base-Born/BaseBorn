import { ETHER_TYPES } from "../data/etherTypes";

export function StationResourceRows({ ether }: { ether: Record<string, number> }) {
  return (
    <div className="stationResourceRows">
      {Object.entries(ETHER_TYPES).map(([type, meta]) => {
        const amount = ether[type] ?? 0;
        return (
          <div key={type}>
            <i style={{ background: meta.color }} />
            <span>{meta.label.replace(" Ether", "")}</span>
            <b>{Math.floor(amount).toLocaleString()}</b>
          </div>
        );
      })}
    </div>
  );
}

export function getTotalEtherValue(ether: Record<string, number>) {
  const weights: Record<string, number> = { rawEther: 1, refinedEther: 3, chargedEther: 8, radiantEther: 20, primalEther: 55, coreEther: 150 };
  return Object.entries(ether).reduce((sum, [type, amount]) => sum + amount * (weights[type] ?? 1), 0);
}
