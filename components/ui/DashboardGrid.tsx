type DashboardGridProps = {
  children: React.ReactNode;
};

export default function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}