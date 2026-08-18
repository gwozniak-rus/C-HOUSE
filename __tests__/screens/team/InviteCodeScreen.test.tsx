import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock('../../../lib/team-context', () => ({ useTeam: jest.fn() }));
jest.mock('../../../lib/teams-queries', () => ({
  useInviteCode: jest.fn(),
  useToggleJoining: jest.fn(),
  useRegenerateCode: jest.fn(),
}));

import * as Clipboard from 'expo-clipboard';
import { useTeam } from '../../../lib/team-context';
import { useInviteCode, useRegenerateCode, useToggleJoining } from '../../../lib/teams-queries';
import { InviteCodeScreen } from '../../../screens/team/InviteCodeScreen';

const mockUseTeam = useTeam as jest.Mock;
const mockUseInviteCode = useInviteCode as jest.Mock;
const mockUseToggleJoining = useToggleJoining as jest.Mock;
const mockUseRegenerateCode = useRegenerateCode as jest.Mock;

const activeCode = {
  id: 'code-1',
  code: 'HJKM2345',
  revoked_at: null,
  revoked_by: null,
};

beforeEach(() => {
  mockUseTeam.mockReturnValue({ activeTeam: { id: 'team-1', name: 'Riverside Rays' }, activeTeamId: 'team-1' });
  mockUseInviteCode.mockReturnValue({ data: activeCode, isPending: false });
  mockUseToggleJoining.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseRegenerateCode.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<InviteCodeScreen />', () => {
  it('shows the current code and reflects an active code as accepting players', async () => {
    await renderWithProviders(<InviteCodeScreen />);

    expect(screen.getByTestId('invite-code-value')).toHaveTextContent('HJKM2345');
    expect(screen.getByTestId('invite-code-toggle').props.value).toBe(true);
  });

  it('reflects a revoked code as paused', async () => {
    mockUseInviteCode.mockReturnValue({
      data: { ...activeCode, revoked_at: '2026-08-16T00:00:00Z' },
      isPending: false,
    });

    await renderWithProviders(<InviteCodeScreen />);

    expect(screen.getByTestId('invite-code-toggle').props.value).toBe(false);
    expect(
      screen.getByText('This code is paused -- no one can join with it right now.')
    ).toBeTruthy();
  });

  it('copies the code to the clipboard', async () => {
    await renderWithProviders(<InviteCodeScreen />);

    await fireEvent.press(screen.getByTestId('invite-code-copy'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('HJKM2345');
    await waitFor(() => expect(screen.getByTestId('invite-code-copied')).toBeTruthy());
  });

  it('toggles joining off, calling the mutation with the code id', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseToggleJoining.mockReturnValue({ mutateAsync, isPending: false });

    await renderWithProviders(<InviteCodeScreen />);
    await fireEvent(screen.getByTestId('invite-code-toggle'), 'valueChange', false);

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ codeId: 'code-1', enabled: false })
    );
  });

  it('requires confirmation before regenerating, then regenerates with the previous code id', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseRegenerateCode.mockReturnValue({ mutateAsync, isPending: false });

    await renderWithProviders(<InviteCodeScreen />);
    await fireEvent.press(screen.getByTestId('invite-code-regenerate'));

    expect(screen.getByText('Regenerate the invite code?')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('invite-code-regenerate-confirm-confirm'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('code-1'));
  });
});
