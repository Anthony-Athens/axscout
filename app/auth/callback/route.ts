import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function requestOrigin(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = ["http", "https"].includes(forwardedProtocol ?? "")
    ? forwardedProtocol
    : request.nextUrl.protocol.replace(":", "");

  const safeHost =
    host && /^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(host);
  if (safeHost) {
    return `${protocol}://${host}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const loginUrl = new URL("/login", requestOrigin(request));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      loginUrl.searchParams.set("confirmed", "true");
      return NextResponse.redirect(loginUrl);
    }
  }

  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
