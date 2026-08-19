import type { Tables } from "./database.types";

// role/status/mode are `text` + CHECK constraints in Postgres rather than real
// enums, so the generated types widen them all the way to `string`. These are
// the actual domains -- keep them in sync with the CHECKs in
// 20260809224954_teams_membership_invites.sql and
// 20260816120000_profile_names_and_roster_status.sql.
export type TeamRole = "coach" | "player";
export type MemberStatus = "active" | "inactive";

export type Team = Tables<"teams">;
export type Profile = Tables<"profiles">;
export type InviteCode = Tables<"team_invite_codes">;

/** A team the signed-in user belongs to, plus their standing on it. */
export type TeamMembership = {
  team: Team;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
};

/** One row of a team's roster, flattened from team_members + profiles. */
export type RosterMember = {
  userId: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

/** What a player learns about a code before committing to redeem it. */
export type InviteCodePreview = {
  teamId: string;
  teamName: string;
  role: TeamRole;
};
