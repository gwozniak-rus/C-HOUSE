import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../lib/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
};

// Cross-platform confirm, used wherever the plan called for a confirm dialog.
//
// Alert.alert() with button callbacks cannot be used: it is a no-op on
// react-native-web, so on the PWA the confirm callback would never fire and
// the destructive action would silently never happen. Modal *is* implemented
// on web, so this behaves the same in both places.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testID,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View testID={testID} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button
              testID={`${testID}-cancel`}
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.action}
            />
            <Button
              testID={`${testID}-confirm`}
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
