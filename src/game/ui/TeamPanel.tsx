import type { GameSnapshot } from "../types";

export function TeamPanel({ snapshot }: { snapshot: GameSnapshot }) {
  const team = snapshot.station.team;
  if (!team) return null;
  return (
    <div className="stationCommandSection">
      <header>
        <div>
          <span>Team</span>
          <strong>{team.name}</strong>
        </div>
        <b className="inviteCode">{team.inviteCode}</b>
      </header>
      <div className="stationCardGrid">
        {team.members.map((member) => (
          <article key={member.playerId}>
            <span>{member.role}</span>
            <strong>{member.name}</strong>
            <p>{member.status} / Hull T{member.currentHullTier}</p>
            <small>{member.contributionStats.etherDeposited.toLocaleString()} Ether deposited</small>
          </article>
        ))}
        {Array.from({ length: Math.max(0, team.maxMembers - team.members.length) }, (_, index) => (
          <article className="locked" key={index}>
            <span>Open Slot</span>
            <strong>Invite Crew</strong>
            <p>Team size {team.members.length}/{team.maxMembers}. Local invite flow can be added here.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
