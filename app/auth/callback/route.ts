import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safeNextPath = nextPath.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNextPath, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Unable%20to%20confirm%20your%20account.", request.url)
  );
}
