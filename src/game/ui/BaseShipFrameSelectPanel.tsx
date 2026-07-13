import type { BaseFrameType, BaseShipFrame } from "../data/baseShipFrames";
import type { CSSProperties } from "react";

export function BaseShipFrameSelectPanel({
  frames,
  selectedFrameId,
  onSelect,
}: {
  frames: BaseShipFrame[];
  selectedFrameId: BaseFrameType;
  onSelect: (frameId: BaseFrameType) => void;
}) {
  return (
    <section className="baseFrameSelect">
      <header>
        <b>Base Frame</b>
        <span>{frames.find((frame) => frame.id === selectedFrameId)?.name}</span>
      </header>
      <div className="baseFrameGrid">
        {frames.map((frame) => (
          <button
            className={frame.id === selectedFrameId ? "baseFrameCard selected" : "baseFrameCard"}
            key={frame.id}
            onClick={() => onSelect(frame.id)}
            style={{ "--frame-color": frame.visualTheme.glow } as CSSProperties}
          >
            <strong>{frame.name}</strong>
            <span>{frame.role}</span>
          </button>
        ))}
      </div>
      <small className="baseFrameSummary">{frames.find((frame) => frame.id === selectedFrameId)?.frameBonuses.join(" / ")}</small>
    </section>
  );
}
