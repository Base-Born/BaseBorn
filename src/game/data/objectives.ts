export type ObjectiveCategory = "discovery" | "station" | "repair" | "cargo" | "crafting" | "hull" | "defense" | "combat" | "exploration" | "mothership" | "hyperdrive" | "team";

export type Objective = {
  id: string;
  title: string;
  description: string;
  priority: number;
  completed: boolean;
  active: boolean;
  category: ObjectiveCategory;
  targetAmount?: number;
  currentAmount?: number;
  nextObjectiveId?: string;
  hint?: string;
};

export function createObjective(args: Omit<Objective, "completed" | "active"> & Partial<Pick<Objective, "completed" | "active">>): Objective {
  return {
    completed: false,
    active: true,
    ...args,
  };
}
