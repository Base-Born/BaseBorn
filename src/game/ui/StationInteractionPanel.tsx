import { RadioTower, ShieldAlert } from "lucide-react";
import type { CargoStorage } from "../data/etherTypes";
import type { StationInteractionSnapshot } from "../types";
import { StationActionButton } from "./StationActionButton";
import { StationResourceRows } from "./StationResourceRows";

export function StationInteractionPanel({
  interaction,
  cargo,
  onPrimaryAction,
  onAction,
  onOpenCommand,
}: {
  interaction: StationInteractionSnapshot;
  cargo: CargoStorage;
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

  const isWarning = interaction.ownershipState !== "unclaimed" && Boolean(interaction.warningText);
  return (
    <aside className={isWarning ? "stationInteraction stationInteraction--warning" : "stationInteraction"}>
      <div className="stationInteraction__main">
        <div className="stationInteraction__icon">
          {interaction.warningText ? <ShieldAlert size={20} /> : <RadioTower size={20} />}
        </div>
        <div>
          <header>
            <strong>{interaction.stationName || "Spacecraft Signal"}</strong>
            <span>{Math.round(interaction.distance)}m</span>
          </header>
          <p>{interaction.stationState} / {interaction.repairStageLabel}</p>
          <div className="stationInteraction__bar"><i style={{ width: `${healthPct}%` }} /></div>
        </div>
      </div>
      <div className="stationInteraction__meta">
        <span>{interaction.defenseStatus}</span>
        {interaction.storageCapacity > 0 && <span>{interaction.storageUsed.toLocaleString()} / {interaction.storageCapacity.toLocaleString()} Ether</span>}
        {interaction.warningText && <b className={isWarning ? "" : "stationInteraction__hint"}>{interaction.warningText}</b>}
      </div>
      {(interaction.docked || interaction.ownershipState === "unclaimed") && (
        <div className="stationInteraction__cargo">
          <section>
            <header>
              <span>Ship Cargo</span>
              <b>{cargo.used.toLocaleString()} / {cargo.capacity.toLocaleString()}</b>
            </header>
            <StationResourceRows ether={cargo.ether} />
          </section>
          {interaction.docked && <section>
            <header>
              <span>Spacecraft Storage</span>
              <b>{interaction.storageUsed.toLocaleString()} / {interaction.storageCapacity.toLocaleString()}</b>
            </header>
            <StationResourceRows ether={interaction.storageEther} />
          </section>}
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
