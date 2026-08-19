import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share, StyleSheet, Switch, Text, View } from "react-native";

import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { useTeam } from "../../lib/team-context";
import { mapSupabaseError } from "../../lib/teams";
import {
  useInviteCode,
  useRegenerateCode,
  useToggleJoining,
} from "../../lib/teams-queries";
import { colors, fontSize, radius, spacing } from "../../lib/theme";

export function InviteCodeScreen() {
  const { activeTeam, activeTeamId } = useTeam();
  const { data: inviteCode, isPending } = useInviteCode(activeTeamId);
  const toggleJoining = useToggleJoining(activeTeamId);
  const regenerateCode = useRegenerateCode(activeTeamId);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const isAccepting = Boolean(inviteCode && !inviteCode.revoked_at);

  async function handleCopy() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!inviteCode || !activeTeam) return;
    try {
      await Share.share({
        message: `Join ${activeTeam.name} on CoachHub with code ${inviteCode.code}`,
      });
    } catch {
      // User dismissed the share sheet -- nothing to report.
    }
  }

  async function handleToggle(next: boolean) {
    if (!inviteCode) return;
    setError(null);
    try {
      await toggleJoining.mutateAsync({ codeId: inviteCode.id, enabled: next });
    } catch (caught) {
      setError(mapSupabaseError(caught));
    }
  }

  async function handleRegenerate() {
    setError(null);
    try {
      await regenerateCode.mutateAsync(inviteCode?.id ?? null);
      setConfirmingRegenerate(false);
    } catch (caught) {
      setError(mapSupabaseError(caught));
    }
  }

  return (
    <ScreenContainer>
      <Banner testID="invite-code-error" message={error} />

      <Text style={styles.label}>Invite code</Text>
      <View style={styles.codeCard}>
        <Text testID="invite-code-value" style={styles.code}>
          {isPending ? "········" : inviteCode?.code}
        </Text>
      </View>

      {copied ? (
        <Banner
          testID="invite-code-copied"
          message="Copied to clipboard"
          tone="success"
        />
      ) : null}

      <View style={styles.buttonRow}>
        <Button
          testID="invite-code-copy"
          label="Copy code"
          variant="secondary"
          onPress={handleCopy}
          disabled={!inviteCode}
          style={styles.buttonHalf}
        />
        <Button
          testID="invite-code-share"
          label="Share"
          variant="secondary"
          onPress={handleShare}
          disabled={!inviteCode}
          style={styles.buttonHalf}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchLabelGroup}>
          <Text style={styles.switchLabel}>Accepting new players</Text>
          <Text style={styles.switchSubtitle}>
            {isAccepting
              ? "Anyone with this code can join instantly."
              : "This code is paused -- no one can join with it right now."}
          </Text>
        </View>
        <Switch
          testID="invite-code-toggle"
          value={isAccepting}
          onValueChange={handleToggle}
          disabled={!inviteCode || toggleJoining.isPending}
        />
      </View>

      <Button
        testID="invite-code-regenerate"
        label="Regenerate code"
        variant="secondary"
        onPress={() => setConfirmingRegenerate(true)}
        disabled={!inviteCode}
      />

      <ConfirmDialog
        testID="invite-code-regenerate-confirm"
        visible={confirmingRegenerate}
        title="Regenerate the invite code?"
        message="The current code will stop working immediately. Anyone you haven't shared the new code with won't be able to join."
        confirmLabel="Regenerate"
        destructive
        loading={regenerateCode.isPending}
        onConfirm={handleRegenerate}
        onCancel={() => setConfirmingRegenerate(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
  },
  codeCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  code: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 6,
    fontFamily: "monospace",
    color: colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.text,
  },
  switchSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
