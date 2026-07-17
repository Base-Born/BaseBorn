import { Factory, Hand, Shield } from "lucide-react";

export function BottomXPBar({
  progress,
  level,
  xp,
  nextXp,
  evolutionReady,
  coreOpen,
  buildsOpen,
  onToggleCore,
  onOpenTree,
  onToggleBuilds,
}: {
  progress: number;
  level: number;
  xp: number;
  nextXp: number;
  evolutionReady: boolean;
  coreOpen: boolean;
  buildsOpen: boolean;
  onToggleCore: () => void;
  onOpenTree: () => void;
  onToggleBuilds: () => void;
}) {
  return (
    <div className="bottomHud">
      <div className="xpMeta">
        <span>Level {level}</span>
        <b>{Math.floor(xp)} / {Math.floor(nextXp)} XP</b>
      </div>
      <div className="xpTrack"><span style={{ width: `${progress}%` }} /></div>
      <div className="hudButtons">
        <button className={coreOpen ? "active" : ""} onClick={onToggleCore}><Factory size={16} /> Ship</button>
        <button className={evolutionReady ? "pulseButton" : ""} title="Interact with nearby spacecraft" onClick={onOpenTree}><Hand size={16} /> F Interact</button>
        <button className={buildsOpen ? "active" : ""} onClick={onToggleBuilds}><Shield size={16} /> Guide</button>
      </div>
    </div>
  );
}
