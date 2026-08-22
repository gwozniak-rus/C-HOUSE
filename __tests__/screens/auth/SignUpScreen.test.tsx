import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

jest.mock("../../../lib/supabase", () => ({
  supabase: { auth: { signUp: jest.fn() } },
}));

import { supabase } from "../../../lib/supabase";
import { SignUpScreen } from "../../../screens/auth/SignUpScreen";

const mockSignUp = supabase.auth.signUp as jest.Mock;

async function renderScreen() {
  const navigation = { navigate: jest.fn() };
  const renderResult = await render(
    <SignUpScreen navigation={navigation as never} route={{} as never} />,
  );
  return { navigation, ...renderResult };
}

describe("<SignUpScreen />", () => {
  it("calls signUp with the entered fields and shows an inline confirmation on success", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText("First name"),
      "Alex",
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText("Last name"),
      "Coach",
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText("Email"),
      "alex@example.com",
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText("Password"),
      "hunter2",
    );
    await fireEvent.press(screen.getByTestId("sign-up-submit"));

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "alex@example.com",
        password: "hunter2",
        options: { data: { first_name: "Alex", last_name: "Coach" } },
      }),
    );
    expect(
      screen.getByText(
        "Check your email to confirm your address and finish signing up.",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId("sign-up-error")).toBeNull();
  });

  it("shows an inline error and no confirmation when sign up fails", async () => {
    mockSignUp.mockResolvedValue({
      error: { message: "Email already registered" },
    });
    await renderScreen();

    await fireEvent.press(screen.getByTestId("sign-up-submit"));

    await waitFor(() =>
      expect(screen.getByText("Email already registered")).toBeTruthy(),
    );
    expect(screen.queryByTestId("sign-up-confirmation")).toBeNull();
  });

  it("navigates to SignIn when the link is pressed", async () => {
    const { navigation } = await renderScreen();

    await fireEvent.press(screen.getByTestId("sign-up-goto-sign-in"));

    expect(navigation.navigate).toHaveBeenCalledWith("SignIn");
  });
});
