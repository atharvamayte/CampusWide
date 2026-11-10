import type { Member } from "../data/members";

type MemberCardProps = {
  member: Member;
  onClick: (member: Member) => void;
  unreadCount?: number;
  isCurrentUser?: boolean;
  hasPendingFriendRequest?: boolean;
};

const clubNames: Record<string, string> = {
  ncc: "NCC",
  iste: "ISTE",
  tsdw: "TSDW",
  rotaract: "Rotaract",
  nss: "NSS",
  "green-club": "Green Club"
};

function MemberCard({
  member,
  onClick,
  unreadCount = 0,
  isCurrentUser = false,
  hasPendingFriendRequest = false
}: MemberCardProps) {
  const activeClubs = member.clubs.map(
    (club) => clubNames[club] ?? club
  );

  return (
    <button
      className="member-card"
      onClick={() => onClick(member)}
      type="button"
    >
      <div className="member-avatar">
        {member.initials}
      </div>

      <div className="member-info">
        <strong>
          {member.name}

          {isCurrentUser && (
            <span className="me-label">(ME)</span>
          )}
        </strong>

        <span>{member.role}</span>

        <span className="member-division">
          {member.year} · {member.branch} · Division {member.division}
        </span>

        {activeClubs.length > 0 && (
          <span className="member-active-clubs">
            Active communities: {activeClubs.join(", ")}
          </span>
        )}
      </div>

      {hasPendingFriendRequest && (
        <span
          className="member-request-dot"
          title="Pending friend request"
        />
      )}

      {unreadCount > 0 && (
        <span className="member-unread-badge">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      <span className="member-arrow">→</span>
    </button>
  );
}

export default MemberCard;