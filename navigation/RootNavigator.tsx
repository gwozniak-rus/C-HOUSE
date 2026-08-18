import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../lib/auth-context';
import { useTeam } from '../lib/team-context';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { session, initializing } = useAuth();
  // Always called (not conditionally) so hook order stays stable regardless
  // of session state; TeamProvider's own query is disabled while signed out.
  const { loading: teamLoading } = useTeam();

  if (initializing) {
    return (
      <View testID="root-navigator-splash" style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <AuthNavigator />;
  }

  if (teamLoading) {
    return (
      <View testID="root-navigator-splash" style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
