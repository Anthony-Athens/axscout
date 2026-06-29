import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl py-16 text-center sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">404</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
        This page is out of the lineup.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-slate-600">
        The page may have moved, or the address may be incorrect. The AXScout dashboard is a good place to get back into the game.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700">
          Return Home
        </Link>
        <Link href="/dashboard" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
          View Dashboard
        </Link>
      </div>
    </section>
  );
}
