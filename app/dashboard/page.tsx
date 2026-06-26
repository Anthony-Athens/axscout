import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase/client";

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

export default async function DashboardPage() {
  const lastUpdated = await getLastSuccessfulRefresh();

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
          title="Favorite Team Insights"
          description="Once team selection is enabled, your personalized analytics will appear here."
        >
          <EmptyState
            title="No favorite teams selected"
            description="You will eventually choose your favorite MLB teams during onboarding or from your profile."
          />
        </SectionCard>
      </div>
    </div>
  );
}