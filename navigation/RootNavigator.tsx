import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../lib/auth-context';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View testID="root-navigator-splash" style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
