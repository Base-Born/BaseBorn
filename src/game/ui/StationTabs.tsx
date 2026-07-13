import { Boxes, Fuel, Hammer, Home, Rocket, Shield, Users, Wrench, PlaneLanding, PackageSearch, Ship } from "lucide-react";

export type StationTabId = "overview" | "storage" | "fuel" | "repair" | "defenses" | "crafting" | "ships" | "loadout" | "landing" | "team" | "mothership";

export const stationTabs: Array<{ id: StationTabId; label: string; icon: typeof Home }> = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "storage", label: "Storage", icon: Boxes },
  { id: "fuel", label: "Fuel Conversion", icon: Fuel },
  { id: "repair", label: "Repair", icon: Hammer },
  { id: "defenses", label: "Defenses", icon: Shield },
  { id: "crafting", label: "Crafting", icon: Wrench },
  { id: "ships", label: "Ship Management", icon: Ship },
  { id: "loadout", label: "Loadout", icon: PackageSearch },
  { id: "landing", label: "Landing Pads", icon: PlaneLanding },
  { id: "team", label: "Team", icon: Users },
  { id: "mothership", label: "Hyperdrive", icon: Rocket },
];

export function StationTabs({
  active,
  onChange,
}: {
  active: StationTabId;
  onChange: (tab: StationTabId) => void;
}) {
  return (
    <nav className="stationTabs">
      {stationTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button className={active === tab.id ? "active" : ""} key={tab.id} onClick={() => onChange(tab.id)}>
            <Icon size={15} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
