import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export default function SignupPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        label="Sign Up"
        title="Team accounts are coming soon"
        description="Favorite teams and personalization will return after Supabase auth/session middleware is finalized."
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
