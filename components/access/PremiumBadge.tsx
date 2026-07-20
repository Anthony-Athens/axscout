import type { AccessTier } from "@/lib/access/entitlements";

type PremiumBadgeProps = {
  tier?: AccessTier;
  className?: string;
};

export default function PremiumBadge({
  tier = "premium",
  className = "",
}: PremiumBadgeProps) {
  const label = tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Premium";

  return (
    <span
      className={`inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ${className}`}
    >
      {label}
    </span>
  );
}
