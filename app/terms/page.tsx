import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for acceptable use of the AXScout public beta platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        label="Legal"
        title="Terms of use"
        description="The basic rules for using AXScout responsibly during public beta."
      />
      <SectionCard title="Acceptable use">
        <p className="text-sm leading-7 text-slate-700">
          You may use AXScout for lawful personal, research, and business evaluation purposes. Do not interfere with the service, attempt unauthorized access, misuse accounts, upload harmful content, or use AXScout in a way that violates the rights of others.
        </p>
      </SectionCard>
      <SectionCard title="Data and automated access">
        <p className="text-sm leading-7 text-slate-700">
          Do not republish, resell, or misuse platform data, and do not perform automated scraping or high-volume extraction without written permission. Third-party data remains subject to its source terms and applicable rights.
        </p>
      </SectionCard>
      <SectionCard title="Beta service and liability">
        <p className="text-sm leading-7 text-slate-700">
          AXScout is provided on an as-is and as-available basis during beta. Features may change, pause, or be removed, and no guarantee is made about accuracy, availability, or fitness for a particular purpose. To the fullest extent permitted by law, AXScout is not liable for losses or damages arising from use of, or reliance on, the platform.
        </p>
      </SectionCard>
    </div>
  );
}
