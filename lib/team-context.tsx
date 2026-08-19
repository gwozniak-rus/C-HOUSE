import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { useAuth } from "./auth-context";
import { useMyTeams } from "./teams-queries";
import type { Team, TeamMembership, TeamRole } from "./types";

const ACTIVE_TEAM_STORAGE_KEY = "coachhub.activeTeamId";

type TeamContextValue = {
  teams: TeamMembership[];
  activeTeam: Team | null;
  activeTeamId: string | null;
  // The signed-in user's role on the *active* team. Role lives on
  // team_members, never on the profile, so it is per-team by definition -- a
  // user can coach one team and play on another.
  myRole: TeamRole | null;
  isCoach: boolean;
  setActiveTeam: (teamId: string) => void;
  // True until both the persisted team id and the team list have resolved, so
  // the navigator can hold on a splash instead of flashing the "no teams yet"
  // onboarding screen at someone who does have a team.
  loading: boolean;
};

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export function TeamProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { data: teams, isPending } = useMyTeams();
  const [storedTeamId, setStoredTeamId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_TEAM_STORAGE_KEY)
      .then((value) => setStoredTeamId(value))
      .finally(() => setHydrated(true));
  }, []);

  const memberships = useMemo(() => teams ?? [], [teams]);

  // Falls back to the first team when the persisted id names a team the user
  // has since left, or belongs to a different account on a shared device.
  const activeMembership = useMemo(() => {
    if (memberships.length === 0) return null;
    return (
      memberships.find((m) => m.team.id === storedTeamId) ?? memberships[0]
    );
  }, [memberships, storedTeamId]);

  const setActiveTeam = useCallback((teamId: string) => {
    setStoredTeamId(teamId);
    void AsyncStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, teamId);
  }, []);

  const value = useMemo<TeamContextValue>(
    () => ({
      teams: memberships,
      activeTeam: activeMembership?.team ?? null,
      activeTeamId: activeMembership?.team.id ?? null,
      myRole: activeMembership?.role ?? null,
      isCoach: activeMembership?.role === "coach",
      setActiveTeam,
      // The teams query is disabled while signed out, which leaves it pending
      // forever -- so signed-out is never "loading" here.
      loading: Boolean(session) && (!hydrated || isPending),
    }),
    [
      memberships,
      activeMembership,
      setActiveTeam,
      session,
      hydrated,
      isPending,
    ],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
