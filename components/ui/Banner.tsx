import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../lib/theme';

type Tone = 'error' | 'info' | 'success';

type Props = {
  message: string | null;
  tone?: Tone;
  testID?: string;
};

// Inline replacement for Alert.alert() on the error path.
//
// react-native-web ships Alert as `static alert() {}` -- a literal no-op -- so
// on the PWA (the primary target) an Alert-reported failure is invisible: the
// button just stops spinning and nothing explains why. Rendering the message
// in the page works identically on native and web, and is what the screen
// tests assert against.
export function Banner({ message, tone = 'error', testID }: Props) {
  if (!message) return null;

  return (
    <View testID={testID} style={[styles.base, styles[tone]]} accessibilityRole="alert">
      <Text style={[styles.text, tone === 'error' && styles.textError]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    backgroundColor: '#fdf0ee',
    borderColor: colors.danger,
  },
  info: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSubtle,
  },
  success: {
    backgroundColor: '#eef7f0',
    borderColor: '#2e7d4f',
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  textError: {
    color: colors.danger,
  },
});
