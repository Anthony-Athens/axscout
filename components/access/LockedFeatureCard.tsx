import type { ReactNode } from "react";

import type { EntitledTier } from "@/lib/access/entitlements";
import PremiumBadge from "@/components/access/PremiumBadge";
import UpgradeCta from "@/components/access/UpgradeCta";

type LockedFeatureCardProps = {
  title: string;
  description: string;
  requiredTier: EntitledTier;
  children?: ReactNode;
  ctaHref?: string;
};

export default function LockedFeatureCard({
  title,
  description,
  requiredTier,
  children,
  ctaHref,
}: LockedFeatureCardProps) {
  return (
    <section className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <PremiumBadge tier={requiredTier} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5">
        {children ?? <UpgradeCta href={ctaHref} />}
      </div>
    </section>
  );
}
