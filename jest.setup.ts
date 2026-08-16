// @testing-library/react-native v12.4+ registers its jest matchers
// (toBeOnTheScreen, toHaveTextContent, ...) automatically — no extend-expect needed.

// lib/supabase.ts throws at import time if these are missing, and several
// modules under test import it transitively (auth-context, screens, push).
// Tests that care about actual Supabase calls mock '../lib/supabase'
// directly; this just keeps the real module importable everywhere else.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ||= 'BEXAMPLE_VAPID_PUBLIC_KEY_FOR_TESTS_0000000000';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
