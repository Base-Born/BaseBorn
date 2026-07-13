import { Check, Crown, LogOut, Send, Shield, UserMinus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MultiplayerSnapshot } from "../network/protocol";

export function TeamHub({
  multiplayer,
  onJoin,
  onInvite,
  onAccept,
  onDecline,
  onLeave,
  onRemove,
  onTransfer,
}: {
  multiplayer: MultiplayerSnapshot;
  onJoin: (teamId: string, spawnAtBase: boolean) => void;
  onInvite: (playerId: string) => void;
  onAccept: (inviteId: string, spawnAtBase: boolean) => void;
  onDecline: (inviteId: string) => void;
  onLeave: () => void;
  onRemove: (playerId: string) => void;
  onTransfer: (playerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [spawnAtBase, setSpawnAtBase] = useState(true);
  const inviteCount = multiplayer.invites.length;
  useEffect(() => {
    if (inviteCount > 0) setOpen(true);
  }, [inviteCount]);

  const currentTeam = multiplayer.teams.find((team) => team.id === multiplayer.teamId) ?? null;
  const isLeader = currentTeam?.leaderPlayerId === multiplayer.playerId;
  const players = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; teamId: string }>();
    multiplayer.teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.online) unique.set(member.id, { id: member.id, name: member.name, teamId: team.id });
      });
    });
    return [...unique.values()];
  }, [multiplayer.teams]);

  return (
    <>
      <button className="teamHubButton" onClick={() => setOpen(true)} aria-label="Open team hub">
        <Users size={17} />
        Teams
        {inviteCount > 0 && <b>{inviteCount}</b>}
      </button>
      {open && (
        <div className="teamHubBackdrop">
          <section className="teamHubPanel" role="dialog" aria-modal="true" aria-label="Team hub">
            <header>
              <div>
                <span>Sector Network</span>
                <strong>Team Hub</strong>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close team hub"><X size={18} /></button>
            </header>
            {multiplayer.actionError && <p className="teamHubError">{multiplayer.actionError}</p>}
            {multiplayer.invites.length > 0 && (
              <div className="teamHubSection teamHubInvites">
                <h3>Team invitations</h3>
                {multiplayer.invites.map((invite) => (
                  <article key={invite.id}>
                    <div><strong>{invite.teamName}</strong><small>Invited by {invite.invitedByName}</small></div>
                    <button className="teamHubAccept" onClick={() => onAccept(invite.id, spawnAtBase)}><Check size={15} /> Accept</button>
                    <button onClick={() => onDecline(invite.id)}><X size={15} /> Decline</button>
                  </article>
                ))}
              </div>
            )}
            <div className="teamHubSection">
              <h3>Your team</h3>
              <article>
                <Shield size={18} />
                <div>
                  <strong>{currentTeam?.name ?? "Connecting..."}</strong>
                  <small>{currentTeam?.members.length ?? 0}/{currentTeam?.maxMembers ?? 6} pilots</small>
                </div>
                {currentTeam && <button className="teamHubLeave" disabled={isLeader && currentTeam.members.length > 1} title={isLeader && currentTeam.members.length > 1 ? "Transfer leadership before leaving" : "Leave team"} onClick={onLeave}><LogOut size={14} /> Leave</button>}
              </article>
              {currentTeam && (
                <div className="teamHubMembers">
                  {currentTeam.members.map((member) => (
                    <article key={member.id}>
                      {member.id === currentTeam.leaderPlayerId ? <Crown size={15} className="teamHubLeaderIcon" /> : <Users size={15} />}
                      <div><strong>{member.name}{member.id === multiplayer.playerId ? " (you)" : ""}</strong><small>{member.id === currentTeam.leaderPlayerId ? "Team leader" : member.online ? "Online" : "Offline"}</small></div>
                      {isLeader && member.id !== multiplayer.playerId && member.online && <>
                        <button title="Transfer leadership" onClick={() => onTransfer(member.id)}><Crown size={13} /></button>
                        <button title="Remove member" onClick={() => onRemove(member.id)}><UserMinus size={13} /></button>
                      </>}
                    </article>
                  ))}
                </div>
              )}
              <label className="teamHubSpawnChoice"><input type="checkbox" checked={spawnAtBase} onChange={(event) => setSpawnAtBase(event.target.checked)} /> Spawn next to team base when joining</label>
            </div>
            <div className="teamHubColumns">
              <div className="teamHubSection">
                <h3>Join a team</h3>
                {multiplayer.teams.filter((team) => team.id !== multiplayer.teamId).map((team) => (
                  <article key={team.id}>
                    <div><strong>{team.name}</strong><small>{team.members.length}/{team.maxMembers} pilots</small></div>
                    <button disabled={team.members.length >= team.maxMembers} onClick={() => onJoin(team.id, spawnAtBase)}>
                      Join
                    </button>
                  </article>
                ))}
                {multiplayer.teams.length <= 1 && <p className="teamHubEmpty">No other teams online yet.</p>}
              </div>
              <div className="teamHubSection">
                <h3>Invite a pilot</h3>
                {!isLeader && <p className="teamHubEmpty">Only the team leader can invite pilots.</p>}
                {isLeader && players.filter((player) => player.id !== multiplayer.playerId && player.teamId !== multiplayer.teamId).map((player) => (
                  <article key={player.id}>
                    <div><strong>{player.name}</strong><small>Online</small></div>
                    <button onClick={() => onInvite(player.id)}><Send size={14} /> Invite</button>
                  </article>
                ))}
                {isLeader && players.filter((player) => player.id !== multiplayer.playerId && player.teamId !== multiplayer.teamId).length === 0 &&
                  <p className="teamHubEmpty">No unaffiliated pilots available.</p>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
