import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("../../../lib/push/register", () => ({
  registerServiceWorker: jest.fn().mockResolvedValue(null),
}));
jest.mock("../../../lib/push/subscription", () => ({
  isPushSupported: jest.fn(),
  getNotificationPermission: jest.fn().mockReturnValue("default"),
  getExistingSubscription: jest.fn().mockResolvedValue(null),
  subscribeToPush: jest.fn().mockResolvedValue(undefined),
  unsubscribeFromPush: jest.fn().mockResolvedValue(undefined),
}));
// A minimal stand-in for the real AuthProvider/useAuth (see lib/auth-context.tsx)
// that lets each test set the "signed-in" session directly, without wiring up
// a Supabase mock just to get a session value into this hook.
jest.mock("../../../lib/auth-context", () => {
  let currentSession: unknown = null;
  return {
    useAuth: () => ({ session: currentSession, initializing: false }),
    AuthProvider: ({ children }: { children: unknown }) => children,
    __setSession: (session: unknown) => {
      currentSession = session;
    },
  };
});

import { AuthProvider } from "../../../lib/auth-context";
import { registerServiceWorker } from "../../../lib/push/register";
import {
  getExistingSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../../lib/push/subscription";
import { usePushNotifications } from "../../../lib/push/usePushNotifications";

const mockIsPushSupported = isPushSupported as jest.Mock;
const mockGetNotificationPermission = getNotificationPermission as jest.Mock;
const mockGetExistingSubscription = getExistingSubscription as jest.Mock;
const mockSubscribeToPush = subscribeToPush as jest.Mock;
const mockUnsubscribeFromPush = unsubscribeFromPush as jest.Mock;
const mockRegisterServiceWorker = registerServiceWorker as jest.Mock;
const setSession = (
  require("../../../lib/auth-context") as { __setSession: (s: unknown) => void }
).__setSession;

describe("usePushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotificationPermission.mockReturnValue("default");
    mockGetExistingSubscription.mockResolvedValue(null);
    mockRegisterServiceWorker.mockResolvedValue(null);
    mockSubscribeToPush.mockResolvedValue(undefined);
    mockUnsubscribeFromPush.mockResolvedValue(undefined);
    setSession(null);
  });

  it("reports unsupported and skips setup work when push is not supported", async () => {
    mockIsPushSupported.mockReturnValue(false);

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isSupported).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockRegisterServiceWorker).not.toHaveBeenCalled();
  });

  it("registers the service worker and reflects an existing subscription", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetExistingSubscription.mockResolvedValue({
      endpoint: "https://push.example/existing",
    });

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRegisterServiceWorker).toHaveBeenCalledTimes(1);
    expect(result.current.isSubscribed).toBe(true);
  });

  it("surfaces an error if checking the existing subscription fails", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetExistingSubscription.mockRejectedValue(new Error("boom"));

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("boom");
  });

  it("subscribe() sets an error instead of calling subscribeToPush() when signed out", async () => {
    mockIsPushSupported.mockReturnValue(true);

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockSubscribeToPush).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "You must be signed in to enable notifications",
    );
  });

  it("subscribe() calls subscribeToPush() with the signed-in user id and updates state", async () => {
    mockIsPushSupported.mockReturnValue(true);
    setSession({ user: { id: "user-1" } });

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockSubscribeToPush).toHaveBeenCalledWith("user-1");
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("subscribe() surfaces the error thrown by subscribeToPush()", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockSubscribeToPush.mockRejectedValueOnce(new Error("permission denied"));
    setSession({ user: { id: "user-1" } });

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe("permission denied");
    expect(result.current.isSubscribed).toBe(false);
  });

  it("unsubscribe() calls unsubscribeFromPush() and clears isSubscribed", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockGetExistingSubscription.mockResolvedValue({
      endpoint: "https://push.example/existing",
    });

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockUnsubscribeFromPush).toHaveBeenCalledTimes(1);
    expect(result.current.isSubscribed).toBe(false);
  });

  it("unsubscribe() surfaces the error thrown by unsubscribeFromPush()", async () => {
    mockIsPushSupported.mockReturnValue(true);
    mockUnsubscribeFromPush.mockRejectedValueOnce(new Error("network error"));

    const { result } = await renderHook(() => usePushNotifications(), {
      wrapper: AuthProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.error).toBe("network error");
  });
});
