import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

jest.mock('../../components/PushNotificationToggle', () => ({
  PushNotificationToggle: () => null,
}));
jest.mock('../../lib/auth-context', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { HomeScreen } from '../../screens/HomeScreen';

const mockUseAuth = useAuth as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

describe('<HomeScreen />', () => {
  it("renders the signed-in user's email", async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { email: 'coach@example.com' } } as Session,
      initializing: false,
    });

    await render(<HomeScreen />);

    expect(screen.getByText('coach@example.com')).toBeTruthy();
  });

  it('calls supabase.auth.signOut() when the sign out button is pressed', async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { email: 'coach@example.com' } } as Session,
      initializing: false,
    });

    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText('Sign out'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
