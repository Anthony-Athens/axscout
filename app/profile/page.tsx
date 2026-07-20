import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import PremiumBadge from "@/components/access/PremiumBadge";
import { getCurrentUserAccess } from "@/lib/access/entitlements";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const access = await getCurrentUserAccess();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? user.user_metadata.full_name ?? "";
  const username = profile?.username ?? "";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("") || "AX";

  return (
    <div className="max-w-3xl">
      <PageHeader
        label="Profile"
        title="Account profile"
        description="Manage the identity shown across your AXScout account."
      />

      <SectionCard>
        <div className="mb-8 flex items-center gap-4 border-b border-slate-200 pb-6">
          <div
            aria-label="Avatar placeholder"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950">
              {fullName || "AXScout member"}
            </p>
            <p className="truncate text-sm text-slate-600">{user.email}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span>Current Access:</span>
              <PremiumBadge tier={access.tier} />
            </div>
          </div>
        </div>

        <ProfileForm fullName={fullName} username={username} />
      </SectionCard>
    </div>
  );
}
