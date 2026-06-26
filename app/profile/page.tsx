import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
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
        description="Manage the identity shown across your AX Scout account."
      />

      <SectionCard>
        <div className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
          <div
            aria-label="Avatar placeholder"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">
              {fullName || "AX Scout member"}
            </p>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        <ProfileForm fullName={fullName} username={username} />
      </SectionCard>
    </div>
  );
}
