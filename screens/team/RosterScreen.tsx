import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { useAuth } from "../../lib/auth-context";
import { useTeam } from "../../lib/team-context";
import { mapSupabaseError } from "../../lib/teams";
import {
  useRemoveMember,
  useRoster,
  useSetMemberStatus,
} from "../../lib/teams-queries";
import { colors, fontSize, radius, spacing } from "../../lib/theme";
import type { RosterMember } from "../../lib/types";

export function RosterScreen() {
  const { session } = useAuth();
  const { activeTeamId, isCoach } = useTeam();
  const { data: roster, isPending } = useRoster(activeTeamId);
  const setMemberStatus = useSetMemberStatus(activeTeamId);
  const removeMember = useRemoveMember(activeTeamId);

  const [error, setError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<RosterMember | null>(
    null,
  );

  async function handleToggleStatus(member: RosterMember) {
    setError(null);
    try {
      await setMemberStatus.mutateAsync({
        userId: member.userId,
        status: member.status === "active" ? "inactive" : "active",
      });
    } catch (caught) {
      setError(mapSupabaseError(caught));
    }
  }

  async function handleConfirmRemove() {
    if (!pendingRemoval) return;
    setError(null);
    try {
      await removeMember.mutateAsync(pendingRemoval.userId);
      setPendingRemoval(null);
    } catch (caught) {
      // Left open on failure -- e.g. "Cannot remove the last coach from a
      // team" -- so the coach sees why the dialog didn't close.
      setError(mapSupabaseError(caught));
    }
  }

  return (
    <ScreenContainer>
      <Banner testID="roster-error" message={error} />

      <FlatList
        testID="roster-list"
        data={roster ?? []}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={
          !isPending ? (
            <Text style={styles.empty}>
              No one has joined yet. Share your invite code to get players on
              the roster.
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <RosterRow
            member={item}
            isCoach={isCoach}
            isSelf={item.userId === session?.user.id}
            onToggleStatus={() => handleToggleStatus(item)}
            onRemove={() => setPendingRemoval(item)}
          />
        )}
      />

      <ConfirmDialog
        testID="roster-remove-confirm"
        visible={pendingRemoval !== null}
        title={pendingRemoval ? `Remove ${pendingRemoval.displayName}?` : ""}
        message="They'll lose access to this team and will need a new invite code to rejoin."
        confirmLabel="Remove"
        destructive
        loading={removeMember.isPending}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </ScreenContainer>
  );
}

function RosterRow({
  member,
  isCoach,
  isSelf,
  onToggleStatus,
  onRemove,
}: {
  member: RosterMember;
  isCoach: boolean;
  isSelf: boolean;
  onToggleStatus: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row} testID={`roster-row-${member.userId}`}>
      <View style={styles.info}>
        <Text style={styles.name}>
          {member.displayName}
          {isSelf ? " (you)" : ""}
        </Text>
        <View style={styles.badges}>
          <Badge
            label={member.role === "coach" ? "Coach" : "Player"}
            tone="role"
          />
          {member.status === "inactive" ? (
            <Badge label="Inactive" tone="muted" />
          ) : null}
        </View>
      </View>

      {isCoach ? (
        <View style={styles.actions}>
          <Pressable
            testID={`roster-row-${member.userId}-toggle-status`}
            style={styles.actionButton}
            onPress={onToggleStatus}
          >
            <Text style={styles.actionText}>
              {member.status === "active" ? "Mark inactive" : "Mark active"}
            </Text>
          </Pressable>
          <Pressable
            testID={`roster-row-${member.userId}-remove`}
            style={styles.actionButton}
            onPress={onRemove}
          >
            <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: "role" | "muted" }) {
  return (
    <View style={[styles.badge, tone === "muted" && styles.badgeMuted]}>
      <Text
        style={[styles.badgeText, tone === "muted" && styles.badgeTextMuted]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.text,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMuted: {
    backgroundColor: "#fdf0ee",
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
  },
  badgeTextMuted: {
    color: colors.danger,
  },
  actions: {
    gap: spacing.xs,
  },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.text,
    textAlign: "right",
  },
  removeText: {
    color: colors.danger,
  },
});
