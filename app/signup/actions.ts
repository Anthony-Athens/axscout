"use server";

import { redirect } from "next/navigation";

import {
  friendlyAuthError,
  getSiteUrl,
  type AuthActionState,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signup(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (fullName.length < 2) {
    fieldErrors.fullName = "Enter your full name.";
  }

  if (!email || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Use at least 8 characters.";
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirect(
    "/login?message=Check%20your%20email%20to%20confirm%20your%20account."
  );
}
