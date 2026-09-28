type BadgeVariant = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-accent/10 text-accent paper:bg-settled paper:text-paper",
  warning: "bg-warning/10 text-warning paper:bg-money paper:text-ink",
  danger:  "bg-danger/10 text-danger paper:bg-waiting paper:text-paper",
  neutral: "bg-bg-elevated text-text-secondary paper:border paper:border-ink/30 paper:bg-transparent paper:text-ink",
};

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium paper:rounded-none paper:font-bold paper:whitespace-nowrap ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
