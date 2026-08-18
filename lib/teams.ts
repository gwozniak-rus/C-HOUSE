import { supabase } from './supabase';
import type {
  InviteCode,
  InviteCodePreview,
  MemberStatus,
  RosterMember,
  Team,
  TeamMembership,
  TeamRole,
} from './types';

// Messages the database raises deliberately for end users -- redeem_invite_code()
// and prevent_last_coach_removal() in
// 20260809224954_teams_membership_invites.sql. Anything not on this list is a
// Postgres/PostgREST internal and must not reach a coach's screen.
const USER_FACING_DB_ERRORS = [
  'Invalid invite code',
  'Invite code has been revoked',
  'Invite code has expired',
  'Invite code has reached its usage limit',
  'Cannot remove the last coach from a team',
] as const;

export function mapSupabaseError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : typeof error === 'string'
        ? error
        : '';

  return USER_FACING_DB_ERRORS.find((known) => message.includes(known)) ?? fallback;
}

/**
 * Teams the given user belongs to. Filtering by user_id is required, not
 * cosmetic: the team_members_select policy grants visibility of *every* member
 * of any team you're on, so an unfiltered select returns teammates too.
 */
export async function listMyTeams(userId: string): Promise<TeamMembership[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role, status, joined_at, teams!inner(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    team: row.teams as Team,
    role: row.role as TeamRole,
    status: row.status as MemberStatus,
    joinedAt: row.joined_at,
  }));
}

/**
 * Creates a team. The on_team_created trigger enrolls the creator as the
 * team's first coach, so the client never writes team_members here. The
 * teams_select_members policy allows created_by = auth.uid() specifically so
 * this INSERT ... RETURNING can read its own row back before that trigger's
 * membership row is visible.
 */
export async function createTeam(input: {
  name: string;
  createdBy: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  timezone?: string;
}): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: input.name.trim(),
      created_by: input.createdBy,
      primary_color: input.primaryColor || null,
      secondary_color: input.secondaryColor || null,
      ...(input.timezone ? { timezone: input.timezone } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function compareRosterMembers(a: RosterMember, b: RosterMember): number {
  if (a.role !== b.role) return a.role === 'coach' ? -1 : 1;
  const aKey = a.lastName ?? a.displayName;
  const bKey = b.lastName ?? b.displayName;
  return aKey.localeCompare(bKey);
}

/**
 * The team's roster. Reading teammate names relies on the
 * profiles_select_teammates policy (shares_team_with), and the embed resolves
 * through the team_members.user_id -> profiles.id foreign key.
 */
export async function getRoster(teamId: string): Promise<RosterMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id, role, status, joined_at, profiles!inner(first_name, last_name, display_name)')
    .eq('team_id', teamId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const profile = row.profiles as {
        first_name: string | null;
        last_name: string | null;
        display_name: string;
      };
      return {
        userId: row.user_id,
        role: row.role as TeamRole,
        status: row.status as MemberStatus,
        joinedAt: row.joined_at,
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.display_name,
      };
    })
    .sort(compareRosterMembers);
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function setMemberStatus(
  teamId: string,
  userId: string,
  status: MemberStatus
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ status })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * A team's current code is simply its most recently created one, revoked or
 * not -- `revoked_at` is the on/off switch for joining, so a paused code still
 * has to be readable in order to be switched back on.
 */
export async function getCurrentInviteCode(teamId: string): Promise<InviteCode | null> {
  const { data, error } = await supabase
    .from('team_invite_codes')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createInviteCode(teamId: string, createdBy: string): Promise<InviteCode> {
  // `code` is populated by the generate_invite_code() column default.
  const { data, error } = await supabase
    .from('team_invite_codes')
    .insert({ team_id: teamId, role: 'player', created_by: createdBy })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Returns the team's current code, minting one if it has never had any. */
export async function ensureInviteCode(teamId: string, createdBy: string): Promise<InviteCode> {
  return (await getCurrentInviteCode(teamId)) ?? (await createInviteCode(teamId, createdBy));
}

/**
 * The joining on/off switch. redeem_invite_code() already rejects a code whose
 * revoked_at is set, so clearing it back to null re-enables the *same* code --
 * which is what a coach expects from a toggle. Changing the code is the
 * separate, explicit regenerate action below.
 */
export async function setJoiningEnabled(
  codeId: string,
  enabled: boolean,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('team_invite_codes')
    .update(
      enabled
        ? { revoked_at: null, revoked_by: null }
        : { revoked_at: new Date().toISOString(), revoked_by: userId }
    )
    .eq('id', codeId);

  if (error) throw error;
}

/**
 * Issues a brand new code and retires the old one. The new row is inserted
 * first so the team is never momentarily without a current code.
 */
export async function regenerateInviteCode(
  teamId: string,
  previousCodeId: string | null,
  userId: string
): Promise<InviteCode> {
  const created = await createInviteCode(teamId, userId);
  if (previousCodeId) {
    await setJoiningEnabled(previousCodeId, false, userId);
  }
  return created;
}

/**
 * Looks up which team a code belongs to without joining it. team_invite_codes
 * is coach-only under RLS, so this has to go through the security-definer
 * preview_invite_code() RPC. Null means invalid, revoked, expired, or full.
 */
export async function previewInviteCode(code: string): Promise<InviteCodePreview | null> {
  const { data, error } = await supabase.rpc('preview_invite_code', {
    p_code: normalizeInviteCode(code),
  });

  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return {
    teamId: row.team_id,
    teamName: row.team_name,
    role: row.role as TeamRole,
  };
}

/** Joins the team behind a code. Returns the joined team's id. */
export async function redeemInviteCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_code: normalizeInviteCode(code),
  });

  if (error) throw error;
  return data;
}

/**
 * Codes are generated from an uppercase alphabet that omits visually
 * ambiguous characters, so a pasted code is safe to upcase and strip.
 */
export function normalizeInviteCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase();
}
