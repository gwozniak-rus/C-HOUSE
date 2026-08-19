import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { TextField } from "../../components/ui/TextField";
import { useTeam } from "../../lib/team-context";
import { mapSupabaseError, previewInviteCode } from "../../lib/teams";
import { useJoinTeam } from "../../lib/teams-queries";
import { colors, fontSize } from "../../lib/theme";
import type { AppStackParamList } from "../../navigation/AppNavigator";
import type { InviteCodePreview } from "../../lib/types";

type Props = NativeStackScreenProps<AppStackParamList, "JoinTeam">;

export function JoinTeamScreen({ navigation }: Props) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<InviteCodePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setActiveTeam } = useTeam();
  const joinTeam = useJoinTeam();

  async function handleCheckCode() {
    setError(null);
    if (!code.trim()) return;

    setChecking(true);
    try {
      const result = await previewInviteCode(code);
      if (!result) {
        setError("That code isn't valid or is no longer accepting players.");
        return;
      }
      setPreview(result);
    } catch (caught) {
      setError(
        mapSupabaseError(caught, "Couldn't check that code. Please try again."),
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleConfirmJoin() {
    if (!preview) return;
    setError(null);
    try {
      const teamId = await joinTeam.mutateAsync(code);
      setActiveTeam(teamId);
      setPreview(null);
      navigation.replace("TeamHome");
    } catch (caught) {
      setPreview(null);
      setError(
        mapSupabaseError(caught, "Couldn't join that team. Please try again."),
      );
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Join a team</Text>
      <Text style={styles.subtitle}>
        Enter the code your coach shared with you.
      </Text>

      <Banner testID="join-team-error" message={error} />

      <TextField
        label="Team code"
        testID="join-team-code"
        placeholder="HJKM2345"
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.codeInput}
        value={code}
        onChangeText={(value) => {
          setCode(value);
          setError(null);
        }}
        onSubmitEditing={handleCheckCode}
      />

      <Button
        testID="join-team-check"
        label="Find team"
        onPress={handleCheckCode}
        loading={checking}
        disabled={!code.trim()}
      />

      <ConfirmDialog
        testID="join-team-confirm"
        visible={preview !== null}
        title={preview ? `Join ${preview.teamName}?` : ""}
        message={
          preview?.role === "coach"
            ? "You'll join as a coach."
            : "You'll join as a player."
        }
        confirmLabel="Join team"
        loading={joinTeam.isPending}
        onConfirm={handleConfirmJoin}
        onCancel={() => setPreview(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  codeInput: {
    fontFamily: "monospace",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
