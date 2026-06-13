interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function StatCard({ label, value, delta, deltaPositive, className = "" }: StatCardProps) {
  return (
    <div className={`bg-bg-secondary border border-border rounded-xl p-6 ${className}`}>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-text-primary">{value}</p>
      {delta && (
        <p className={`mt-1.5 text-xs font-medium ${deltaPositive ? "text-accent" : "text-danger"}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
