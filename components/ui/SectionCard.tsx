type SectionCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export default function SectionCard({
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
