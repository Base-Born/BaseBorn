import type { EtherType } from "../data/etherTypes";
import type { Customization } from "../types";

export type MultiplayerStatus = "offline" | "connecting" | "online" | "reconnecting" | "error";
export type NetworkPlayerState = {
  id: string;
  name: string;
  customization: Customization;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  healthRatio: number;
  level: number;
  score: number;
  shipClassId: string;
  shipClass: string;
  docked: boolean;
  updatedAt: number;
};
export type RemotePlayerState = NetworkPlayerState & {
  renderX: number;
  renderY: number;
  renderAngle: number;
  receivedAt: number;
};
export type NetworkStationState = {
  id: string;
  name: string;
  x: number;
  y: number;
  claimState: "unclaimed" | "claimed";
  ownerTeamId: string | null;
  ownerPlayerId: string | null;
  level: number;
  health: number;
  maxHealth: number;
  isMobile: boolean;
  mothershipUnlocked: boolean;
};
export type NetworkEtherDropState = {
  id: string;
  type: EtherType;
  amount: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  createdAt: number;
  pickupDelayMs: number;
  expiresAt: number;
  ownerId?: string;
};
export type NetworkDestroyedAsteroid = { id: string; until: number };
export type NetworkTeamMember = { id: string; name: string; online: boolean };
export type NetworkTeam = {
  id: string;
  name: string;
  leaderPlayerId: string;
  memberIds: string[];
  members: NetworkTeamMember[];
  maxMembers: number;
  stationId: string | null;
  createdAt: number;
};
export type NetworkTeamInvite = {
  id: string;
  teamId: string;
  teamName: string;
  invitedByPlayerId: string;
  invitedByName: string;
  targetPlayerId: string;
  createdAt: number;
  expiresAt: number;
};
export type MultiplayerSnapshot = {
  status: MultiplayerStatus;
  room: string;
  playerId: string | null;
  playerCount: number;
  message: string;
  teamId: string | null;
  teams: NetworkTeam[];
  invites: NetworkTeamInvite[];
  actionError: string;
};
