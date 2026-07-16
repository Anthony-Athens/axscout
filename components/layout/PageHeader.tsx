type PageHeaderProps = {
  label?: string;
  title: string;
  description?: string;
  responsive?: boolean;
};

export default function PageHeader({
  label,
  title,
  description,
  responsive = false,
}: PageHeaderProps) {
  return (
    <div className={`${responsive ? "mb-5 sm:mb-8" : "mb-8"} max-w-3xl`}>
      {label && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
          {label}
        </p>
      )}

      <h1 className={`${responsive ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl"} font-extrabold tracking-tight text-slate-950`}>
        {title}
      </h1>

      {description && (
        <p className={`${responsive ? "mt-3 text-base md:mt-4 md:text-lg" : "mt-4 text-lg"} leading-7 text-slate-600`}>{description}</p>
      )}
    </div>
  );
}
