import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../../lib/theme';

type Props = PropsWithChildren<{
  /** Vertically centers the content -- for short onboarding/auth-style screens. */
  centered?: boolean;
  scroll?: boolean;
  testID?: string;
}>;

export function ScreenContainer({ children, centered = false, scroll = false, testID }: Props) {
  if (scroll) {
    return (
      <ScrollView
        testID={testID}
        style={styles.scroll}
        contentContainerStyle={[styles.content, centered && styles.centered]}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View testID={testID} style={[styles.container, centered && styles.centered]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
