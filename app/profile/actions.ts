"use server";

import { revalidatePath } from "next/cache";

import type { AuthActionState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (fullName.length < 2 || fullName.length > 100) {
    fieldErrors.fullName = "Full name must be between 2 and 100 characters.";
  }

  if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    fieldErrors.username =
      "Username must be 3-30 letters, numbers, or underscores.";
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Log in and try again." };
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, username: username || null })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already in use." };
    }

    return { error: "Your profile could not be updated. Please try again." };
  }

  if (!updatedProfile) {
    return { error: "Your profile record is unavailable. Please contact support." };
  }

  revalidatePath("/profile");
  return { success: "Profile updated." };
}
