export type InputContext = "gameplay" | "station_control" | "mothership_control" | "galactic_station_control" | "docking" | "UI_modal" | "text_input";

export class InputContextManager {
  private context: InputContext = "gameplay";
  set(next: InputContext) { this.context = next; }
  get() { return this.context; }
  allowsGameplay() { return !["UI_modal", "text_input", "docking"].includes(this.context); }
}
