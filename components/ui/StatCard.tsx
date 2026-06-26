type StatCardProps = {
  label: string;
  value: string | number;
  helperText?: string;
};

export default function StatCard({ label, value, helperText }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {helperText && <p className="mt-2 text-sm text-slate-500">{helperText}</p>}
    </div>
  );
}