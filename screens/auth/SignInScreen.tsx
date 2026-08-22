import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { TextField } from "../../components/ui/TextField";
import { supabase } from "../../lib/supabase";
import { colors, fontSize, spacing } from "../../lib/theme";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // On success, the auth-context session listener flips RootNavigator to AppNavigator.
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenContainer centered>
        <Text style={styles.title}>Sign in</Text>

        <Banner testID="sign-in-error" message={error} />

        <TextField
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          placeholder="Password"
          autoCapitalize="none"
          autoComplete="password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          testID="sign-in-submit"
          label="Sign in"
          onPress={handleSignIn}
          loading={submitting}
          style={styles.submit}
        />

        <Pressable
          testID="sign-in-goto-sign-up"
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.link}>Don&apos;t have an account? Sign up</Text>
        </Pressable>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  submit: {
    marginTop: spacing.xs,
  },
  link: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.textMuted,
  },
});
