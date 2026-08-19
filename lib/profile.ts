import { supabase } from "./supabase";
import type { Profile } from "./types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * display_name is intentionally not sent: the sync_profiles_display_name
 * trigger recomposes it from first/last on write, so there is one source of
 * truth for the rendered name.
 */
export async function updateProfile(
  userId: string,
  input: { firstName: string; lastName: string; phone?: string | null },
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
