"use client";

import { useEffect } from "react";

export default function PitchersError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="rounded-xl border border-rose-200 bg-white p-8 text-center"><h2 className="text-xl font-semibold text-slate-950">Pitcher intelligence could not be loaded</h2><p className="mt-2 text-sm text-slate-600">Try the request again. If the schema is new, confirm the Phase 1A SQL has been applied.</p><button onClick={() => unstable_retry()} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;
}
