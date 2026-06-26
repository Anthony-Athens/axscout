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
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
      {(title || description) && (
        <div className="mb-5">
          {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}