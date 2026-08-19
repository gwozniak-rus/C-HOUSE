import { NavigationContainer } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./lib/auth-context";
import { registerServiceWorker } from "./lib/push/register";
import { queryClient } from "./lib/queryClient";
import { TeamProvider } from "./lib/team-context";
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  // Registered at app boot (not just when a screen mounts the push hook) so
  // the service worker is active — and can receive pushes — as early as
  // possible. No-ops on native/non-web platforms.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Needs a session to know whose teams to load, so it sits inside
              AuthProvider. */}
          <TeamProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </TeamProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
