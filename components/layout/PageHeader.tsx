type PageHeaderProps = {
  label?: string;
  title: string;
  description?: string;
};

export default function PageHeader({
  label,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="mb-8 max-w-3xl">
      {label && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-400">
          {label}
        </p>
      )}

      <h1 className="text-4xl font-bold tracking-tight text-white">
        {title}
      </h1>

      {description && (
        <p className="mt-3 text-lg text-slate-300">{description}</p>
      )}
    </div>
  );
}