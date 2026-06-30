import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Privacy",
  description:
    "Learn how AXScout handles account information, contact submissions, authentication data, and analytics usage.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        label="Legal"
        title="Privacy"
        description="A plain-language overview of the information AXScout uses to operate the public beta."
      />
      <SectionCard title="Information you provide">
        <p className="text-sm leading-7 text-slate-700">
          When you create an account, AXScout may process your name, email address, username, profile details, and saved favorite teams. Contact form submissions include the name, email, subject, and message you choose to provide.
        </p>
      </SectionCard>
      <SectionCard title="How services are operated">
        <p className="text-sm leading-7 text-slate-700">
          Supabase provides authentication and database services for AXScout. Contact submissions are delivered through an email service provider. Basic technical or usage analytics may be collected if analytics tools are enabled to help maintain security, diagnose problems, and improve the product.
        </p>
      </SectionCard>
      <SectionCard title="Payments and data choices">
        <p className="text-sm leading-7 text-slate-700">
          AXScout does not currently offer paid plans. Stripe may be used in the future to process payments; payment card details would be handled by Stripe rather than stored directly by AXScout. Contact AXScout to ask about your account information or request an update or deletion, subject to legal and operational requirements.
        </p>
      </SectionCard>
    </div>
  );
}
