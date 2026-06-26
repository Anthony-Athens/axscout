"use server";

import { redirect } from "next/navigation";

import { friendlyAuthError, type AuthActionState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!email || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}
