type StatCardProps = {
  label: string;
  value: string | number;
  helperText?: string;
};

export default function StatCard({ label, value, helperText }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      {helperText && <p className="mt-2 text-sm text-slate-500">{helperText}</p>}
    </div>
  );
}
