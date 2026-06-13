function TableRoot({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-border">{children}</thead>;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`py-3 pr-4 text-xs font-medium text-text-muted uppercase tracking-wide first:pl-0 ${className}`}>
      {children}
    </th>
  );
}

function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`hover:bg-bg-elevated transition-colors ${className}`}>{children}</tr>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-3.5 pr-4 text-sm first:pl-0 ${className}`}>{children}</td>;
}

function Loading({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3.5 pr-4">
              <div className="h-4 rounded-md bg-bg-elevated animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={99} className="py-12 text-center text-sm text-text-muted">
        {children}
      </td>
    </tr>
  );
}

export const Table = Object.assign(TableRoot, {
  Head: THead,
  Th,
  Body: TBody,
  Row: Tr,
  Cell: Td,
  Loading,
  Empty,
});
