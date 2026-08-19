import { Alert } from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

jest.mock("../../../lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

import { supabase } from "../../../lib/supabase";
import { SignInScreen } from "../../../screens/auth/SignInScreen";

const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;

async function renderScreen() {
  const navigation = { navigate: jest.fn() };
  // SignInScreen only reads `navigation` from its props in this app (no
  // route params), so the rest of NativeStackScreenProps can be omitted.
  const renderResult = await render(
    <SignInScreen navigation={navigation as never} route={{} as never} />,
  );
  return { navigation, ...renderResult };
}

describe("<SignInScreen />", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls signInWithPassword with the entered credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { navigation } = await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText("Email"),
      "coach@example.com",
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText("Password"),
      "hunter2",
    );
    await fireEvent.press(screen.getByTestId("sign-in-submit"));

    await waitFor(() =>
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "coach@example.com",
        password: "hunter2",
      }),
    );
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("shows an alert when sign in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    await renderScreen();

    await fireEvent.press(screen.getByTestId("sign-in-submit"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sign in failed",
        "Invalid credentials",
      ),
    );
  });

  it("navigates to SignUp when the link is pressed", async () => {
    const { navigation } = await renderScreen();

    await fireEvent.press(screen.getByTestId("sign-in-goto-sign-up"));

    expect(navigation.navigate).toHaveBeenCalledWith("SignUp");
  });
});
