import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase/client";
import TeamSelector from "@/components/TeamSelector";

async function getLastSuccessfulRefresh() {
  const { data, error } = await supabase
    .from("data_refresh_runs")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.finished_at) {
    return "Awaiting data refresh";
  }

  return new Date(data.finished_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function getTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, abbreviation, name, league, division")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export default async function DashboardPage() {
  const lastUpdated = await getLastSuccessfulRefresh();
  const teams = await getTeams();

  return (
    <div>
      <PageHeader
        label="Dashboard"
        title="Your MLB Command Center"
        description="Track your favorite teams, monitor performance trends, and surface useful baseball intelligence."
      />

      <DashboardGrid>
        <StatCard label="Favorite Teams" value="0" helperText="No teams selected yet" />
        <StatCard label="Tracked Games" value="0" helperText="Coming soon" />
        <StatCard label="Model Accuracy" value="--" helperText="Coming soon" />
        <StatCard label="Last Updated" value={lastUpdated} helperText="Latest successful data refresh" />
      </DashboardGrid>

      <div className="mt-8">
        <SectionCard
          title="Select Favorite Teams"
          description="Choose the teams you want AX Scout to personalize your dashboard around."
        >
          <TeamSelector teams={teams} />
        </SectionCard>
      </div>
    </div>
  );

}