import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Predictions Coming Soon",
  description: "AXScout's beta roadmap for rules-based predictions and future modeling work.",
};

export default function BettingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        label="Beta roadmap"
        title="Predictions are coming soon"
        description="AXScout is building the data quality, feature engineering, and validation foundation required for responsible prediction tools."
      />
      <SectionCard title="In development" description="No betting recommendations are currently published.">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Planned work includes transparent rules-based signals followed by carefully evaluated machine learning models. Any future output will remain experimental and informational, not financial or gambling advice.
        </p>
      </SectionCard>
    </div>
  );
}
