import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

jest.mock('../../lib/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('../../screens/HomeScreen', () => ({
  HomeScreen: () =>
    require('react').createElement(require('react-native').Text, null, 'Home Screen'),
}));
jest.mock('../../screens/auth/SignInScreen', () => ({
  SignInScreen: () =>
    require('react').createElement(require('react-native').Text, null, 'Sign In Screen'),
}));
jest.mock('../../screens/auth/SignUpScreen', () => ({
  SignUpScreen: () =>
    require('react').createElement(require('react-native').Text, null, 'Sign Up Screen'),
}));

import { useAuth } from '../../lib/auth-context';
import { RootNavigator } from '../../navigation/RootNavigator';

const mockUseAuth = useAuth as jest.Mock;

function renderRootNavigator() {
  return render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

describe('<RootNavigator />', () => {
  it('shows a splash indicator while initializing', async () => {
    mockUseAuth.mockReturnValue({ session: null, initializing: true });

    await renderRootNavigator();

    expect(screen.getByTestId('root-navigator-splash')).toBeTruthy();
  });

  it('renders the auth stack when there is no session', async () => {
    mockUseAuth.mockReturnValue({ session: null, initializing: false });

    await renderRootNavigator();

    expect(screen.getByText('Sign In Screen')).toBeTruthy();
  });

  it('renders the app stack when there is a session', async () => {
    mockUseAuth.mockReturnValue({ session: {} as Session, initializing: false });

    await renderRootNavigator();

    expect(screen.getByText('Home Screen')).toBeTruthy();
  });
});
