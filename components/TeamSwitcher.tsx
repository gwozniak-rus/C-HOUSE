import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTeam } from '../lib/team-context';
import { colors, fontSize, radius, spacing } from '../lib/theme';

// Header control for the active team. Visually a no-op beyond a static label
// when the coach/player has exactly one team -- the modal picker only opens
// once there's something to switch between.
export function TeamSwitcher() {
  const { teams, activeTeamId, activeTeam, setActiveTeam } = useTeam();
  const [open, setOpen] = useState(false);

  if (!activeTeam) return null;

  if (teams.length <= 1) {
    return (
      <View style={styles.staticLabel}>
        <Text style={styles.staticLabelText} numberOfLines={1}>
          {activeTeam.name}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        testID="team-switcher-open"
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {activeTeam.name}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {teams.map(({ team }) => (
              <Pressable
                key={team.id}
                testID={`team-switcher-option-${team.id}`}
                style={styles.option}
                onPress={() => {
                  setActiveTeam(team.id);
                  setOpen(false);
                }}
              >
                <Text
                  style={[styles.optionText, team.id === activeTeamId && styles.optionTextActive]}
                >
                  {team.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  staticLabel: {
    maxWidth: 200,
  },
  staticLabelText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 220,
  },
  triggerText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  chevron: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 90,
  },
  sheet: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  optionTextActive: {
    fontWeight: '700',
  },
});
