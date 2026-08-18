import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

jest.mock('../../lib/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('../../lib/team-context', () => ({ useTeam: jest.fn() }));
// Mocked wholesale (rather than mocking each screen they render) since this
// suite only exercises RootNavigator's session/team gate, not navigation
// inside either stack.
jest.mock('../../navigation/AuthNavigator', () => ({
  AuthNavigator: () =>
    require('react').createElement(require('react-native').Text, null, 'Auth Stack'),
}));
jest.mock('../../navigation/AppNavigator', () => ({
  AppNavigator: () =>
    require('react').createElement(require('react-native').Text, null, 'App Stack'),
}));

import { useAuth } from '../../lib/auth-context';
import { useTeam } from '../../lib/team-context';
import { RootNavigator } from '../../navigation/RootNavigator';

const mockUseAuth = useAuth as jest.Mock;
const mockUseTeam = useTeam as jest.Mock;

function renderRootNavigator() {
  return render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

describe('<RootNavigator />', () => {
  beforeEach(() => {
    mockUseTeam.mockReturnValue({ loading: false });
  });

  it('shows a splash indicator while auth is initializing', async () => {
    mockUseAuth.mockReturnValue({ session: null, initializing: true });

    await renderRootNavigator();

    expect(screen.getByTestId('root-navigator-splash')).toBeTruthy();
  });

  it('renders the auth stack when there is no session', async () => {
    mockUseAuth.mockReturnValue({ session: null, initializing: false });

    await renderRootNavigator();

    expect(screen.getByText('Auth Stack')).toBeTruthy();
  });

  it('shows a splash indicator while the team list is loading', async () => {
    mockUseAuth.mockReturnValue({ session: {} as Session, initializing: false });
    mockUseTeam.mockReturnValue({ loading: true });

    await renderRootNavigator();

    expect(screen.getByTestId('root-navigator-splash')).toBeTruthy();
  });

  it('renders the app stack once session and team state are both ready', async () => {
    mockUseAuth.mockReturnValue({ session: {} as Session, initializing: false });
    mockUseTeam.mockReturnValue({ loading: false });

    await renderRootNavigator();

    expect(screen.getByText('App Stack')).toBeTruthy();
  });
});
