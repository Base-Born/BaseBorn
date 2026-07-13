import { Lock } from "lucide-react";
import type { StationInteractionAction } from "../types";

export function StationActionButton({
  action,
  onAction,
}: {
  action: StationInteractionAction;
  onAction: (actionId: string) => void;
}) {
  return (
    <button
      className={action.danger ? "stationActionButton stationActionButton--danger" : "stationActionButton"}
      disabled={!action.enabled}
      title={action.lockReason || action.label}
      onClick={() => onAction(action.id)}
    >
      {!action.enabled && <Lock size={13} />}
      <span>{action.label}</span>
      {action.hotkey && <kbd>{action.hotkey}</kbd>}
    </button>
  );
}
