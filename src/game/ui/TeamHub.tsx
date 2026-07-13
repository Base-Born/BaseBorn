import { Check, Send, Shield, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MultiplayerSnapshot } from "../network/protocol";

export function TeamHub({
  multiplayer,
  onJoin,
  onInvite,
  onAccept,
  onDecline,
}: {
  multiplayer: MultiplayerSnapshot;
  onJoin: (teamId: string) => void;
  onInvite: (playerId: string) => void;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inviteCount = multiplayer.invites.length;
  useEffect(() => {
    if (inviteCount > 0) setOpen(true);
  }, [inviteCount]);

  const currentTeam = multiplayer.teams.find((team) => team.id === multiplayer.teamId) ?? null;
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
                    <button className="teamHubAccept" onClick={() => onAccept(invite.id)}><Check size={15} /> Accept</button>
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
              </article>
            </div>
            <div className="teamHubColumns">
              <div className="teamHubSection">
                <h3>Join a team</h3>
                {multiplayer.teams.filter((team) => team.id !== multiplayer.teamId).map((team) => (
                  <article key={team.id}>
                    <div><strong>{team.name}</strong><small>{team.members.length}/{team.maxMembers} pilots</small></div>
                    <button disabled={team.members.length >= team.maxMembers} onClick={() => onJoin(team.id)}>
                      Join
                    </button>
                  </article>
                ))}
                {multiplayer.teams.length <= 1 && <p className="teamHubEmpty">No other teams online yet.</p>}
              </div>
              <div className="teamHubSection">
                <h3>Invite a pilot</h3>
                {players.filter((player) => player.id !== multiplayer.playerId && player.teamId !== multiplayer.teamId).map((player) => (
                  <article key={player.id}>
                    <div><strong>{player.name}</strong><small>Online</small></div>
                    <button onClick={() => onInvite(player.id)}><Send size={14} /> Invite</button>
                  </article>
                ))}
                {players.filter((player) => player.id !== multiplayer.playerId && player.teamId !== multiplayer.teamId).length === 0 &&
                  <p className="teamHubEmpty">No unaffiliated pilots available.</p>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}