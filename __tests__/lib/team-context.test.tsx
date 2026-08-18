import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

jest.mock('../../lib/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('../../lib/teams-queries', () => ({ useMyTeams: jest.fn() }));

import { useAuth } from '../../lib/auth-context';
import { TeamProvider, useTeam } from '../../lib/team-context';
import { useMyTeams } from '../../lib/teams-queries';
import type { TeamMembership } from '../../lib/types';

const mockUseAuth = useAuth as jest.Mock;
const mockUseMyTeams = useMyTeams as jest.Mock;

function membership(id: string, role: 'coach' | 'player' = 'coach'): TeamMembership {
  return {
    team: { id, name: `Team ${id}` } as TeamMembership['team'],
    role,
    status: 'active',
    joinedAt: '2026-01-01',
  };
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } as Session });
  AsyncStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useTeam', () => {
  it('throws when called outside a TeamProvider', async () => {
    await expect(renderHook(() => useTeam())).rejects.toThrow(
      'useTeam must be used within a TeamProvider'
    );
  });

  it('is loading while signed in and the teams query is still pending', async () => {
    mockUseMyTeams.mockReturnValue({ data: undefined, isPending: true });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });

    expect(result.current.loading).toBe(true);
  });

  it('is never loading while signed out, even if the teams query looks pending', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    mockUseMyTeams.mockReturnValue({ data: undefined, isPending: true });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });

    expect(result.current.loading).toBe(false);
  });

  it('defaults to the first team when nothing was previously persisted', async () => {
    mockUseMyTeams.mockReturnValue({ data: [membership('team-1'), membership('team-2')], isPending: false });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeTeamId).toBe('team-1');
    expect(result.current.isCoach).toBe(true);
  });

  it('restores the persisted active team on mount', async () => {
    await AsyncStorage.setItem('coachhub.activeTeamId', 'team-2');
    mockUseMyTeams.mockReturnValue({
      data: [membership('team-1'), membership('team-2', 'player')],
      isPending: false,
    });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });

    await waitFor(() => expect(result.current.activeTeamId).toBe('team-2'));
    expect(result.current.myRole).toBe('player');
  });

  it('falls back to the first team when the persisted id no longer matches any membership', async () => {
    await AsyncStorage.setItem('coachhub.activeTeamId', 'team-gone');
    mockUseMyTeams.mockReturnValue({ data: [membership('team-1')], isPending: false });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });

    await waitFor(() => expect(result.current.activeTeamId).toBe('team-1'));
  });

  it('setActiveTeam updates state and persists the choice', async () => {
    mockUseMyTeams.mockReturnValue({ data: [membership('team-1'), membership('team-2')], isPending: false });

    const { result } = await renderHook(() => useTeam(), { wrapper: TeamProvider });
    await waitFor(() => expect(result.current.activeTeamId).toBe('team-1'));

    await act(async () => {
      result.current.setActiveTeam('team-2');
    });

    await waitFor(() => expect(result.current.activeTeamId).toBe('team-2'));
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('coachhub.activeTeamId')).toBe('team-2')
    );
  });
});
