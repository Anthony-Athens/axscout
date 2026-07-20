import Link from "next/link";

type UpgradeCtaProps = {
  href?: string;
  label?: string;
  className?: string;
};

export default function UpgradeCta({
  href = "/contact",
  label = "Request beta access",
  className = "",
}: UpgradeCtaProps) {
  return (
    <div className={className}>
      <p className="text-sm leading-6 text-slate-600">
        Premium and Pro access are currently available to beta testers. Contact
        AXScout to request access.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {label}
      </Link>
    </div>
  );
}
