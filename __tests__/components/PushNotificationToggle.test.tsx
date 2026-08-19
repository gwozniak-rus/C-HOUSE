import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("../../lib/push/usePushNotifications", () => ({
  usePushNotifications: jest.fn(),
}));

import { usePushNotifications } from "../../lib/push/usePushNotifications";
import { PushNotificationToggle } from "../../components/PushNotificationToggle";

const mockUsePushNotifications = usePushNotifications as jest.Mock;

function baseState(
  overrides: Partial<ReturnType<typeof usePushNotifications>> = {},
) {
  return {
    isSupported: true,
    permission: "default" as const,
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    ...overrides,
  };
}

describe("<PushNotificationToggle />", () => {
  it("shows an unsupported message when push is not supported", async () => {
    mockUsePushNotifications.mockReturnValue(baseState({ isSupported: false }));

    await render(<PushNotificationToggle />);

    expect(screen.getByText(/aren't supported in this browser/i)).toBeTruthy();
  });

  it("shows a blocked message when permission is denied", async () => {
    mockUsePushNotifications.mockReturnValue(
      baseState({ permission: "denied" }),
    );

    await render(<PushNotificationToggle />);

    expect(
      screen.getByText(/notifications are blocked for this site/i),
    ).toBeTruthy();
  });

  it('shows an "Enable notifications" button when not subscribed and calls subscribe() on press', async () => {
    const subscribe = jest.fn();
    mockUsePushNotifications.mockReturnValue(baseState({ subscribe }));

    await render(<PushNotificationToggle />);
    await fireEvent.press(screen.getByText("Enable notifications"));

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('shows a "Disable notifications" button when subscribed and calls unsubscribe() on press', async () => {
    const unsubscribe = jest.fn();
    mockUsePushNotifications.mockReturnValue(
      baseState({ isSubscribed: true, unsubscribe }),
    );

    await render(<PushNotificationToggle />);
    await fireEvent.press(screen.getByText("Disable notifications"));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("shows a loading label and disables the button while loading", async () => {
    mockUsePushNotifications.mockReturnValue(baseState({ isLoading: true }));

    await render(<PushNotificationToggle />);

    expect(screen.getByText("Working…")).toBeTruthy();
  });

  it("renders the error message when present", async () => {
    mockUsePushNotifications.mockReturnValue(
      baseState({ error: "Something went wrong" }),
    );

    await render(<PushNotificationToggle />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
