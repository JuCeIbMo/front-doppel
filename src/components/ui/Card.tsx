interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-bg-secondary border border-border rounded-xl p-4 sm:p-6 paper:rounded-none paper:border-paper-rule paper:bg-paper ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="text-base font-semibold text-text-primary paper:text-xl paper:font-extrabold paper:leading-tight">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
