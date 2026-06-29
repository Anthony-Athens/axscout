import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-7 text-sm text-slate-600">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p>
          &copy; {new Date().getFullYear()} AXScout. Baseball intelligence powered by data.
        </p>
        <nav aria-label="Legal and support" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/contact" className="hover:text-blue-600">Contact</Link>
          <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
          <Link href="/terms" className="hover:text-blue-600">Terms</Link>
          <Link href="/disclaimer" className="hover:text-blue-600">Disclaimer</Link>
        </nav>
      </div>
    </footer>
  );
}
