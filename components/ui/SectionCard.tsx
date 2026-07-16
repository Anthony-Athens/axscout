type SectionCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  responsive?: boolean;
};

export default function SectionCard({
  title,
  description,
  children,
  responsive = false,
}: SectionCardProps) {
  return (
    <section className={`${responsive ? "p-4 sm:p-6" : "p-6"} w-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm`}>
      {(title || description) && (
        <div className={responsive ? "mb-4 sm:mb-5" : "mb-5"}>
          {title && (
            <h2 className={`${responsive ? "text-lg sm:text-xl" : "text-xl"} font-semibold text-slate-900`}>{title}</h2>
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
