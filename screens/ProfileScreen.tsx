import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PushNotificationToggle } from '../components/PushNotificationToggle';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/teams';
import { useProfile, useUpdateProfile } from '../lib/teams-queries';
import { colors, fontSize, spacing } from '../lib/theme';

export function ProfileScreen() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seeds the form once the profile loads; profile fields are otherwise
  // uncontrolled by the query so mid-edit refetches don't clobber typing.
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    try {
      await updateProfile.mutateAsync({ firstName, lastName, phone: phone || null });
      setSaved(true);
    } catch (caught) {
      setError(mapSupabaseError(caught, 'Could not save your profile. Please try again.'));
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <Banner testID="profile-error" message={error} />
      {saved ? <Banner testID="profile-saved" message="Saved" tone="success" /> : null}

      <TextField
        label="First name"
        testID="profile-first-name"
        autoCapitalize="words"
        value={firstName}
        onChangeText={(value) => {
          setFirstName(value);
          setSaved(false);
        }}
      />
      <TextField
        label="Last name"
        testID="profile-last-name"
        autoCapitalize="words"
        value={lastName}
        onChangeText={(value) => {
          setLastName(value);
          setSaved(false);
        }}
      />
      <TextField
        label="Phone (optional)"
        testID="profile-phone"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          setSaved(false);
        }}
      />

      <Button
        testID="profile-save"
        label="Save"
        onPress={handleSave}
        loading={updateProfile.isPending}
      />

      <PushNotificationToggle />

      <Button
        testID="profile-sign-out"
        label="Sign out"
        variant="secondary"
        onPress={() => supabase.auth.signOut()}
        style={styles.signOut}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  signOut: {
    marginTop: spacing.lg,
  },
});
