import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { MockSupabase } from "../test-utils/mockSupabase";

// The factory does its own require() so it doesn't depend on hoisting order
// relative to this file's own top-level consts (see test-utils/mockSupabase.ts).
jest.mock("../../lib/supabase", () => ({
  supabase: require("../test-utils/mockSupabase").createMockSupabase(),
}));

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { ProfileMenu } from "../../components/ProfileMenu";
import { supabase } from "../../lib/supabase";

const mockSupabase = supabase as unknown as MockSupabase;

afterEach(() => {
  jest.clearAllMocks();
});

async function renderProfileMenu() {
  return render(
    <NavigationContainer>
      <ProfileMenu />
    </NavigationContainer>,
  );
}

describe("<ProfileMenu />", () => {
  it("does not show the dropdown options until opened", async () => {
    await renderProfileMenu();

    expect(screen.queryByTestId("profile-menu-profile")).toBeNull();
    expect(screen.queryByTestId("profile-menu-sign-out")).toBeNull();
  });

  it("opens the dropdown when the header icon is tapped", async () => {
    await renderProfileMenu();

    await fireEvent.press(screen.getByTestId("header-menu-open"));

    expect(screen.getByTestId("profile-menu-profile")).toBeTruthy();
    expect(screen.getByTestId("profile-menu-sign-out")).toBeTruthy();
  });

  it("navigates to Profile and closes the dropdown", async () => {
    await renderProfileMenu();

    await fireEvent.press(screen.getByTestId("header-menu-open"));
    await fireEvent.press(screen.getByTestId("profile-menu-profile"));

    expect(mockNavigate).toHaveBeenCalledWith("Profile");
    expect(screen.queryByTestId("profile-menu-profile")).toBeNull();
  });

  it("signs out and closes the dropdown", async () => {
    await renderProfileMenu();

    await fireEvent.press(screen.getByTestId("header-menu-open"));
    await fireEvent.press(screen.getByTestId("profile-menu-sign-out"));

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(screen.queryByTestId("profile-menu-sign-out")).toBeNull();
  });
});
