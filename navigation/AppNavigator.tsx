import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { TeamSwitcher } from "../components/TeamSwitcher";
import { useTeam } from "../lib/team-context";
import { ProfileScreen } from "../screens/ProfileScreen";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import { CreateTeamScreen } from "../screens/team/CreateTeamScreen";
import { InviteCodeScreen } from "../screens/team/InviteCodeScreen";
import { JoinTeamScreen } from "../screens/team/JoinTeamScreen";
import { RosterScreen } from "../screens/team/RosterScreen";
import { TeamHomeScreen } from "../screens/team/TeamHomeScreen";

export type AppStackParamList = {
  Welcome: undefined;
  CreateTeam: undefined;
  JoinTeam: undefined;
  TeamHome: undefined;
  Roster: undefined;
  InviteCode: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  // Chosen once at mount by RootNavigator's session/team gate. Later team
  // switches happen from TeamHome via TeamSwitcher, not by re-navigating here.
  const { teams } = useTeam();
  const initialRouteName = teams.length > 0 ? "TeamHome" : "Welcome";

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ title: "Welcome" }}
      />
      <Stack.Screen
        name="CreateTeam"
        component={CreateTeamScreen}
        options={{ title: "Create a team" }}
      />
      <Stack.Screen
        name="JoinTeam"
        component={JoinTeamScreen}
        options={{ title: "Join a team" }}
      />
      <Stack.Screen
        name="TeamHome"
        component={TeamHomeScreen}
        options={{ headerTitle: () => <TeamSwitcher /> }}
      />
      <Stack.Screen
        name="Roster"
        component={RosterScreen}
        options={{ title: "Roster" }}
      />
      <Stack.Screen
        name="InviteCode"
        component={InviteCodeScreen}
        options={{ title: "Invite code" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Stack.Navigator>
  );
}
