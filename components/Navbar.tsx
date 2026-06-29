import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          AXScout
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/trends/team">Team Trends</Link>
          <Link href="/trends/individual">Player Trends</Link>
          <Link href="/scouting-report">Scouting Report</Link>
          <Link href="/betting">Betting</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>

          <span className="hidden h-5 w-px bg-slate-700 sm:block" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase text-slate-500">
            {user ? "Logged In" : "Logged Out"}
          </span>

          {user ? (
            <>
              <Link href="/profile" className="text-blue-300 hover:text-blue-200">
                Profile
              </Link>
              <form action={logout}>
                <button type="submit" className="text-blue-300 hover:text-blue-200">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-blue-300 hover:text-blue-200">
                Login
              </Link>
              <Link href="/signup" className="text-blue-300 hover:text-blue-200">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
