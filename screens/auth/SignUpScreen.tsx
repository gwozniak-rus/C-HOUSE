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

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export function SignUpScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignUp() {
    setError(null);
    setConfirmationSent(false);
    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Read by the handle_new_user() trigger (profiles migration), which
      // composes display_name from these.
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setConfirmationSent(true);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenContainer centered>
        <Text style={styles.title}>Create account</Text>

        <Banner testID="sign-up-error" message={error} />
        {confirmationSent ? (
          <Banner
            testID="sign-up-confirmation"
            tone="success"
            message="Check your email to confirm your address and finish signing up."
          />
        ) : null}

        <TextField
          testID="sign-up-first-name"
          placeholder="First name"
          autoCapitalize="words"
          autoComplete="given-name"
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            setConfirmationSent(false);
          }}
        />
        <TextField
          testID="sign-up-last-name"
          placeholder="Last name"
          autoCapitalize="words"
          autoComplete="family-name"
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            setConfirmationSent(false);
          }}
        />
        <TextField
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setConfirmationSent(false);
          }}
        />
        <TextField
          placeholder="Password"
          autoCapitalize="none"
          autoComplete="password-new"
          secureTextEntry
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setConfirmationSent(false);
          }}
        />

        <Button
          testID="sign-up-submit"
          label="Sign up"
          onPress={handleSignUp}
          loading={submitting}
          style={styles.submit}
        />

        <Pressable
          testID="sign-up-goto-sign-in"
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
