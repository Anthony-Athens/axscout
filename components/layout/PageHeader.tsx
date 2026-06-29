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
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
          {label}
        </p>
      )}

      <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
        {title}
      </h1>

      {description && (
        <p className="mt-4 text-lg leading-7 text-slate-600">{description}</p>
      )}
    </div>
  );
}
