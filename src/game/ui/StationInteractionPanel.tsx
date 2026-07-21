import { RadioTower, ShieldAlert } from "lucide-react";
import { XP_BY_LEVEL } from "../config";
import type { CargoStorage } from "../data/etherTypes";
import type { StationInteractionSnapshot } from "../types";
import { StationActionButton } from "./StationActionButton";

export function StationInteractionPanel({
  interaction,
  cargo,
  pilot,
  onPrimaryAction,
  onAction,
  onOpenCommand,
}: {
  interaction: StationInteractionSnapshot;
  cargo: CargoStorage;
  pilot: { name: string; level: number; xp: number; nextXp: number; score: number };
  onPrimaryAction: () => void;
  onAction: (actionId: string) => void;
  onOpenCommand: () => void;
}) {
  if (!interaction.visible) return null;
  const healthPct = interaction.ownershipState === "unclaimed"
    ? Math.max(0, Math.min(100, interaction.repairProgress * 100))
    : interaction.maxHealth > 0 ? Math.max(0, Math.min(100, (interaction.health / interaction.maxHealth) * 100)) : 0;
  const actions = interaction.actions
    .filter((action) => action.id !== interaction.primaryAction?.id)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
  const levelStartXp = XP_BY_LEVEL[Math.min(pilot.level, XP_BY_LEVEL.length - 1)] ?? 0;
  const levelSpan = Math.max(1, pilot.nextXp - levelStartXp);
  const xpPercent = Math.max(0, Math.min(100, (pilot.xp - levelStartXp) / levelSpan * 100));
  const xpRemaining = Math.max(0, Math.floor(pilot.nextXp - pilot.xp));

  const isWarning = interaction.ownershipState !== "unclaimed" && Boolean(interaction.warningText);
  const className = ["stationInteraction", interaction.docked && "stationInteraction--docked", isWarning && "stationInteraction--warning"].filter(Boolean).join(" ");
  return (
    <aside className={className}>
      {interaction.docked && <div className="stationInteraction__pilot">
        <div><strong>{pilot.name}</strong><span>Score: {Math.floor(pilot.score).toLocaleString()}</span></div>
        <div className="stationInteraction__xp"><i style={{ width: `${xpPercent}%` }} /></div>
        <small>Lvl {pilot.level}<span>{xpRemaining.toLocaleString()} XP to next level</span></small>
      </div>}
      <div className="stationInteraction__main">
        <div className="stationInteraction__icon">
          {interaction.warningText ? <ShieldAlert size={20} /> : <RadioTower size={20} />}
        </div>
        <div>
          <header>
            <strong>{interaction.stationName || "Spacecraft Signal"}</strong>
            <span>{Math.round(interaction.distance)}m</span>
          </header>
          <p>{interaction.stationState} · {interaction.repairStageLabel}</p>
          <div className="stationInteraction__bar"><i style={{ width: `${healthPct}%` }} /></div>
        </div>
      </div>
      <div className="stationInteraction__meta">
        <span>{interaction.defenseStatus}</span>
        {interaction.storageCapacity > 0 && <span>{interaction.storageUsed.toLocaleString()} / {interaction.storageCapacity.toLocaleString()} Ether</span>}
        {interaction.warningText && <b className={isWarning ? "" : "stationInteraction__hint"}>{interaction.warningText}</b>}
      </div>
      {(interaction.docked || interaction.ownershipState === "unclaimed") && (
        <div className="stationInteraction__cargoSummary">
          <span>Ship Cargo <b>{cargo.used.toLocaleString()} / {cargo.capacity.toLocaleString()}</b></span>
          {interaction.docked && <span>Craft Storage <b>{interaction.storageUsed.toLocaleString()} / {interaction.storageCapacity.toLocaleString()}</b></span>}
        </div>
      )}
      <div className="stationInteraction__actions">
        {actions.map((action) => (
          <StationActionButton
            action={action}
            key={action.id}
            onAction={(actionId) => actionId === "open_command" || actionId === "loadout" || actionId === "defenses" ? onOpenCommand() : onAction(actionId)}
          />
        ))}
        {interaction.primaryAction && (
          <button
            className="stationInteraction__primary"
            disabled={!interaction.primaryAction.enabled}
            title={interaction.primaryAction.lockReason || interaction.primaryAction.label}
            onClick={interaction.primaryAction.id === "open_command" ? onOpenCommand : onPrimaryAction}
          >
            {interaction.primaryAction.label}
            {interaction.primaryAction.hotkey && <kbd>{interaction.primaryAction.hotkey}</kbd>}
          </button>
        )}
      </div>
    </aside>
  );
}
