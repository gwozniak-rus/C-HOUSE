# Testing guide

This project uses **jest-expo** (Jest configured for Expo SDK 57) and
**@testing-library/react-native** for component/hook tests. `react-test-renderer`
is intentionally not used — it doesn't support React 19.

## Running tests

```
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # run with a coverage report
```

## Layout

```
__tests__/
  lib/                    # auth-context, push/* unit + hook tests
  screens/                # screen component tests
  components/              # component tests
  navigation/              # navigator tests
  test-utils/               # shared test helpers (not test files themselves)
    mockSupabase.ts         # fake `supabase` client
    mockPushEnv.ts           # fake browser Push API + Platform.OS='web'
    renderWithProviders.tsx  # render() wrapped in a fresh, retry/gcTime-off QueryClient
jest.setup.ts              # global test setup (env vars, AsyncStorage mock)
babel.config.js             # babel-preset-expo, required for jest-expo
```

Tests mirror the source tree: `lib/push/subscription.ts` → `__tests__/lib/push/subscription.test.ts`.
`test-utils/` is excluded from Jest's test matching (see `testPathIgnorePatterns`
in `package.json`) since those files export helpers, not tests.

## The five things that will bite you in this codebase

These aren't generic Jest trivia — they're specific to how this app is built
(RN test environment, React 19, a client-side `lib/supabase.ts` singleton) and
each one caused real failures while writing the initial suite.

### 1. `render`, `renderHook`, and `fireEvent.*` are all `Promise`-returning

In `@testing-library/react-native` v14, `await` every one of these:

```tsx
await render(<MyScreen />);
await fireEvent.press(screen.getByTestId("submit"));
const { result } = await renderHook(() => useMyHook(), { wrapper: MyProvider });
```

Skipping `await` on `fireEvent.changeText`/`fireEvent.press` doesn't throw —
it just silently races, so `TextInput` state updates or `onPress` handlers
may not have run yet when you assert. This is the single most common cause
of a test that "sometimes passes."

When you imperatively call something exposed by a hook (`result.current.subscribe()`),
wrap it in `act`, awaited:

```tsx
await act(async () => {
  await result.current.subscribe();
});
```

### 2. The RN test environment has no browser globals

`jest-expo`'s default preset runs tests in a React Native environment, not
jsdom. `window`, `Notification`, `navigator.serviceWorker`, `window.PushManager`
don't exist. Anything under `lib/push/` that checks `Platform.OS === 'web'`
needs those stubbed in per-test. Use `installPushEnv()` from
`__tests__/test-utils/mockPushEnv.ts`:

```ts
import { installPushEnv } from "../../test-utils/mockPushEnv";

let env: ReturnType<typeof installPushEnv>;
beforeEach(() => {
  env = installPushEnv();
});
afterEach(() => env.restore());
```

It sets `Platform.OS = 'web'`, and stubs `navigator.serviceWorker`,
`window.PushManager`, and `global Notification`. Override its mocks
(`env.pushManager.getSubscription.mockResolvedValueOnce(...)`, etc.) per test.

### 3. `lib/supabase.ts` throws at import time without env vars

It does `if (!supabaseUrl || !supabaseAnonKey) throw ...`, and lots of modules
import it transitively. `jest.setup.ts` sets harmless dummy values for
`EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `_VAPID_PUBLIC_KEY` so the _real_
module is always importable, even in tests that don't care about Supabase.

When a test _does_ care about what Supabase calls happen, mock the module
instead of hitting the real (dummy-configured) client — see the next point.

### 4. Mocking `lib/supabase` (or any local module) safely

`jest.mock()` calls are hoisted by Babel above every other statement in the
file, including `const` declarations above them in your source. This means:

```ts
// BROKEN — mockSupabase is still `undefined` when the factory runs
const mockSupabase = createMockSupabase();
jest.mock("../../lib/supabase", () => ({ supabase: mockSupabase }));
```

fails with "Cannot read properties of undefined". The fix used throughout
this suite: make the factory **self-contained** — do the `require()` for any
helper _inside_ the factory body, where it only runs when the mocked module
is actually first imported (lazy, not hoisted):

```ts
jest.mock("../../lib/supabase", () => ({
  supabase: require("../test-utils/mockSupabase").createMockSupabase(),
}));

import { supabase } from "../../lib/supabase";
import type { MockSupabase } from "../test-utils/mockSupabase";

const mockSupabase = supabase as unknown as MockSupabase; // now safe to use in tests
```

`createMockSupabase()` gives you `auth.getSession`, `auth.onAuthStateChange`,
`auth.signInWithPassword`, `auth.signUp`, `auth.signOut` as configurable
`jest.fn()`s, and a bare `from` you configure per-test (Supabase's query
builder is both chainable _and_ awaitable at every step — see
`subscription.test.ts` for the pattern of building `{ select, eq, maybeSingle }`
objects inline per test rather than trying to generalize it). It also exposes
a bare `rpc` for RPC-based calls like `redeem_invite_code` (see `teams.test.ts`).

### 6. A screen or hook that uses `@tanstack/react-query`

Wrap it in a `QueryClientProvider` — `renderWithProviders()` from
`test-utils/renderWithProviders.tsx` does this with a fresh client per call
(retries and `gcTime` both off, so a failed/pending query doesn't retry into
a timeout or leave a GC timer alive past the test). For a screen test this
usually means mocking `lib/teams-queries` (or `lib/team-context`) directly
with `jest.fn()` return values, the same way screens mock `useAuth` — see
`RosterScreen.test.tsx` / `JoinTeamScreen.test.tsx`. Reserve exercising the
real hooks for `lib/teams.ts` unit tests (mock `lib/supabase` instead) and
`team-context.test.tsx` (mock `lib/teams-queries`'s `useMyTeams`).

### 5. Module-level state (e.g. `lib/push/register.ts`'s memoized promise)

`registerServiceWorker()` remembers its registration in a module-level
variable, so calling it from two different `it()` blocks in the same file
reuses the first call's result — including the first call's now-stale mocks.
`register.test.ts` solves this with `jest.resetModules()` + a fresh
`require()` in `beforeEach`, being careful that `Platform` is also
freshly-required at the same time (`mockPushEnv.ts` fetches `Platform` via a
lazy `require()`, not a static import, for exactly this reason — a static
import would keep pointing at the pre-reset module instance).

If a module you're testing doesn't have this kind of memoized state, you
don't need any of this — plain static imports and a shared mock instance
(pattern in `subscription.test.ts`) are simpler and preferred.

## Adding a new test: worked example

Say you add `lib/formatDuration.ts`, a pure function. No mocking needed:

```ts
// __tests__/lib/formatDuration.test.ts
import { formatDuration } from "../../lib/formatDuration";

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45m");
  });
});
```

Say you add a new screen, `screens/SessionScreen.tsx`, that reads `useAuth()`
and calls `supabase.from('sessions')...`. Follow `HomeScreen.test.tsx`:

1. `jest.mock('../../lib/auth-context', () => ({ useAuth: jest.fn() }))`
2. `jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }))`
   (self-contained factory, or the `mockSupabase` helper if you need `.auth` too)
3. `import { useAuth } from '../../lib/auth-context';` then cast:
   `const mockUseAuth = useAuth as jest.Mock;`
4. In each test, `mockUseAuth.mockReturnValue({ session: ..., initializing: false })`
   before `await render(<SessionScreen />)`.
5. Prefer `testID` over text queries for interactive elements whose visible
   label collides with other text on screen (see `sign-in-submit` in
   `SignInScreen.tsx` — the title and the button both say "Sign in").

## What's covered today

`npm run test:coverage` after this initial suite:

| Area                                                                | Coverage                                                                                                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth-context.tsx`                                              | 100%                                                                                                                                                                                         |
| `lib/push/*` (except the small untested `register.ts` catch branch) | ~98%                                                                                                                                                                                         |
| `components/PushNotificationToggle.tsx`                             | 100%                                                                                                                                                                                         |
| `screens/HomeScreen.tsx`, `screens/auth/*`                          | 100% statements                                                                                                                                                                              |
| `navigation/*`                                                      | 100%                                                                                                                                                                                         |
| `lib/supabase.ts`                                                   | 0% (intentional — it's a thin client-construction module always replaced by the mock; testing it would mean testing the real `@supabase/supabase-js` + `AsyncStorage` wiring, not app logic) |

61 tests across 10 suites, all passing.

## What's not covered yet (worth adding as the app grows)

- `App.tsx` itself (just wires providers together — low value to unit test,
  consider an E2E/smoke test instead if this grows more logic).
- `navigation/AppNavigator.tsx` / `AuthNavigator.tsx` beyond RootNavigator's
  branching (they're currently one-line `<Stack.Screen>` lists).
- Any new screen you add under `screens/` — copy the `HomeScreen.test.tsx` or
  `SignInScreen.test.tsx` pattern depending on whether it's read-only or has
  form/submit behavior.
