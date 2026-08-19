import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth-context";
import { getProfile, updateProfile } from "./profile";
import {
  createTeam,
  ensureInviteCode,
  getRoster,
  listMyTeams,
  redeemInviteCode,
  regenerateInviteCode,
  removeMember,
  setJoiningEnabled,
  setMemberStatus,
} from "./teams";
import type { MemberStatus } from "./types";

// One key namespace for everything team-scoped, so the practice-plan and
// announcement features can hang their own keys off the same team id without
// inventing a second convention.
export const teamKeys = {
  all: ["teams"] as const,
  mine: (userId: string) => ["teams", "mine", userId] as const,
  roster: (teamId: string) => ["teams", "roster", teamId] as const,
  inviteCode: (teamId: string) => ["teams", "invite-code", teamId] as const,
};

export const profileKeys = {
  detail: (userId: string) => ["profile", userId] as const,
};

/** The signed-in user's id, or null while signed out. */
function useUserId(): string | null {
  const { session } = useAuth();
  return session?.user.id ?? null;
}

export function useMyTeams() {
  const userId = useUserId();
  return useQuery({
    queryKey: teamKeys.mine(userId ?? "anonymous"),
    queryFn: () => listMyTeams(userId as string),
    enabled: Boolean(userId),
  });
}

export function useRoster(teamId: string | null) {
  return useQuery({
    queryKey: teamKeys.roster(teamId ?? "none"),
    queryFn: () => getRoster(teamId as string),
    enabled: Boolean(teamId),
  });
}

export function useInviteCode(teamId: string | null, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: teamKeys.inviteCode(teamId ?? "none"),
    queryFn: () => ensureInviteCode(teamId as string, userId as string),
    enabled: enabled && Boolean(teamId) && Boolean(userId),
  });
}

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: profileKeys.detail(userId ?? "anonymous"),
    queryFn: () => getProfile(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      phone?: string | null;
    }) => updateProfile(userId as string, input),
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: profileKeys.detail(userId ?? "anonymous"),
      });
      // Roster rows render the profile's name, so they go stale on a rename.
      client.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useCreateTeam() {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      primaryColor?: string | null;
      secondaryColor?: string | null;
    }) => createTeam({ ...input, createdBy: userId as string }),
    onSuccess: () => client.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useJoinTeam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemInviteCode(code),
    onSuccess: () => client.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useRemoveMember(teamId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(teamId as string, userId),
    onSuccess: () => client.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useSetMemberStatus(teamId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; status: MemberStatus }) =>
      setMemberStatus(teamId as string, input.userId, input.status),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: teamKeys.roster(teamId ?? "none") }),
  });
}

export function useToggleJoining(teamId: string | null) {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { codeId: string; enabled: boolean }) =>
      setJoiningEnabled(input.codeId, input.enabled, userId as string),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: teamKeys.inviteCode(teamId ?? "none"),
      }),
  });
}

export function useRegenerateCode(teamId: string | null) {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (previousCodeId: string | null) =>
      regenerateInviteCode(teamId as string, previousCodeId, userId as string),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: teamKeys.inviteCode(teamId ?? "none"),
      }),
  });
}
