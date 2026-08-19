import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text } from "react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { useTeam } from "../../lib/team-context";
import { useRoster } from "../../lib/teams-queries";
import { colors, fontSize, radius, spacing } from "../../lib/theme";
import type { AppStackParamList } from "../../navigation/AppNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "TeamHome">;

export function TeamHomeScreen({ navigation }: Props) {
  const { activeTeam, activeTeamId, isCoach } = useTeam();
  const { data: roster } = useRoster(activeTeamId);

  const activeCount = roster?.filter((m) => m.status === "active").length ?? 0;

  return (
    <ScreenContainer>
      <Text style={styles.teamName}>{activeTeam?.name}</Text>
      <Text style={styles.count}>
        {activeCount} active {activeCount === 1 ? "member" : "members"}
      </Text>

      <NavCard
        testID="team-home-roster"
        title="Roster"
        subtitle="See everyone on the team"
        onPress={() => navigation.navigate("Roster")}
      />

      {isCoach ? (
        <NavCard
          testID="team-home-invite-code"
          title="Invite code"
          subtitle="Share or manage the join code"
          onPress={() => navigation.navigate("InviteCode")}
        />
      ) : null}

      <NavCard
        testID="team-home-profile"
        title="Profile"
        subtitle="Your name and settings"
        onPress={() => navigation.navigate("Profile")}
      />
    </ScreenContainer>
  );
}

function NavCard({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  teamName: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
