import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          AX Scout
        </Link>

        <div className="flex gap-6 text-sm text-slate-300">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/trends/team">Team Trends</Link>
          <Link href="/trends/individual">Player Trends</Link>
          <Link href="/scouting-report">Scouting Report</Link>
          <Link href="/betting">Betting</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </nav>
    </header>
  );
}