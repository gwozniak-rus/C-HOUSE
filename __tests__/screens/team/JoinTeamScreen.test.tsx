import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "../../test-utils/renderWithProviders";

jest.mock("../../../lib/team-context", () => ({ useTeam: jest.fn() }));
jest.mock("../../../lib/teams-queries", () => ({ useJoinTeam: jest.fn() }));
// mapSupabaseError/normalizeInviteCode are real (pure); only the network call
// (previewInviteCode) is mocked.
jest.mock("../../../lib/teams", () => ({
  ...jest.requireActual("../../../lib/teams"),
  previewInviteCode: jest.fn(),
}));

import { useTeam } from "../../../lib/team-context";
import { previewInviteCode } from "../../../lib/teams";
import { useJoinTeam } from "../../../lib/teams-queries";
import { JoinTeamScreen } from "../../../screens/team/JoinTeamScreen";

const mockUseTeam = useTeam as jest.Mock;
const mockUseJoinTeam = useJoinTeam as jest.Mock;
const mockPreviewInviteCode = previewInviteCode as jest.Mock;

function renderScreen() {
  const navigation = { replace: jest.fn(), navigate: jest.fn() };
  return {
    navigation,
    promise: renderWithProviders(
      <JoinTeamScreen navigation={navigation as never} route={{} as never} />,
    ),
  };
}

beforeEach(() => {
  mockUseTeam.mockReturnValue({ setActiveTeam: jest.fn() });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("<JoinTeamScreen />", () => {
  it("shows an inline error when the code is invalid or no longer redeemable", async () => {
    mockUseJoinTeam.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockPreviewInviteCode.mockResolvedValueOnce(null);
    const { promise } = renderScreen();
    await promise;

    await fireEvent.changeText(
      screen.getByTestId("join-team-code"),
      "BADCODE1",
    );
    await fireEvent.press(screen.getByTestId("join-team-check"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "That code isn't valid or is no longer accepting players.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId("join-team-confirm-confirm")).toBeNull();
  });

  it("shows a confirm step naming the team before joining", async () => {
    mockUseJoinTeam.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockPreviewInviteCode.mockResolvedValueOnce({
      teamId: "team-1",
      teamName: "Riverside Rays",
      role: "player",
    });
    const { promise } = renderScreen();
    await promise;

    await fireEvent.changeText(
      screen.getByTestId("join-team-code"),
      "HJKM2345",
    );
    await fireEvent.press(screen.getByTestId("join-team-check"));

    await waitFor(() =>
      expect(screen.getByText("Join Riverside Rays?")).toBeTruthy(),
    );
    expect(screen.getByText("You'll join as a player.")).toBeTruthy();
  });

  it("redeems the code, sets the active team, and navigates on confirm", async () => {
    const setActiveTeam = jest.fn();
    mockUseTeam.mockReturnValue({ setActiveTeam });
    const mutateAsync = jest.fn().mockResolvedValue("team-1");
    mockUseJoinTeam.mockReturnValue({ mutateAsync, isPending: false });
    mockPreviewInviteCode.mockResolvedValueOnce({
      teamId: "team-1",
      teamName: "Riverside Rays",
      role: "player",
    });
    const { navigation, promise } = renderScreen();
    await promise;

    await fireEvent.changeText(
      screen.getByTestId("join-team-code"),
      "HJKM2345",
    );
    await fireEvent.press(screen.getByTestId("join-team-check"));
    await waitFor(() =>
      expect(screen.getByText("Join Riverside Rays?")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("join-team-confirm-confirm"));

    await waitFor(() => expect(setActiveTeam).toHaveBeenCalledWith("team-1"));
    expect(navigation.replace).toHaveBeenCalledWith("TeamHome");
  });

  it("surfaces the RPC error message (e.g. a code revoked between preview and confirm)", async () => {
    mockUseTeam.mockReturnValue({ setActiveTeam: jest.fn() });
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(new Error("Invite code has been revoked"));
    mockUseJoinTeam.mockReturnValue({ mutateAsync, isPending: false });
    mockPreviewInviteCode.mockResolvedValueOnce({
      teamId: "team-1",
      teamName: "Riverside Rays",
      role: "player",
    });
    const { promise } = renderScreen();
    await promise;

    await fireEvent.changeText(
      screen.getByTestId("join-team-code"),
      "HJKM2345",
    );
    await fireEvent.press(screen.getByTestId("join-team-check"));
    await waitFor(() =>
      expect(screen.getByText("Join Riverside Rays?")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("join-team-confirm-confirm"));

    await waitFor(() =>
      expect(screen.getByText("Invite code has been revoked")).toBeTruthy(),
    );
  });
});
