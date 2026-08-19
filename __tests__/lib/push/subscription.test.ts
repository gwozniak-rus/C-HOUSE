import type { MockSupabase } from "../../test-utils/mockSupabase";
import { installPushEnv } from "../../test-utils/mockPushEnv";

jest.mock("../../../lib/supabase", () => ({
  supabase: require("../../test-utils/mockSupabase").createMockSupabase(),
}));

import { supabase } from "../../../lib/supabase";
import {
  getExistingSubscription,
  getNotificationPermission,
  isPushSupported,
  persistSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../../lib/push/subscription";

const mockSupabase = supabase as unknown as MockSupabase;

let env: ReturnType<typeof installPushEnv>;

beforeEach(() => {
  env = installPushEnv();
});

afterEach(() => {
  env.restore();
  jest.clearAllMocks();
});

describe("isPushSupported", () => {
  it("is true when on web with serviceWorker and PushManager available", () => {
    expect(isPushSupported()).toBe(true);
  });

  it("is false on native platforms", () => {
    (require("react-native").Platform as { OS: string }).OS = "ios";
    expect(isPushSupported()).toBe(false);
  });

  it("is false when the browser has no PushManager", () => {
    delete (window as unknown as { PushManager?: unknown }).PushManager;
    expect(isPushSupported()).toBe(false);
  });
});

describe("getNotificationPermission", () => {
  it('returns "unsupported" when push is not supported', () => {
    (require("react-native").Platform as { OS: string }).OS = "ios";
    expect(getNotificationPermission()).toBe("unsupported");
  });

  it("returns the browser Notification.permission value when supported", () => {
    env.notification.permission = "granted";
    expect(getNotificationPermission()).toBe("granted");
  });
});

describe("getExistingSubscription", () => {
  it("returns null when push is not supported", async () => {
    (require("react-native").Platform as { OS: string }).OS = "ios";
    await expect(getExistingSubscription()).resolves.toBeNull();
  });

  it("returns the registration's current push subscription", async () => {
    const subscription = { endpoint: "https://push.example/abc" };
    env.pushManager.getSubscription.mockResolvedValueOnce(subscription);
    await expect(getExistingSubscription()).resolves.toBe(subscription);
  });
});

describe("persistSubscription", () => {
  const validSubscriptionJson = {
    endpoint: "https://push.example/abc",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  };

  it("throws when the subscription JSON is missing endpoint or keys", async () => {
    await expect(persistSubscription("user-1", {})).rejects.toThrow(
      "Push subscription is missing required fields",
    );
  });

  it("inserts a new row when no existing subscription is found", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(lookupBuilder as never)
      .mockReturnValueOnce({ insert } as never);

    await persistSubscription("user-1", validSubscriptionJson);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        endpoint: validSubscriptionJson.endpoint,
        p256dh: "p256dh-key",
        web_push_auth_key: "auth-key",
        is_active: true,
      }),
    );
  });

  it("updates the existing row when one is found for the endpoint", async () => {
    const eqAfterUpdate = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: eqAfterUpdate });
    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: "row-1" }, error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(lookupBuilder as never)
      .mockReturnValueOnce({ update } as never);

    await persistSubscription("user-1", validSubscriptionJson);

    expect(update).toHaveBeenCalled();
    expect(eqAfterUpdate).toHaveBeenCalledWith("id", "row-1");
  });

  it("throws when the lookup query errors", async () => {
    const lookupError = new Error("lookup failed");
    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: null, error: lookupError }),
    };
    mockSupabase.from.mockReturnValueOnce(lookupBuilder as never);

    await expect(
      persistSubscription("user-1", validSubscriptionJson),
    ).rejects.toBe(lookupError);
  });

  it("throws when the insert errors", async () => {
    const insertError = new Error("insert failed");
    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(lookupBuilder as never)
      .mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: insertError }),
      } as never);

    await expect(
      persistSubscription("user-1", validSubscriptionJson),
    ).rejects.toBe(insertError);
  });
});

describe("subscribeToPush", () => {
  it("throws when push is not supported", async () => {
    (require("react-native").Platform as { OS: string }).OS = "ios";
    await expect(subscribeToPush("user-1")).rejects.toThrow(
      "Push notifications are not supported in this browser",
    );
  });

  it("throws when notification permission is not granted", async () => {
    env.notification.requestPermission.mockResolvedValueOnce("denied");
    await expect(subscribeToPush("user-1")).rejects.toThrow(
      "Notification permission was not granted",
    );
  });

  it("reuses an existing browser subscription and persists it", async () => {
    const rawSubscription = {
      endpoint: "https://push.example/existing",
      toJSON: () => ({
        endpoint: "https://push.example/existing",
        keys: { p256dh: "p", auth: "a" },
      }),
    };
    env.pushManager.getSubscription.mockResolvedValueOnce(rawSubscription);

    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from
      .mockReturnValueOnce(lookupBuilder as never)
      .mockReturnValueOnce({ insert } as never);

    await subscribeToPush("user-1");

    expect(env.pushManager.subscribe).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://push.example/existing" }),
    );
  });

  it("creates a new subscription when none exists and persists it", async () => {
    const newSubscription = {
      endpoint: "https://push.example/new",
      toJSON: () => ({
        endpoint: "https://push.example/new",
        keys: { p256dh: "p", auth: "a" },
      }),
    };
    env.pushManager.getSubscription.mockResolvedValueOnce(null);
    env.pushManager.subscribe.mockResolvedValueOnce(newSubscription);

    const lookupBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from
      .mockReturnValueOnce(lookupBuilder as never)
      .mockReturnValueOnce({ insert } as never);

    await subscribeToPush("user-1");

    expect(env.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://push.example/new" }),
    );
  });
});

describe("unsubscribeFromPush", () => {
  it("is a no-op when push is not supported", async () => {
    (require("react-native").Platform as { OS: string }).OS = "ios";
    await expect(unsubscribeFromPush()).resolves.toBeUndefined();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("is a no-op when there is no existing subscription", async () => {
    env.pushManager.getSubscription.mockResolvedValueOnce(null);
    await unsubscribeFromPush();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("unsubscribes from the browser and marks the row inactive", async () => {
    const unsubscribe = jest.fn().mockResolvedValue(true);
    env.pushManager.getSubscription.mockResolvedValueOnce({
      endpoint: "https://push.example/abc",
      unsubscribe,
    });

    const eqAfterEq = jest.fn().mockResolvedValue({ error: null });
    const eqAfterUpdate = jest.fn().mockReturnValue({ eq: eqAfterEq });
    mockSupabase.from.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: eqAfterUpdate }),
    } as never);

    await unsubscribeFromPush();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(eqAfterUpdate).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/abc",
    );
    expect(eqAfterEq).toHaveBeenCalledWith("platform", "web");
  });

  it("throws when marking the row inactive fails", async () => {
    const updateError = new Error("update failed");
    env.pushManager.getSubscription.mockResolvedValueOnce({
      endpoint: "https://push.example/abc",
      unsubscribe: jest.fn().mockResolvedValue(true),
    });

    mockSupabase.from.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: updateError }),
        }),
      }),
    } as never);

    await expect(unsubscribeFromPush()).rejects.toBe(updateError);
  });
});
