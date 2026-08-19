import type { MockSupabase } from "../../test-utils/mockSupabase";
import { installPushEnv } from "../../test-utils/mockPushEnv";

jest.mock("../../../lib/push/subscription", () => ({
  persistSubscription: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../lib/supabase", () => ({
  supabase: require("../../test-utils/mockSupabase").createMockSupabase(),
}));

// registerServiceWorker memoizes a module-level `registrationPromise`, so
// each test needs its own fresh copy of the module (and everything it pulls
// in — supabase, subscription, react-native's Platform) or state leaks
// between tests. jest.resetModules() + a fresh require() per test gives
// that; installPushEnv() re-requires 'react-native' lazily so it mutates the
// same fresh instance register.ts will see.
let env: ReturnType<typeof installPushEnv>;
let registerServiceWorker: typeof import("../../../lib/push/register").registerServiceWorker;
let mockSupabase: MockSupabase;
let mockPersistSubscription: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  env = installPushEnv();
  ({ registerServiceWorker } = require("../../../lib/push/register"));
  ({ supabase: mockSupabase } = require("../../../lib/supabase"));
  ({
    persistSubscription: mockPersistSubscription,
  } = require("../../../lib/push/subscription"));
});

afterEach(() => {
  env.restore();
});

describe("registerServiceWorker", () => {
  it("resolves to null and does nothing on non-web platforms", async () => {
    require("react-native").Platform.OS = "ios";

    await expect(registerServiceWorker()).resolves.toBeNull();
    expect(env.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("registers public/sw.js and wires the message listener", async () => {
    const result = await registerServiceWorker();

    expect(env.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
    expect(result).toBe(env.registration);
    expect(env.serviceWorker.addEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
  });

  it("memoizes the registration across repeated calls", async () => {
    const first = await registerServiceWorker();
    const second = await registerServiceWorker();

    expect(first).toBe(second);
    expect(env.serviceWorker.register).toHaveBeenCalledTimes(1);
  });

  it("resolves to null and logs when registration rejects", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    env.serviceWorker.register.mockRejectedValueOnce(
      new Error("registration failed"),
    );

    await expect(registerServiceWorker()).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("persists a rotated subscription when the service worker posts one", async () => {
    const session = {
      user: { id: "user-1" },
    } as unknown as import("@supabase/supabase-js").Session;
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session } });

    await registerServiceWorker();
    const [, handler] = env.serviceWorker.addEventListener.mock.calls[0];
    const subscription = { endpoint: "https://push.example/rotated" };

    await handler({
      data: { type: "PUSH_SUBSCRIPTION_CHANGED", subscription },
    });

    expect(mockPersistSubscription).toHaveBeenCalledWith(
      "user-1",
      subscription,
    );
  });

  it("ignores service worker messages that are not subscription rotations", async () => {
    await registerServiceWorker();
    const [, handler] = env.serviceWorker.addEventListener.mock.calls[0];

    await handler({ data: { type: "SOMETHING_ELSE" } });

    expect(mockPersistSubscription).not.toHaveBeenCalled();
  });

  it("does not persist a rotated subscription when there is no signed-in user", async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
    });

    await registerServiceWorker();
    const [, handler] = env.serviceWorker.addEventListener.mock.calls[0];

    await handler({
      data: {
        type: "PUSH_SUBSCRIPTION_CHANGED",
        subscription: { endpoint: "x" },
      },
    });

    expect(mockPersistSubscription).not.toHaveBeenCalled();
  });
});
