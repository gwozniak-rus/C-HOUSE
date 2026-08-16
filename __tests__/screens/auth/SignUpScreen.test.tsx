import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signUp: jest.fn() } },
}));

import { supabase } from '../../../lib/supabase';
import { SignUpScreen } from '../../../screens/auth/SignUpScreen';

const mockSignUp = supabase.auth.signUp as jest.Mock;

async function renderScreen() {
  const navigation = { navigate: jest.fn() };
  const renderResult = await render(
    <SignUpScreen navigation={navigation as never} route={{} as never} />
  );
  return { navigation, ...renderResult };
}

describe('<SignUpScreen />', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls signUp with the entered fields and shows a confirmation alert on success', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await renderScreen();

    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Alex Coach');
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'alex@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'hunter2');
    await fireEvent.press(screen.getByTestId('sign-up-submit'));

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'hunter2',
        options: { data: { display_name: 'Alex Coach' } },
      })
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Check your email',
      'Confirm your address to finish signing up.'
    );
  });

  it('shows an alert and no confirmation when sign up fails', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already registered' } });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('sign-up-submit'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Sign up failed', 'Email already registered')
    );
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('navigates to SignIn when the link is pressed', async () => {
    const { navigation } = await renderScreen();

    await fireEvent.press(screen.getByTestId('sign-up-goto-sign-in'));

    expect(navigation.navigate).toHaveBeenCalledWith('SignIn');
  });
});
