import ContactForm from "@/app/contact/ContactForm";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Contact & Collaboration",
  description:
    "Contact AXScout for feedback, collaboration, bug reports, product ideas, and baseball analytics inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        label="Connect with AXScout"
        title="Contact & Collaboration"
        description="Request Premium beta access, report a bug, suggest an improvement, commission custom baseball analysis, or start a conversation about data and partnerships."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <SectionCard
          title="Send an inquiry"
          description="Choose the request type and share enough detail for a thoughtful follow-up."
        >
          <ContactForm />
        </SectionCard>

        <aside className="space-y-5">
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Limited beta</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Premium Beta Access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              AXScout Premium is currently being tested with a small group of beta users. Use the form to request access.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Good reasons to reach out</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Report a bug or questionable data point.</li>
              <li>Suggest a feature, metric, or scouting workflow.</li>
              <li>Request custom team, player, or matchup analysis.</li>
              <li>Discuss research, media, data, or product collaboration.</li>
            </ul>
            <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-500">
              Specific examples, URLs, and device details help us investigate quickly.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
