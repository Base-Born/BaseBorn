export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  shipClass: string;
  raceTag?: string;
  isLocalPlayer?: boolean;
  isMothership?: boolean;
  entityType: "player";
}

