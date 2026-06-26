import "server-only";

import { headers } from "next/headers";

export type AuthActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"fullName" | "email" | "password" | "username", string>>;
};

export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email before logging in.";
  }

  if (normalized.includes("user already registered")) {
    return "An account already exists for this email.";
  }

  if (normalized.includes("password")) {
    return "The password does not meet the account security requirements.";
  }

  return "We could not complete that request. Please try again.";
}

export async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}
