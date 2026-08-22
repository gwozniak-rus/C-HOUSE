import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { supabase } from "../lib/supabase";
import { colors, fontSize, radius, spacing } from "../lib/theme";
import type { AppStackParamList } from "../navigation/AppNavigator";

// Header control shown on every authenticated screen -- the app's only entry
// point to profile/sign-out that doesn't depend on being on TeamHome.
export function ProfileMenu() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        testID="header-menu-open"
        accessibilityRole="button"
        accessibilityLabel="Open profile menu"
        hitSlop={12}
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="menu" size={24} color={colors.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              testID="profile-menu-profile"
              style={styles.option}
              onPress={() => {
                setOpen(false);
                navigation.navigate("Profile");
              }}
            >
              <Text style={styles.optionText}>Profile</Text>
            </Pressable>
            <Pressable
              testID="profile-menu-sign-out"
              style={styles.option}
              onPress={() => {
                setOpen(false);
                supabase.auth.signOut();
              }}
            >
              <Text style={[styles.optionText, styles.optionTextDanger]}>
                Sign out
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: spacing.md,
  },
  sheet: {
    width: 180,
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
  optionTextDanger: {
    color: colors.danger,
  },
});
