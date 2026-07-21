import { clamp, lerp } from "../math";
import type { EtherType } from "../data/etherTypes";
import type { Customization } from "../types";
import type {
  MultiplayerSnapshot,
  MultiplayerStatus,
  NetworkDestroyedAsteroid,
  NetworkEtherDropState,
  NetworkPlayerState,
  NetworkPlayerProfile,
  NetworkProjectileState,
  NetworkStationState,
  NetworkTeam,
  NetworkTeamInvite,
  RemotePlayerState,
  TeamSpawn,
} from "./protocol";

type LocalState = Omit<NetworkPlayerState, "id" | "name" | "customization" | "updatedAt">;
type LootAward = { dropId: string; etherType: EtherType; amount: number };

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private reconnectTimer = 0;
  private reconnectAttempt = 0;
  private destroyed = false;
  private lastSentAt = 0;
  private lastStationDriveAt = 0;
  private lastStationDrive = { stationId: "", x: 0, y: 0 };
  private localState: LocalState | null = null;
  private remotes = new Map<string, RemotePlayerState>();
  private stations: NetworkStationState[] = [];
  private drops: NetworkEtherDropState[] = [];
  private destroyedAsteroids: NetworkDestroyedAsteroid[] = [];
  private projectiles: NetworkProjectileState[] = [];
  private teams: NetworkTeam[] = [];
  private invites: NetworkTeamInvite[] = [];
  private lootAwards: LootAward[] = [];
  private respawnSpawn: { x: number; y: number } | null = null;
  private teamSpawn: TeamSpawn | null = null;
  private authoritativeHealthRatio: number | null = null;
  private authoritativeProfile: NetworkPlayerProfile | null = null;
  private status: MultiplayerStatus = "offline";
  private message = "Offline";
  private actionError = "";
  private playerId: string | null = null;
  private teamId: string | null = null;
  private joinedWorld = false;
  readonly room = "public";
  private readonly sessionId = MultiplayerClient.getSessionId();

  constructor(private customization: Customization, private onWorldJoined?: (world: { id: string; seed: number; spawn: { x: number; y: number } }) => void) {}

  connect() {
    if (this.destroyed || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.setStatus(this.reconnectAttempt ? "reconnecting" : "connecting", this.reconnectAttempt ? "Reconnecting to world" : "Connecting to world");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(`${protocol}//${window.location.host}/multiplayer`);
    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.send({ type: "join", room: this.room, sessionId: this.sessionId, customization: this.customization, state: this.joinedWorld ? this.localState : null });
    });
    this.socket.addEventListener("message", (event) => this.onMessage(event.data));
    this.socket.addEventListener("close", () => this.onClose());
    this.socket.addEventListener("error", () => this.setStatus("error", "Multiplayer link interrupted"));
  }

  updateLocalState(state: LocalState, now = performance.now()) {
    this.localState = state;
    if (this.socket?.readyState !== WebSocket.OPEN || !this.playerId || now - this.lastSentAt < 50) return;
    this.lastSentAt = now;
    this.send({ type: "state", state });
  }

  updateInterpolation(dt: number) {
    const blend = 1 - Math.pow(0.001, Math.min(dt, 0.1));
    const now = performance.now();
    for (const remote of this.remotes.values()) {
      const extrapolation = clamp((now - remote.receivedAt) / 1000, 0, 0.12);
      const targetX = remote.x + remote.vx * extrapolation;
      const targetY = remote.y + remote.vy * extrapolation;
      remote.renderX = lerp(remote.renderX, targetX, blend);
      remote.renderY = lerp(remote.renderY, targetY, blend);
      const delta = Math.atan2(Math.sin(remote.angle - remote.renderAngle), Math.cos(remote.angle - remote.renderAngle));
      remote.renderAngle += delta * blend;
    }
  }

  getRemotePlayers() { return [...this.remotes.values()]; }
  getSharedStations() { return this.stations; }
  getSharedDrops() { return this.drops; }
  getDestroyedAsteroids() { return this.destroyedAsteroids; }
  getProjectiles() { return this.projectiles.filter((projectile) => projectile.ownerId !== this.playerId); }
  getTeams() { return this.teams; }
  getTeamId() { return this.teamId; }
  isOnline() { return this.status === "online" && Boolean(this.playerId); }
  consumeLootAwards() { return this.lootAwards.splice(0); }
  consumeRespawnSpawn() { const spawn = this.respawnSpawn; this.respawnSpawn = null; return spawn; }
  consumeTeamSpawn() { const spawn = this.teamSpawn; this.teamSpawn = null; return spawn; }
  consumeAuthoritativeHealthRatio() { const ratio = this.authoritativeHealthRatio; this.authoritativeHealthRatio = null; return ratio; }
  consumeAuthoritativeProfile() { const profile = this.authoritativeProfile; this.authoritativeProfile = null; return profile; }

  getSnapshot(): MultiplayerSnapshot {
    return {
      status: this.status,
      room: this.room,
      playerId: this.playerId,
      playerCount: this.remotes.size + (this.playerId ? 1 : 0),
      message: this.message,
      teamId: this.teamId,
      teams: this.teams,
      invites: this.invites,
      actionError: this.actionError,
    };
  }

  requestRespawn() { this.send({ type: "request_respawn" }); }
  fire(angle: number) { this.send({ type: "fire", angle }); }
  driveStation(stationId: string, movement: { x: number; y: number }, now = performance.now()) {
    const x = clamp(movement.x, -1, 1);
    const y = clamp(movement.y, -1, 1);
    const changed = stationId !== this.lastStationDrive.stationId || Math.abs(x - this.lastStationDrive.x) > 0.01 || Math.abs(y - this.lastStationDrive.y) > 0.01;
    if (!changed && now - this.lastStationDriveAt < 50) return;
    this.lastStationDriveAt = now;
    this.lastStationDrive = { stationId, x, y };
    this.send({ type: "station_input", stationId, x, y });
  }
  dropCargo(etherType: EtherType, amount: number) { this.send({ type: "drop_cargo", etherType, amount }); }
  requestLootPickup(dropId: string, amount: number) { this.send({ type: "pickup_drop", dropId, amount }); }
  reportAsteroidDestroyed(args: { asteroidId: string; x: number; y: number; etherType: EtherType; amount: number; respawnMs: number }) {
    this.send({ type: "asteroid_destroyed", ...args });
  }
  claimStation(stationId: string) { this.send({ type: "claim_station", stationId }); }
  renameStation(stationId: string, name: string) { this.send({ type: "rename_station", stationId, name }); }
  joinTeam(teamId: string, spawnAtBase = true) { this.send({ type: "join_team", teamId, spawnAtBase }); }
  invitePlayer(playerId: string) { this.send({ type: "invite_player", playerId }); }
  acceptInvite(inviteId: string, spawnAtBase = true) { this.send({ type: "accept_invite", inviteId, spawnAtBase }); }
  declineInvite(inviteId: string) { this.send({ type: "decline_invite", inviteId }); }
  leaveTeam() { this.send({ type: "leave_team" }); }
  removeMember(playerId: string) { this.send({ type: "remove_member", playerId }); }
  transferLeadership(playerId: string) { this.send({ type: "transfer_leader", playerId }); }

  destroy() {
    this.destroyed = true;
    window.clearTimeout(this.reconnectTimer);
    this.socket?.close(1000, "Client leaving");
    this.socket = null;
    this.remotes.clear();
  }

  private send(payload: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }

  private onMessage(raw: unknown) {
    let message: {
      type?: string;
      playerId?: string;
      room?: string;
      worldId?: string;
      worldSeed?: number;
      spawn?: { x?: number; y?: number };
      respawn?: { x?: number; y?: number };
      stationId?: string | null;
      players?: NetworkPlayerState[];
      stations?: NetworkStationState[];
      drops?: NetworkEtherDropState[];
      destroyedAsteroids?: NetworkDestroyedAsteroid[];
      projectiles?: NetworkProjectileState[];
      teams?: NetworkTeam[];
      teamId?: string | null;
      invites?: NetworkTeamInvite[];
      dropId?: string;
      etherType?: EtherType;
      amount?: number;
      message?: string;
      healthRatio?: number;
      profile?: NetworkPlayerProfile;
    };
    try { message = JSON.parse(String(raw)); } catch { return; }
    if (message.type === "welcome" && message.playerId) {
      this.playerId = message.playerId;
      if (message.profile) this.authoritativeProfile = message.profile;
      if (!this.joinedWorld && message.worldId && Number.isFinite(message.worldSeed) && Number.isFinite(message.spawn?.x) && Number.isFinite(message.spawn?.y)) {
        this.joinedWorld = true;
        this.onWorldJoined?.({ id: message.worldId, seed: message.worldSeed as number, spawn: { x: message.spawn?.x as number, y: message.spawn?.y as number } });
      }
      this.setStatus("online", "BaseBorn Prime linked");
      return;
    }
    if (message.type === "respawn" && Number.isFinite(message.respawn?.x) && Number.isFinite(message.respawn?.y)) {
      this.respawnSpawn = { x: message.respawn?.x as number, y: message.respawn?.y as number };
      return;
    }
    if (message.type === "team_spawn" && Number.isFinite(message.spawn?.x) && Number.isFinite(message.spawn?.y)) {
      this.teamSpawn = { x: message.spawn?.x as number, y: message.spawn?.y as number, stationId: message.stationId ?? null };
      return;
    }
    if (message.type === "team_changed") {
      this.teamId = typeof message.teamId === "string" ? message.teamId : null;
      return;
    }
    if (message.type === "error") { this.setStatus("error", message.message || "Multiplayer error"); return; }
    if (message.type === "action_error") { this.actionError = message.message || "Action unavailable."; return; }
    if (message.type === "loot_collected" && message.dropId && message.etherType && Number.isFinite(message.amount)) {
      this.lootAwards.push({ dropId: message.dropId, etherType: message.etherType, amount: Math.max(0, Math.floor(message.amount as number)) });
      return;
    }
    if (message.type === "player_damaged" && Number.isFinite(message.healthRatio)) {
      this.authoritativeHealthRatio = clamp(message.healthRatio as number, 0, 1);
      return;
    }
    if (message.type === "progression_update" && message.profile) {
      this.authoritativeProfile = message.profile;
      return;
    }
    if (message.type !== "snapshot" || !Array.isArray(message.players)) return;

    const now = performance.now();
    const seen = new Set<string>();
    for (const state of message.players) {
      if (!state || typeof state.id !== "string" || state.id === this.playerId) continue;
      seen.add(state.id);
      const existing = this.remotes.get(state.id);
      this.remotes.set(state.id, {
        ...state,
        renderX: existing?.renderX ?? state.x,
        renderY: existing?.renderY ?? state.y,
        renderAngle: existing?.renderAngle ?? state.angle,
        receivedAt: now,
      });
    }
    for (const id of this.remotes.keys()) if (!seen.has(id)) this.remotes.delete(id);
    this.stations = Array.isArray(message.stations) ? message.stations : [];
    this.drops = Array.isArray(message.drops) ? message.drops : [];
    this.destroyedAsteroids = Array.isArray(message.destroyedAsteroids) ? message.destroyedAsteroids : [];
    this.projectiles = Array.isArray(message.projectiles) ? message.projectiles : [];
    this.teams = Array.isArray(message.teams) ? message.teams : [];
    this.teamId = typeof message.teamId === "string" ? message.teamId : null;
    this.invites = Array.isArray(message.invites) ? message.invites : [];
    this.actionError = "";
  }

  private onClose() {
    this.socket = null;
    this.playerId = null;
    this.teamId = null;
    this.remotes.clear();
    if (this.destroyed) return;
    this.reconnectAttempt += 1;
    this.setStatus("reconnecting", "Sector link lost; reconnecting");
    const delay = Math.min(10_000, 500 * 2 ** Math.min(this.reconnectAttempt, 5)) + Math.random() * 400;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private setStatus(status: MultiplayerStatus, message: string) {
    this.status = status;
    this.message = message;
  }

  private static getSessionId() {
    const key = "baseborn.multiplayer.session";
    const existing = window.localStorage.getItem(key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  }
}
