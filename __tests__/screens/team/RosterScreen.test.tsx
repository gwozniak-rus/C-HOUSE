import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('../../../lib/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('../../../lib/team-context', () => ({ useTeam: jest.fn() }));
jest.mock('../../../lib/teams-queries', () => ({
  useRoster: jest.fn(),
  useSetMemberStatus: jest.fn(),
  useRemoveMember: jest.fn(),
}));

import { useAuth } from '../../../lib/auth-context';
import { useTeam } from '../../../lib/team-context';
import { useRemoveMember, useRoster, useSetMemberStatus } from '../../../lib/teams-queries';
import { RosterScreen } from '../../../screens/team/RosterScreen';
import type { RosterMember } from '../../../lib/types';

const mockUseAuth = useAuth as jest.Mock;
const mockUseTeam = useTeam as jest.Mock;
const mockUseRoster = useRoster as jest.Mock;
const mockUseSetMemberStatus = useSetMemberStatus as jest.Mock;
const mockUseRemoveMember = useRemoveMember as jest.Mock;

const coach: RosterMember = {
  userId: 'user-coach',
  role: 'coach',
  status: 'active',
  joinedAt: '2026-01-01',
  firstName: 'Dana',
  lastName: 'Whitfield',
  displayName: 'Dana Whitfield',
};

const player: RosterMember = {
  userId: 'user-player',
  role: 'player',
  status: 'active',
  joinedAt: '2026-01-02',
  firstName: 'Marcus',
  lastName: 'Ellery',
  displayName: 'Marcus Ellery',
};

beforeEach(() => {
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-coach' } } as Session });
  mockUseTeam.mockReturnValue({ activeTeamId: 'team-1', isCoach: true });
  mockUseRoster.mockReturnValue({ data: [coach, player], isPending: false });
  mockUseSetMemberStatus.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseRemoveMember.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<RosterScreen />', () => {
  it('shows a coach the mark-inactive and remove actions for each row', async () => {
    await renderWithProviders(<RosterScreen />);

    expect(screen.getByTestId('roster-row-user-player-toggle-status')).toBeTruthy();
    expect(screen.getByTestId('roster-row-user-player-remove')).toBeTruthy();
  });

  it('hides row actions from a player', async () => {
    mockUseTeam.mockReturnValue({ activeTeamId: 'team-1', isCoach: false });

    await renderWithProviders(<RosterScreen />);

    expect(screen.queryByTestId('roster-row-user-player-toggle-status')).toBeNull();
    expect(screen.queryByTestId('roster-row-user-player-remove')).toBeNull();
  });

  it('shows an empty-state message pointing at the invite code when the roster has no one', async () => {
    mockUseRoster.mockReturnValue({ data: [], isPending: false });

    await renderWithProviders(<RosterScreen />);

    expect(
      screen.getByText('No one has joined yet. Share your invite code to get players on the roster.')
    ).toBeTruthy();
  });

  it('marks a player inactive without a confirm step', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseSetMemberStatus.mockReturnValue({ mutateAsync, isPending: false });

    await renderWithProviders(<RosterScreen />);
    await fireEvent.press(screen.getByTestId('roster-row-user-player-toggle-status'));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ userId: 'user-player', status: 'inactive' })
    );
  });

  it('requires confirmation before removing a member, then removes on confirm', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseRemoveMember.mockReturnValue({ mutateAsync, isPending: false });

    await renderWithProviders(<RosterScreen />);
    await fireEvent.press(screen.getByTestId('roster-row-user-player-remove'));

    expect(screen.getByText('Remove Marcus Ellery?')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('roster-remove-confirm-confirm'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('user-player'));
  });

  it('keeps the confirm dialog open and shows the trigger message when removing the last coach fails', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Cannot remove the last coach from a team'));
    mockUseRemoveMember.mockReturnValue({ mutateAsync, isPending: false });

    await renderWithProviders(<RosterScreen />);
    await fireEvent.press(screen.getByTestId('roster-row-user-coach-remove'));
    await fireEvent.press(screen.getByTestId('roster-remove-confirm-confirm'));

    await waitFor(() =>
      expect(screen.getByText('Cannot remove the last coach from a team')).toBeTruthy()
    );
    // Dialog itself stays open on failure -- the confirm button is still there.
    expect(screen.getByTestId('roster-remove-confirm-confirm')).toBeTruthy();
  });
});
