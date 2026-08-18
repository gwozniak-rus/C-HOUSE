import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { colors, fontSize, spacing } from '../../lib/theme';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'Welcome'>;

// The coach/player fork. Nothing about the choice is persisted to the profile
// -- role lives only on team_members -- which is what lets team *creation* go
// behind a paywall later without touching the player path at all.
export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer centered>
      <Text style={styles.title}>You&apos;re not on a team yet</Text>
      <Text style={styles.subtitle}>
        Coaches create a team and share a join code. Players join with the code their coach gave
        them.
      </Text>

      <Button
        testID="welcome-create-team"
        label="Create a team"
        onPress={() => navigation.navigate('CreateTeam')}
        style={styles.action}
      />
      <Button
        testID="welcome-join-team"
        label="Join a team"
        variant="secondary"
        onPress={() => navigation.navigate('JoinTeam')}
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
    fontSize: fontSize.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  action: {
    marginTop: spacing.sm,
  },
});
