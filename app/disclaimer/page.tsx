import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Important limitations and beta disclosures for AXScout analytics and reports.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        label="Legal"
        title="Disclaimer"
        description="Important context for using AXScout data, analytics, and reports during public beta."
      />
      <SectionCard title="Informational use only">
        <p className="text-sm leading-7 text-slate-700">
          AXScout is provided for informational and entertainment purposes only. Nothing on the platform is financial, betting, gambling, investment, legal, or professional advice. Users are responsible for their own decisions and for complying with applicable laws and regulations.
        </p>
      </SectionCard>
      <SectionCard title="Data limitations">
        <p className="text-sm leading-7 text-slate-700">
          Baseball data may be delayed, incomplete, unavailable, or contain errors. AXScout does not guarantee that schedules, statistics, player information, reports, or derived metrics are accurate, current, or suitable for a particular purpose.
        </p>
      </SectionCard>
      <SectionCard title="Experimental analytics">
        <p className="text-sm leading-7 text-slate-700">
          AXScout is a beta product. Predictions, comparisons, rankings, and other analytics are experimental and may change as sources, methods, and models evolve. Past performance does not guarantee future results.
        </p>
      </SectionCard>
    </div>
  );
}
