import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white text-slate-900">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          AXScout
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <Link href="/trends/team" className="hover:text-blue-600">Team Trends</Link>
          <Link href="/trends/individual" className="hover:text-blue-600">Player Trends</Link>
          <Link href="/pitchers" className="hover:text-blue-600">Pitchers</Link>
          <Link href="/scouting-report" className="hover:text-blue-600">Scouting Report</Link>
          <Link href="/predictions" className="hover:text-blue-600">Predictions</Link>
          <Link href="/blog" className="hover:text-blue-600">Blog</Link>
          <Link href="/contact" className="hover:text-blue-600">Contact</Link>

          <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase text-slate-500">
            {user ? "Logged In" : "Logged Out"}
          </span>

          {user ? (
            <>
              <Link href="/profile" className="text-blue-600 hover:text-blue-700">
                Profile
              </Link>
              <form action={logout}>
                <button type="submit" className="text-blue-600 hover:text-blue-700">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-blue-600 hover:text-blue-700">
                Login
              </Link>
              <Link href="/signup" className="text-blue-600 hover:text-blue-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
