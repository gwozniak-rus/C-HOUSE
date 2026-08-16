import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

import type { MockSupabase } from '../test-utils/mockSupabase';

// The factory does its own require() so it doesn't depend on hoisting order
// relative to this file's own top-level consts (see test-utils/mockSupabase.ts).
jest.mock('../../lib/supabase', () => ({
  supabase: require('../test-utils/mockSupabase').createMockSupabase(),
}));

import { AuthProvider, useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

const mockSupabase = supabase as unknown as MockSupabase;

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'user-1', email: 'a@example.com' } as Session['user'],
    ...overrides,
  } as Session;
}

describe('AuthProvider / useAuth', () => {
  it('throws when useAuth is called outside an AuthProvider', async () => {
    // renderHook without a wrapper renders the hook with no provider ancestor.
    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('starts initializing and resolves to a null session when signed out', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });

    // renderHook awaits the initial effects (including this resolved
    // getSession() promise) before returning, so by this point
    // initialization has already settled — there's no synchronous window in
    // which to observe `initializing: true` from the test.
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it('resolves with the session returned by getSession()', async () => {
    const session = makeSession();
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session } });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.session).toEqual(session);
  });

  it('updates the session when the auth state change listener fires', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    let authChangeCallback: (event: string, session: Session | null) => void = () => {};
    mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
      authChangeCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.initializing).toBe(false));

    const session = makeSession();
    await act(async () => {
      authChangeCallback('SIGNED_IN', session);
    });

    expect(result.current.session).toEqual(session);
  });

  it('unsubscribes from the auth state listener on unmount', async () => {
    const unsubscribe = jest.fn();
    mockSupabase.auth.onAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
