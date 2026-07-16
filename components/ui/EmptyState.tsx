type EmptyStateProps = {
  title: string;
  description: string;
  responsive?: boolean;
};

export default function EmptyState({ title, description, responsive = false }: EmptyStateProps) {
  return (
    <div className={`${responsive ? "p-5 sm:p-8" : "p-8"} w-full min-w-0 rounded-xl border border-dashed border-slate-300 bg-white text-center shadow-sm`}>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
