import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export default function LoginPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        label="Login"
        title="Account access is coming soon"
        description="AX Scout auth is intentionally paused while the public dashboard and data pipeline are stabilized."
      />

      <SectionCard>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
        >
          View public dashboard
        </Link>
      </SectionCard>
    </div>
  );
}
