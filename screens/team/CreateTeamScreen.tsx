import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useTeam } from '../../lib/team-context';
import { mapSupabaseError } from '../../lib/teams';
import { useCreateTeam } from '../../lib/teams-queries';
import { colors, fontSize } from '../../lib/theme';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateTeam'>;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function CreateTeamScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { setActiveTeam } = useTeam();
  const createTeam = useCreateTeam();

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError('Give your team a name.');
      return;
    }
    // Mirrors the CHECK on teams.primary_color, so a typo is caught here
    // rather than coming back as a constraint violation.
    if (primaryColor.trim() && !HEX_COLOR.test(primaryColor.trim())) {
      setError('Team color must be a hex value like #1d4ed8.');
      return;
    }

    try {
      const team = await createTeam.mutateAsync({
        name,
        primaryColor: primaryColor.trim() || null,
      });
      // Select it before navigating so TeamHome resolves to the new team as
      // soon as the invalidated teams query comes back.
      setActiveTeam(team.id);
      navigation.replace('TeamHome');
    } catch (caught) {
      setError(mapSupabaseError(caught, 'Could not create the team. Please try again.'));
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Create a team</Text>
      <Text style={styles.subtitle}>
        You&apos;ll be the coach. Once it exists you&apos;ll get a code to share with your players.
      </Text>

      <Banner testID="create-team-error" message={error} />

      <TextField
        label="Team name"
        testID="create-team-name"
        placeholder="Riverside Rays"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
      />
      <TextField
        label="Team color (optional)"
        testID="create-team-color"
        placeholder="#1d4ed8"
        autoCapitalize="none"
        autoCorrect={false}
        value={primaryColor}
        onChangeText={setPrimaryColor}
      />

      <Button
        testID="create-team-submit"
        label="Create team"
        onPress={handleCreate}
        loading={createTeam.isPending}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.display,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
