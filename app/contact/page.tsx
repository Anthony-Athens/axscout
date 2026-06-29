import type { Metadata } from "next";

import ContactForm from "@/app/contact/ContactForm";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact AXScout to request baseball analysis, report a bug, suggest a data idea, or discuss collaboration.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        label="Contact"
        title="Contact and collaboration"
        description="Request an analysis, report a bug, suggest a data idea, or start a conversation about working with AXScout."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <SectionCard
          title="Send a message"
          description="Share enough detail for us to understand the request and follow up thoughtfully."
        >
          <ContactForm />
        </SectionCard>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Good reasons to reach out</h2>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Request a custom team, player, or matchup analysis.</li>
            <li>Report a data issue or unexpected product behavior.</li>
            <li>Suggest a metric, source, or scouting workflow.</li>
            <li>Discuss research, media, data, or product collaboration.</li>
          </ul>
          <p className="border-t border-slate-200 pt-4 text-sm leading-6 text-slate-500">
            AXScout is in public beta. Specific examples, URLs, and screenshots help us investigate quickly.
          </p>
        </aside>
      </div>
    </div>
  );
}
