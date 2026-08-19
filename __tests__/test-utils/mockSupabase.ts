import type { Session } from "@supabase/supabase-js";

type AuthChangeCallback = (event: string, session: Session | null) => void;

// Builds a fresh jest.fn()-based stand-in for the `supabase` client.
//
// Usage in a test file (the returned object's variable name MUST start with
// "mock" so Jest's hoisting allows it inside a jest.mock() factory):
//
//   const mockSupabase = createMockSupabase();
//   jest.mock('../../lib/supabase', () => ({ supabase: mockSupabase }));
//
// `auth` methods have sensible defaults (signed-out, resolved promises).
// `from` is left as a bare jest.fn() — tests that touch query-builder chains
// (`.select().eq().maybeSingle()`, etc.) configure its return value inline,
// since supabase-js's builder is both chainable *and* awaitable per-step and
// that shape is easier to fake exactly than to generalize.
export function createMockSupabase() {
  return {
    auth: {
      getSession: jest.fn<Promise<{ data: { session: Session | null } }>, []>(
        () => Promise.resolve({ data: { session: null } }),
      ),
      onAuthStateChange: jest.fn<
        { data: { subscription: { unsubscribe: jest.Mock } } },
        [AuthChangeCallback]
      >(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn<
        Promise<{ data: unknown; error: { message: string } | null }>,
        [{ email: string; password: string }]
      >(() => Promise.resolve({ data: {}, error: null })),
      signUp: jest.fn<
        Promise<{ data: unknown; error: { message: string } | null }>,
        [unknown]
      >(() => Promise.resolve({ data: {}, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    from: jest.fn(),
    // Return value configured per-test, e.g.:
    //   mockSupabase.rpc.mockResolvedValueOnce({ data: [...], error: null })
    rpc: jest.fn<
      Promise<{ data: unknown; error: { message: string } | null }>,
      [string, unknown?]
    >(() => Promise.resolve({ data: null, error: null })),
  };
}

export type MockSupabase = ReturnType<typeof createMockSupabase>;
