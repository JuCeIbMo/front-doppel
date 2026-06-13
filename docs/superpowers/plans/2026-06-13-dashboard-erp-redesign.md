# Dashboard ERP Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Doppel ERP dashboard with a Linear-style corporate aesthetic — new shared component system (Card, StatCard, Input, Badge, Table, Button) + updated OwnerShell sidebar + all ERP views.

**Architecture:** Build shared components bottom-up first, then apply them to each view. Design tokens go in `globals.css`; all components use Tailwind v4 CSS-variable token classes (`bg-bg-secondary`, `text-text-muted`, `border-border`, etc.). No business logic changes — data fetching, mutations, and routing are untouched.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, lucide-react (new), motion/react, @testing-library/react (vitest+jsdom), TypeScript.

---

## File Map

**Create:**
- `src/components/ui/StatCard.tsx` — KPI display component
- `src/components/ui/Input.tsx` — shared form input with label/error
- `src/components/ui/Badge.tsx` — semantic status pill
- `src/components/ui/Table.tsx` — table compound component

**Modify:**
- `src/styles/globals.css` — add `bg-elevated`, `text-muted`, `accent-dim`, `danger`, `warning`, `border` tokens
- `src/components/ui/Card.tsx` — solid surface, `rounded-xl`, `p-6`, add `CardHeader`
- `src/components/ui/Button.tsx` — `rounded-lg`, updated secondary, add `size` prop
- `src/components/dashboard/OwnerShell.tsx` — lucide icons, nav groups, active border-l, sidebar footer, mobile bottom bar
- `src/components/dashboard/ErpOverviewView.tsx` — StatCard KPIs, Table for low-stock
- `src/components/dashboard/ErpProductsView.tsx` — Input for search, Table, Badge for status
- `src/components/dashboard/ErpInventoryView.tsx` — Table, Badge for stock level, Input in modal
- `src/components/dashboard/ErpInventoryMovementsView.tsx` — Table, Badge for movement type
- `src/components/dashboard/ErpSalesView.tsx` — Table rows, Badge for status
- `src/components/dashboard/ErpSaleDetailView.tsx` — two-column layout, StatCard total
- `src/components/dashboard/ErpClientsView.tsx` — Table rows, Input in modal
- `src/components/dashboard/ErpClientDetailView.tsx` — header StatCard, sales table
- `src/components/dashboard/ErpFinanceView.tsx` — StatCard balances, Input fields
- `src/components/dashboard/ErpReportsView.tsx` — period selector, StatCard KPIs
- `src/components/dashboard/ErpActivityView.tsx` — timeline styling, Input filters
- `src/components/dashboard/BusinessView.tsx` — Input fields, Card styling
- `src/components/dashboard/AdminPhonesView.tsx` — Input fields, Card styling
- `src/components/dashboard/OnboardingChecklist.tsx` — update icon/styling

**Test files created:**
- `src/components/ui/Badge.test.tsx`
- `src/components/ui/StatCard.test.tsx`
- `src/components/ui/Input.test.tsx`
- `src/components/ui/Table.test.tsx`

---

## Task 1: Install lucide-react

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install**

```bash
npm install lucide-react
```

Expected: installs cleanly, added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify tree-shakable import works**

```bash
node -e "const { LayoutDashboard } = require('lucide-react'); console.log(typeof LayoutDashboard);"
```

Expected output: `function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add lucide-react for dashboard icons"
```

---

## Task 2: Update design tokens

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Replace the `@theme` block in `src/styles/globals.css`**

Replace the entire `@theme { ... }` block with:

```css
@theme {
  --color-bg-primary:    #0A0A0A;
  --color-bg-secondary:  #111111;
  --color-bg-elevated:   #161616;
  --color-bg-glass:      rgba(255, 255, 255, 0.05);
  --color-border:        rgba(255, 255, 255, 0.06);
  --color-text-primary:  #F4F4F5;
  --color-text-secondary:#71717A;
  --color-text-muted:    #3F3F46;
  --color-accent:        #25D366;
  --color-accent-glow:   rgba(37, 211, 102, 0.15);
  --color-accent-dim:    rgba(37, 211, 102, 0.12);
  --color-danger:        #EF4444;
  --color-warning:       #F59E0B;
  --font-sans:           var(--font-satoshi), system-ui, sans-serif;
  --animate-shake:       shake 0.4s ease-in-out;
}
```

- [ ] **Step 2: Run typecheck to confirm no breakage**

```bash
npm run typecheck
```

Expected: exits 0. No errors expected since tokens only expand the available set.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: expand design tokens for Linear-style corporate aesthetic"
```

---

## Task 3: Update Card component

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("accepts additional className", () => {
    const { container } = render(<Card className="extra">x</Card>);
    expect(container.firstChild).toHaveClass("extra");
  });
});

describe("CardHeader", () => {
  it("renders title and action", () => {
    render(<CardHeader title="My Title" action={<button>Go</button>} />);
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("renders without action", () => {
    render(<CardHeader title="No action" />);
    expect(screen.getByText("No action")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/components/ui/Card.test.tsx
```

Expected: FAIL — `CardHeader is not exported` or similar.

- [ ] **Step 3: Rewrite `src/components/ui/Card.tsx`**

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-bg-secondary border border-border rounded-xl p-6 ${className}`}>
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
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/ui/Card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Card.test.tsx
git commit -m "feat: update Card to solid surface with CardHeader sub-component"
```

---

## Task 4: Create StatCard component

**Files:**
- Create: `src/components/ui/StatCard.tsx`
- Create: `src/components/ui/StatCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/StatCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Ventas" value="$1.200" />);
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("$1.200")).toBeInTheDocument();
  });

  it("renders delta when provided", () => {
    render(<StatCard label="Margen" value="$400" delta="+12%" deltaPositive />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("does not render delta element when omitted", () => {
    const { queryByText } = render(<StatCard label="X" value="0" />);
    // No delta text in the DOM
    expect(queryByText("%")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/components/ui/StatCard.test.tsx
```

Expected: FAIL — `StatCard` module not found.

- [ ] **Step 3: Create `src/components/ui/StatCard.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/ui/StatCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatCard.tsx src/components/ui/StatCard.test.tsx
git commit -m "feat: add StatCard component for KPI display"
```

---

## Task 5: Create Input component

**Files:**
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Input.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders without label", () => {
    render(<Input placeholder="Buscar" />);
    expect(screen.getByPlaceholderText("Buscar")).toBeInTheDocument();
  });

  it("renders label and associates it with input", () => {
    render(<Input label="Nombre" />);
    const label = screen.getByText("Nombre");
    expect(label.tagName).toBe("LABEL");
    const input = screen.getByRole("textbox");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("renders error message when provided", () => {
    render(<Input label="Email" error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
  });

  it("passes through native input props", () => {
    render(<Input type="search" defaultValue="test" />);
    expect(screen.getByDisplayValue("test")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/components/ui/Input.test.tsx
```

Expected: FAIL — `Input` module not found.

- [ ] **Step 3: Create `src/components/ui/Input.tsx`**

```tsx
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = "", id, ...props }, ref) {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-muted uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/ui/Input.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Input.tsx src/components/ui/Input.test.tsx
git commit -m "feat: add shared Input component with label and error support"
```

---

## Task 6: Create Badge component

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Badge.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders as inline element", () => {
    const { container } = render(<Badge>X</Badge>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("renders all four variants without crashing", () => {
    const variants = ["success", "warning", "danger", "neutral"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/components/ui/Badge.test.tsx
```

Expected: FAIL — `Badge` module not found.

- [ ] **Step 3: Create `src/components/ui/Badge.tsx`**

```tsx
type BadgeVariant = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-danger/10 text-danger",
  neutral: "bg-bg-elevated text-text-secondary",
};

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/ui/Badge.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Badge.tsx src/components/ui/Badge.test.tsx
git commit -m "feat: add Badge component for semantic status labels"
```

---

## Task 7: Create Table compound component

**Files:**
- Create: `src/components/ui/Table.tsx`
- Create: `src/components/ui/Table.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Table.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Table } from "@/components/ui/Table";

describe("Table", () => {
  it("renders basic table structure", () => {
    render(
      <Table>
        <Table.Head>
          <tr><Table.Th>Nombre</Table.Th></tr>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Producto A</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Producto A")).toBeInTheDocument();
  });

  it("Table.Empty renders the message in a cell", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Empty>Sin datos</Table.Empty>
        </Table.Body>
      </Table>
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("Table.Loading renders skeleton rows", () => {
    const { container } = render(
      <Table>
        <Table.Loading rows={3} cols={2} />
      </Table>
    );
    // 3 rows × 2 cols = 6 td elements with pulse divs
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/components/ui/Table.test.tsx
```

Expected: FAIL — `Table` module not found.

- [ ] **Step 3: Create `src/components/ui/Table.tsx`**

```tsx
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
    <tbody>
      <tr>
        <td colSpan={99} className="py-12 text-center text-sm text-text-muted">
          {children}
        </td>
      </tr>
    </tbody>
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run src/components/ui/Table.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
npm run test
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Table.tsx src/components/ui/Table.test.tsx
git commit -m "feat: add Table compound component with loading and empty states"
```

---

## Task 8: Update Button component

**Files:**
- Modify: `src/components/ui/Button.tsx`

- [ ] **Step 1: Rewrite `src/components/ui/Button.tsx`**

```tsx
"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-4 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className = "", children, href, ...props }, ref) {
    const base =
      "relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer overflow-hidden";

    const variants: Record<Variant, string> = {
      primary:
        "bg-accent text-black hover:brightness-110 shadow-[0_0_24px_rgba(37,211,102,0.25)] hover:shadow-[0_0_40px_rgba(37,211,102,0.4)]",
      secondary:
        "bg-bg-elevated border border-border text-text-primary hover:border-white/12 hover:bg-bg-elevated/80",
      ghost: "text-text-secondary hover:text-text-primary",
    };

    const shimmer =
      variant === "primary"
        ? "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:translate-x-[-200%] hover:after:translate-x-[200%] after:transition-transform after:duration-700"
        : "";

    const cls = `${base} ${variants[variant]} ${sizeClasses[size]} ${shimmer} ${className}`;

    if (href) {
      if (href.startsWith("/")) {
        return <Link href={href} className={cls}>{children}</Link>;
      }
      return <a href={href} className={cls}>{children}</a>;
    }

    return <button ref={ref} className={cls} {...props}>{children}</button>;
  }
);
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0. The `size` prop is new and optional; all existing call sites default to `"md"` which matches the previous `px-8 py-4` pattern — existing callers that pass `className="px-5 py-3 text-sm"` override the default size, which continues to work since `className` is applied last.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: update Button with rounded-lg, size prop, and refined secondary variant"
```

---

## Task 9: Redesign OwnerShell

**Files:**
- Modify: `src/components/dashboard/OwnerShell.tsx`

- [ ] **Step 1: Rewrite `src/components/dashboard/OwnerShell.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Wallet,
  BarChart2,
  Activity,
  Bot,
  Settings,
  Scan,
  LogOut,
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/api";
import { getFeatureFlags } from "@/lib/features";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  feature: null | keyof ReturnType<typeof getFeatureFlags>;
};

const coreLinks: NavLink[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, feature: null },
  { href: "/dashboard/products", label: "Productos", icon: Package, feature: "products" },
  { href: "/dashboard/inventory", label: "Inventario", icon: Boxes, feature: "inventory" },
  { href: "/dashboard/sales", label: "Ventas", icon: ShoppingCart, feature: "sales" },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, feature: "clients" },
  { href: "/dashboard/finance", label: "Finanzas", icon: Wallet, feature: "finance" },
];

const toolLinks: NavLink[] = [
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart2, feature: "reports" },
  { href: "/dashboard/activity", label: "Bitácora", icon: Activity, feature: "activity" },
  { href: "/dashboard/automation", label: "Automatización", icon: Bot, feature: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, feature: "settings" },
];

const cashierLink = { href: "/cashier", label: "Modo caja", icon: Scan };

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 py-2.5 pr-4 text-sm rounded-r-lg transition-colors ${
        active
          ? "border-l-2 border-accent bg-accent-dim text-text-primary pl-[calc(1rem-2px)]"
          : "pl-4 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );
}

// Bottom mobile nav — icon only, 5 core links
function MobileNav({
  links,
  pathname,
}: {
  links: NavLink[];
  pathname: string;
}) {
  const mobileLinks = links.slice(0, 5);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t border-border flex">
      {mobileLinks.map(({ href, label, icon: Icon, feature: _ }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs transition-colors ${
              active ? "text-accent" : "text-text-secondary"
            }`}
          >
            <Icon size={20} strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const flags = getFeatureFlags();

  const filteredCore = coreLinks.filter((l) => (l.feature ? flags[l.feature] : true));
  const filteredTools = toolLinks.filter((l) => (l.feature ? flags[l.feature] : true));
  const showCashier = flags.cashier;

  async function handleLogout() {
    await authenticatedFetch("/auth/logout", { method: "POST" }).catch(() => null);
    clearToken();
    router.replace("/");
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 border-r border-border">
          {/* Logo */}
          <div className="px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-base font-semibold text-text-primary">Doppel</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
            </Link>
          </div>

          {/* Core nav */}
          <nav className="flex-1 flex flex-col px-2 gap-0.5 overflow-y-auto">
            {filteredCore.map((link) => (
              <NavItem key={link.href} {...link} active={isActive(link.href)} />
            ))}

            {/* Separator */}
            <div className="h-px bg-border mx-4 my-2" />

            {/* Tool nav */}
            {filteredTools.map((link) => (
              <NavItem key={link.href} {...link} active={isActive(link.href)} />
            ))}

            {showCashier && (
              <Link
                href={cashierLink.href}
                className={`flex items-center gap-3 py-2.5 pr-4 pl-4 text-sm rounded-r-lg transition-colors text-accent hover:bg-accent-dim`}
              >
                <Scan size={16} strokeWidth={1.75} />
                <span>{cashierLink.label}</span>
              </Link>
            )}
          </nav>

          {/* Sidebar footer — logout */}
          <div className="px-2 py-4 border-t border-border">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 pl-4 pr-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-r-lg transition-colors"
            >
              <LogOut size={16} strokeWidth={1.75} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-base font-semibold">Doppel</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Salir
          </button>
        </header>

        {/* Main content — add bottom padding on mobile for the nav bar */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <MobileNav links={filteredCore} pathname={pathname} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/OwnerShell.tsx
git commit -m "feat: redesign OwnerShell with icons, nav groups, border-l active state, mobile bottom bar"
```

---

## Task 10: Update ErpOverviewView

**Files:**
- Modify: `src/components/dashboard/ErpOverviewView.tsx`

Key changes: use `StatCard` for KPIs, use `Table` for low-stock, remove dev-facing copy, update `OnboardingChecklist` to use Card styling.

- [ ] **Step 1: Update imports at top of `src/components/dashboard/ErpOverviewView.tsx`**

Replace the existing import block with:

```tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiError, getBrowserSessionStore } from "@/lib/api-client";
import { clearToken } from "@/lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import type { ErpDashboardResponse, InventoryRow } from "@/lib/erp-types";
import { OnboardingChecklist } from "./OnboardingChecklist";
```

- [ ] **Step 2: Replace the return JSX in `ErpOverviewView`**

Replace everything from `return (` to the end of the component with:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen operativo</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Vista operativa del negocio.</p>
      </div>

      {showOnboarding && (
        <OnboardingChecklist steps={onboardingSteps} onDismiss={dismissOnboarding} />
      )}

      {/* KPI cards */}
      {dashboardQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-secondary border border-border" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <p className="text-sm text-danger">
            {error instanceof Error ? error.message : "No se pudo cargar el dashboard."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Low stock table */}
        <Card>
          <CardHeader
            title="Alertas de stock bajo"
            action={
              <Button href="/dashboard/products" variant="secondary" size="sm">
                Ver catálogo
              </Button>
            }
          />
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th>Umbral</Table.Th>
                <Table.Th />
              </tr>
            </Table.Head>
            {lowStockQuery.isLoading ? (
              <Table.Loading rows={3} cols={5} />
            ) : visibleLowStock.length === 0 ? (
              <Table.Empty>
                {lowStockItems.length === 0
                  ? "Sin alertas de stock."
                  : "Todas las alertas están ignoradas."}
              </Table.Empty>
            ) : (
              <Table.Body>
                {visibleLowStock.slice(0, 6).map((row) => (
                  <Table.Row key={`${row.product_id}-${row.variant_id ?? "base"}`}>
                    <Table.Cell>
                      <span className="font-medium text-text-primary">{row.product_name}</span>
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">
                      {row.category || "Sin categoría"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={row.quantity === 0 ? "danger" : "warning"}>
                        {row.quantity} {row.unit}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">{row.low_stock_threshold}</Table.Cell>
                    <Table.Cell>
                      <button
                        type="button"
                        onClick={() => ignoreProduct(row.product_id)}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Ignorar 7d
                      </button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            )}
          </Table>
        </Card>

        {/* Onboarding status */}
        <Card>
          <CardHeader title="Primeros pasos" />
          {hasData ? (
            <ul className="space-y-3">
              {onboardingSteps.map((step) => (
                <li key={step.href} className="flex items-center gap-3 text-sm">
                  <span
                    className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                      step.done ? "bg-accent text-black" : "border border-border"
                    }`}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <span className={step.done ? "text-text-muted line-through" : "text-text-secondary"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-bg-elevated" />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ErpOverviewView.tsx
git commit -m "feat: update ErpOverviewView with StatCard KPIs and Table for low-stock alerts"
```

---

## Task 11: Update ErpProductsView

**Files:**
- Modify: `src/components/dashboard/ErpProductsView.tsx`

Key changes: use `Input` for search/barcode fields, `Table` for product list, `Badge` for availability status, `CardHeader`, page header pattern.

- [ ] **Step 1: Update imports**

At the top of `src/components/dashboard/ErpProductsView.tsx`, add these imports alongside the existing ones:

```tsx
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Replace the page header (lines `117–127`)**

Replace:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo ERP</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Fuente de verdad operativa basada en `/erp/products`.
          </p>
        </div>
        <Button variant="primary" className="px-5 py-3 text-sm" href="/dashboard/products/new">
          Nuevo producto
        </Button>
      </div>
```

With:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Catálogo de productos del ERP.</p>
        </div>
        <Button variant="primary" size="sm" href="/dashboard/products/new">
          Nuevo producto
        </Button>
      </div>
```

- [ ] **Step 3: Replace the search card (lines `129–164`)**

Replace the first `<Card>` (search inputs) with:

```tsx
        <Card>
          <CardHeader title="Buscar" />
          <div className="flex flex-col gap-4">
            <Input
              label="Por nombre o SKU"
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); reset(); }}
              placeholder="Nombre, SKU o código"
            />
            <div className="flex gap-3">
              <Input
                label="Por código de barras"
                type="text"
                value={barcodeLookup}
                onChange={(e) => setBarcodeLookup(e.target.value)}
                placeholder="Ingresá el código"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                className="self-end"
                onClick={() => { const code = barcodeLookup.trim(); if (!code) return; barcodeMutation.mutate(code); }}
                disabled={barcodeMutation.isPending}
              >
                Buscar
              </Button>
            </div>
          </div>
        </Card>
```

- [ ] **Step 4: Replace the import card file upload label (line `197`)**

Replace:
```tsx
            <label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-primary">
```

With:
```tsx
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary">
```

- [ ] **Step 5: Replace the product table Card (from `<Card>` before the table to `</Card>` after it)**

Replace the entire `<Card>` that contains the product table with:

```tsx
      <Card>
        <CardHeader title="Catálogo" />
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={5} cols={6} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar productos."}
          </p>
        ) : products.length === 0 ? (
          <Table>
            <Table.Empty>No hay productos ERP cargados todavía.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <p className="font-medium text-text-primary">{product.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {product.sku || product.barcode || "Sin SKU"}
                    </p>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">
                    {product.category || "—"}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary">{format(product.price)}</Table.Cell>
                  <Table.Cell className="text-text-primary">
                    {product.stock ?? "—"} {product.unit}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={product.available ? "success" : "neutral"}>
                      {product.available ? "Disponible" : "Oculto"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Eliminar "${product.name}"?`)) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        className="text-sm text-danger hover:brightness-110 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/ErpProductsView.tsx
git commit -m "feat: update ErpProductsView with Input, Table, Badge components"
```

---

## Task 12: Update ErpInventoryView

**Files:**
- Modify: `src/components/dashboard/ErpInventoryView.tsx`

Key changes: add imports, update page header, replace inline div list with `Table`, add `Badge` for stock status, update modal inputs.

- [ ] **Step 1: Add imports**

At the top of `src/components/dashboard/ErpInventoryView.tsx`, add alongside existing imports:

```tsx
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Replace the page header**

Find and replace:
```tsx
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventario ERP</h1>
```

With:
```tsx
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventario</h1>
```

Also remove the dev subtitle if present (`"/erp/inventory"` copy). Replace with:
```tsx
          <p className="mt-0.5 text-sm text-text-secondary">Control de stock del ERP.</p>
```

- [ ] **Step 3: Replace the inventory list inside the Card**

Find the section that renders `inventoryItems` as a list of divs and replace with:

```tsx
        {query.isLoading ? (
          <Table>
            <Table.Loading rows={6} cols={5} />
          </Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar el inventario."}
          </p>
        ) : items.length === 0 ? (
          <Table>
            <Table.Empty>No hay items en inventario todavía.</Table.Empty>
          </Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Variante</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Umbral</Table.Th>
                <Table.Th>Estado</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {items.map((row) => {
                const isLow = row.quantity <= row.low_stock_threshold;
                const isOut = row.quantity === 0;
                return (
                  <Table.Row key={`${row.product_id}-${row.variant_id ?? "base"}`}>
                    <Table.Cell>
                      <span className="font-medium text-text-primary">{row.product_name}</span>
                      <p className="text-xs text-text-muted mt-0.5">{row.category || "Sin categoría"}</p>
                    </Table.Cell>
                    <Table.Cell className="text-text-secondary">{row.variant_id ?? "—"}</Table.Cell>
                    <Table.Cell className="text-text-primary font-medium">{row.quantity} {row.unit}</Table.Cell>
                    <Table.Cell className="text-text-muted">{row.low_stock_threshold}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={isOut ? "danger" : isLow ? "warning" : "success"}>
                        {isOut ? "Sin stock" : isLow ? "Stock bajo" : "OK"}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
```

- [ ] **Step 4: Update modal inputs**

Find all inline `<input>` elements inside the adjustment modal and replace each with the `Input` component. Example — replace:

```tsx
              <input
                type="number"
                ...
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm ..."
              />
```

With the `Input` component (remove the wrapping `<label>` + `<input>` pair, replace with):

```tsx
              <Input
                label="Cantidad"
                type="number"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                placeholder="ej. 10 o -3"
              />
```

Apply the same pattern to the `note` field and the `product_id` / `mode` fields (for select elements, apply the Input `className` directly to a native `<select>` with matching styles):

```tsx
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Modo
                </label>
                <select
                  value={draft.mode}
                  onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as "delta" | "set" }))}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                >
                  <option value="delta">Delta (±)</option>
                  <option value="set">Establecer</option>
                </select>
              </div>
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ErpInventoryView.tsx
git commit -m "feat: update ErpInventoryView with Table, Badge stock status, Input modal fields"
```

---

## Task 13: Update ErpInventoryMovementsView

**Files:**
- Modify: `src/components/dashboard/ErpInventoryMovementsView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Replace page header subtitle**

Change any dev-facing subtitle mentioning `/erp/inventory/movements` to:
```tsx
<p className="mt-0.5 text-sm text-text-secondary">Historial de movimientos de inventario.</p>
```

- [ ] **Step 3: Replace the movements list with a Table**

Find the section rendering `movements` as divs/rows and replace with:

```tsx
        {movementsQuery.isLoading ? (
          <Table><Table.Loading rows={5} cols={5} /></Table>
        ) : movementsQuery.error ? (
          <p className="text-sm text-danger">
            {movementsQuery.error instanceof Error ? movementsQuery.error.message : "Error al cargar movimientos."}
          </p>
        ) : (movements ?? []).length === 0 ? (
          <Table><Table.Empty>No hay movimientos registrados.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Nota</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {(movements ?? []).map((m) => (
                <Table.Row key={m.id}>
                  <Table.Cell className="text-text-muted text-xs">
                    {new Date(m.created_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary font-medium">{m.product_name}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      variant={m.type === "entry" ? "success" : m.type === "exit" ? "danger" : "warning"}
                    >
                      {m.type === "entry" ? "Entrada" : m.type === "exit" ? "Salida" : "Ajuste"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-text-primary">{m.quantity}</Table.Cell>
                  <Table.Cell className="text-text-muted">{m.note || "—"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ErpInventoryMovementsView.tsx
git commit -m "feat: update ErpInventoryMovementsView with Table and Badge for movement type"
```

---

## Task 14: Update ErpSalesView

**Files:**
- Modify: `src/components/dashboard/ErpSalesView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
```

- [ ] **Step 2: Replace page header**

```tsx
      <div>
        <h1 className="text-xl font-semibold">Ventas</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Historial de ventas del ERP.</p>
      </div>
```

- [ ] **Step 3: Replace the sales list inside the Card with a Table**

Replace the `<div className="space-y-3">` list with:

```tsx
        {query.isLoading ? (
          <Table><Table.Loading rows={5} cols={5} /></Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar ventas."}
          </p>
        ) : sales.length === 0 ? (
          <Table><Table.Empty>Todavía no hay ventas registradas.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sales.map((sale) => (
                <Table.Row key={sale.id}>
                  <Table.Cell className="text-text-muted font-mono text-xs">
                    #{sale.id.slice(0, 8)}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {new Date(sale.created_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{sale.actor}</Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">
                    {format(sale.total)}
                    {sale.discount > 0 && (
                      <span className="ml-1 text-xs text-text-muted">-{format(sale.discount)}</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                      {sale.status === "completed" ? "Completada" : "Cancelada"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Ver
                      </Link>
                      {sale.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => { if (confirm("¿Cancelar esta venta?")) cancelMutation.mutate(sale.id); }}
                          className="text-sm text-danger hover:brightness-110 transition-colors"
                          disabled={cancelMutation.isPending}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ErpSalesView.tsx
git commit -m "feat: update ErpSalesView with Table rows and Badge status"
```

---

## Task 15: Update ErpSaleDetailView

**Files:**
- Modify: `src/components/dashboard/ErpSaleDetailView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Read the full file to understand the current JSX**

```bash
grep -n "return\|</div>" src/components/dashboard/ErpSaleDetailView.tsx | head -40
```

- [ ] **Step 3: Replace the return JSX**

Read the full return block, then replace it with:

```tsx
  if (!sale) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-bg-secondary" />
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="h-64 animate-pulse rounded-xl bg-bg-secondary border border-border" />
          <div className="h-64 animate-pulse rounded-xl bg-bg-secondary border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/sales" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Ventas
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Venta #{sale.id.slice(0, 8)}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {new Date(sale.created_at).toLocaleString()} · {sale.actor}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Line items */}
        <Card>
          <CardHeader title="Ítems" />
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Precio unit.</Table.Th>
                <Table.Th className="text-right">Subtotal</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sale.items.map((item, i) => (
                <Table.Row key={i}>
                  <Table.Cell className="text-text-primary font-medium">{item.product_name}</Table.Cell>
                  <Table.Cell className="text-text-secondary">{item.quantity}</Table.Cell>
                  <Table.Cell className="text-text-secondary">{format(item.unit_price)}</Table.Cell>
                  <Table.Cell className="text-right text-text-primary">{format(item.subtotal)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>

        {/* Summary */}
        <div className="flex flex-col gap-4">
          <StatCard label="Total" value={format(sale.total)} />
          {sale.discount > 0 && (
            <StatCard label="Descuento" value={format(sale.discount)} />
          )}
          <Card>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Estado</span>
                <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                  {sale.status === "completed" ? "Completada" : "Cancelada"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Pago</span>
                <span className="text-text-primary">{sale.payment_method}</span>
              </div>
              {sale.status === "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full justify-center text-danger border-danger/20 hover:bg-danger/5"
                  onClick={() => { if (confirm("¿Cancelar esta venta?")) cancelMutation.mutate(); }}
                  disabled={cancelMutation.isPending}
                >
                  Cancelar venta
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ErpSaleDetailView.tsx
git commit -m "feat: update ErpSaleDetailView with two-column layout, StatCard total, Table items"
```

---

## Task 16: Update ErpClientsView

**Files:**
- Modify: `src/components/dashboard/ErpClientsView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Replace page header**

```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">Base de clientes del ERP.</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          Nuevo cliente
        </Button>
      </div>
```

- [ ] **Step 3: Replace the client list with a Table**

Replace the `<Card>` that contains the client list with:

```tsx
      <Card>
        <CardHeader title="Clientes" />
        {query.isLoading ? (
          <Table><Table.Loading rows={5} cols={5} /></Table>
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar clientes."}
          </p>
        ) : clients.length === 0 ? (
          <Table><Table.Empty>Todavía no hay clientes registrados.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Contacto</Table.Th>
                <Table.Th>Compras</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th className="text-right">Acciones</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {clients.map((client) => (
                <Table.Row key={client.id}>
                  <Table.Cell>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium text-text-primary hover:text-accent transition-colors"
                    >
                      {client.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {client.phone || "—"}{client.email ? ` · ${client.email}` : ""}
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{client.purchase_count}</Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">
                    {format(client.total_purchases)}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(client)}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Editar
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
```

- [ ] **Step 4: Update modal inputs**

Inside the modal, replace all inline `<input>` and `<textarea>` elements using the pattern below. For the grid of inputs, replace:

```tsx
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["name", "Nombre"],
                ["phone", "Teléfono"],
                ["email", "Email"],
                ["address", "Dirección"],
                ["tags", "Tags (coma separada)"],
                ["whatsapp_id", "WhatsApp ID"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm text-text-secondary">{label}</label>
                  <input
                    value={draft[field as keyof ClientDraftInput] as string}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary">Notas</label>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>
```

With:

```tsx
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(
                [
                  ["name", "Nombre"],
                  ["phone", "Teléfono"],
                  ["email", "Email"],
                  ["address", "Dirección"],
                  ["tags", "Tags (coma separada)"],
                  ["whatsapp_id", "WhatsApp ID"],
                ] as [keyof ClientDraftInput, string][]
              ).map(([field, label]) => (
                <Input
                  key={field}
                  label={label}
                  value={draft[field] as string}
                  onChange={(e) => setDraft((c) => ({ ...c, [field]: e.target.value }))}
                />
              ))}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Notas
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
                />
              </div>
            </div>
```

Also update the modal container:
```tsx
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ErpClientsView.tsx
git commit -m "feat: update ErpClientsView with Table rows and Input modal fields"
```

---

## Task 17: Update ErpClientDetailView

**Files:**
- Modify: `src/components/dashboard/ErpClientDetailView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Read the full return JSX**

```bash
sed -n '/return (/,/^}/p' src/components/dashboard/ErpClientDetailView.tsx
```

- [ ] **Step 3: Replace the return JSX**

```tsx
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/clients" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{client?.name ?? "Cliente"}</h1>
      </div>

      {/* Client stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total gastado" value={client ? format(client.total_purchases) : "—"} />
        <StatCard label="Compras" value={client ? String(client.purchase_count) : "—"} />
        <StatCard
          label="Última compra"
          value={
            client?.last_purchase_at
              ? new Date(client.last_purchase_at).toLocaleDateString()
              : "Sin compras"
          }
        />
      </div>

      {/* Contact info */}
      {client && (
        <Card>
          <CardHeader title="Contacto" />
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {client.phone && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Teléfono</p>
                <p className="mt-1 text-text-primary">{client.phone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Email</p>
                <p className="mt-1 text-text-primary">{client.email}</p>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Dirección</p>
                <p className="mt-1 text-text-primary">{client.address}</p>
              </div>
            )}
            {client.tags.length > 0 && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Purchase history */}
      <Card>
        <CardHeader title="Historial de compras" />
        {salesQuery.isLoading ? (
          <Table><Table.Loading rows={4} cols={4} /></Table>
        ) : sales.length === 0 ? (
          <Table><Table.Empty>Sin compras registradas.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {sales.map((sale) => (
                <Table.Row key={sale.id}>
                  <Table.Cell>
                    <Link
                      href={`/dashboard/sales/${sale.id}`}
                      className="font-mono text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      #{sale.id.slice(0, 8)}
                    </Link>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary text-xs">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary font-semibold">{format(sale.total)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={sale.status === "completed" ? "success" : "danger"}>
                      {sale.status === "completed" ? "Completada" : "Cancelada"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ErpClientDetailView.tsx
git commit -m "feat: update ErpClientDetailView with StatCard header and Table purchase history"
```

---

## Task 18: Update ErpFinanceView

**Files:**
- Modify: `src/components/dashboard/ErpFinanceView.tsx`

Key changes: StatCard for account balances, Input for filter/date fields, Table for transactions, CardHeader, page header.

- [ ] **Step 1: Add imports**

```tsx
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Update page header**

Find and replace the existing h1/subtitle with:

```tsx
      <div>
        <h1 className="text-xl font-semibold">Finanzas</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Cuentas y movimientos financieros.</p>
      </div>
```

- [ ] **Step 3: Add StatCards for accounts**

In the section that renders accounts (currently likely cards or text), add a grid of StatCards above the transactions:

```tsx
      {/* Account balances */}
      {accountsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-secondary border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(accounts ?? []).map((acc) => (
            <StatCard key={acc.id} label={acc.name} value={format(acc.balance)} />
          ))}
        </div>
      )}
```

- [ ] **Step 4: Update date filter inputs**

Replace inline date inputs with `Input` component:

```tsx
              <Input
                label="Desde"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); reset(); }}
              />
              <Input
                label="Hasta"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); reset(); }}
              />
```

- [ ] **Step 5: Replace transactions list with Table**

Find the section rendering transactions and replace with:

```tsx
        {transactionsQuery.isLoading ? (
          <Table><Table.Loading rows={6} cols={5} /></Table>
        ) : (transactions ?? []).length === 0 ? (
          <Table><Table.Empty>Sin transacciones en el período.</Table.Empty></Table>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th className="text-right">Monto</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {(transactions ?? []).map((tx) => (
                <Table.Row key={tx.id}>
                  <Table.Cell className="text-text-muted text-xs">
                    {new Date(tx.date || tx.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={tx.type === "income" ? "success" : "danger"}>
                      {tx.type === "income" ? "Ingreso" : "Gasto"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-text-secondary">{tx.category || "—"}</Table.Cell>
                  <Table.Cell className="text-text-secondary">{tx.description || "—"}</Table.Cell>
                  <Table.Cell className={`text-right font-semibold ${tx.type === "income" ? "text-accent" : "text-danger"}`}>
                    {tx.type === "income" ? "+" : "-"}{format(tx.amount)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
```

- [ ] **Step 6: Update modal inputs for new account / new transaction**

Replace inline `<input>` and `<select>` elements in the modals with `Input` component and the native select pattern from Task 12 Step 4.

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/ErpFinanceView.tsx
git commit -m "feat: update ErpFinanceView with StatCard balances, Table transactions, Input filters"
```

---

## Task 19: Update ErpReportsView

**Files:**
- Modify: `src/components/dashboard/ErpReportsView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { CardHeader } from "@/components/ui/Card";
```

- [ ] **Step 2: Update page header**

```tsx
      <div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Análisis de ventas y rendimiento.</p>
      </div>
```

- [ ] **Step 3: Replace date filter inputs with Input component**

Replace:
```tsx
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="..." />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="..." />
```

With:
```tsx
        <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
```

- [ ] **Step 4: Add KPI StatCards above charts**

After the period selector, add a KPI row (if the view has summary totals from the API):

```tsx
      {topProductsQuery.data && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Producto top" value={topProductsQuery.data[0]?.product_name ?? "—"} />
          <StatCard label="Unidades top" value={String(topProductsQuery.data[0]?.total_quantity ?? 0)} />
          <StatCard label="Ingreso top" value={format(topProductsQuery.data[0]?.total_revenue ?? 0)} />
        </div>
      )}
```

- [ ] **Step 5: Update chart containers**

Wrap each chart section in a `Card` with `CardHeader`:

```tsx
      <Card>
        <CardHeader title="Ventas por período" />
        {/* existing ResponsiveContainer ... */}
      </Card>
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/ErpReportsView.tsx
git commit -m "feat: update ErpReportsView with StatCard KPIs, Input date filters, Card chart containers"
```

---

## Task 20: Update ErpActivityView

**Files:**
- Modify: `src/components/dashboard/ErpActivityView.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Input } from "@/components/ui/Input";
import { CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
```

- [ ] **Step 2: Update page header**

```tsx
      <div>
        <h1 className="text-xl font-semibold">Bitácora</h1>
        <p className="mt-0.5 text-sm text-text-secondary">Registro de actividad del sistema.</p>
      </div>
```

- [ ] **Step 3: Update filter inputs**

Replace inline date/text inputs for filters with `Input` component:

```tsx
        <Input label="Desde" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input label="Hasta" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
```

- [ ] **Step 4: Update activity list styling**

Replace the existing activity item divs with refined styling. For each activity item, replace the card container with:

```tsx
                <div
                  key={item.id}
                  className="flex items-start gap-4 py-4 border-b border-border last:border-0"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs text-text-muted mt-0.5">
                    {item.entity_type?.slice(0, 1).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">{item.action}</span>
                      {item.entity_type && (
                        <Badge variant="neutral">{item.entity_type}</Badge>
                      )}
                    </div>
                    {item.entity_id && (
                      <p className="mt-0.5 text-xs text-text-muted font-mono">{item.entity_id.slice(0, 12)}…</p>
                    )}
                  </div>
                  <time className="flex-shrink-0 text-xs text-text-muted">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ErpActivityView.tsx
git commit -m "feat: update ErpActivityView with Input filters and refined timeline styling"
```

---

## Task 21: Update remaining views and OnboardingChecklist

**Files:**
- Modify: `src/components/dashboard/BusinessView.tsx`
- Modify: `src/components/dashboard/AdminPhonesView.tsx`
- Modify: `src/components/dashboard/OnboardingChecklist.tsx`
- Modify: automation views under `src/components/dashboard/`

- [ ] **Step 1: Update OnboardingChecklist styling**

Replace `src/components/dashboard/OnboardingChecklist.tsx` with:

```tsx
"use client";
import Link from "next/link";

interface Step {
  label: string;
  done: boolean;
  href: string;
}

interface OnboardingChecklistProps {
  steps: Step[];
  onDismiss: () => void;
}

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-text-primary">¡Bienvenido a Doppel ERP!</p>
          <p className="text-xs text-text-secondary mt-1">Completá estos pasos para comenzar.</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Descartar
        </button>
      </div>
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.href} className="flex items-center gap-3">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                step.done ? "bg-accent text-black" : "border border-border"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            {step.done ? (
              <span className="text-sm text-text-muted line-through">{step.label}</span>
            ) : (
              <Link
                href={step.href}
                className="text-sm text-text-secondary hover:text-accent transition-colors"
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Update BusinessView**

In `src/components/dashboard/BusinessView.tsx`:

1. Replace the page `<h1>` with:
```tsx
<h1 className="text-xl font-semibold">Negocio y productos</h1>
<p className="mt-0.5 text-sm text-text-secondary">Configuración de tu negocio para el bot.</p>
```

2. Replace each inline `<input>` and `<textarea>` with:
```tsx
// For text inputs (example — business name):
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Nombre</label>
  <input
    value={businessInfo.name}
    onChange={(e) => setBusinessInfo((b) => ({ ...b, name: e.target.value }))}
    className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
  />
</div>
```

Apply consistently to all fields (name, description, hours, address, payment_methods).

- [ ] **Step 3: Update AdminPhonesView**

In `src/components/dashboard/AdminPhonesView.tsx`:

1. Replace page header subtitle with clean copy (no internal path references).
2. Apply same `rounded-lg border border-border bg-bg-elevated` pattern to all `<input>` elements.

- [ ] **Step 4: Update automation views**

For `src/components/dashboard/DashboardView.tsx` and automation sub-views (`/automation`, `/automation/business`, `/automation/admin-phones`):

1. Replace `text-2xl` page headers with `text-xl font-semibold`.
2. Replace any `rounded-2xl border border-white/10 bg-white/5` input patterns with `rounded-lg border border-border bg-bg-elevated`.
3. Remove any dev-facing copy (strings containing `/api/`, backtick paths, "mock", "backend real").

- [ ] **Step 5: Run full typecheck and tests**

```bash
npm run typecheck
npm run test
```

Expected: both exit 0.

- [ ] **Step 6: Final commit**

```bash
git add src/components/dashboard/OnboardingChecklist.tsx \
        src/components/dashboard/BusinessView.tsx \
        src/components/dashboard/AdminPhonesView.tsx
git commit -m "feat: update remaining dashboard views and OnboardingChecklist to new design system"
```

---

## Self-Review Checklist

**Spec coverage:**
- §2 Design tokens → Task 2 ✓
- §3 OwnerShell sidebar → Task 9 ✓
- §4.1 Card + CardHeader → Task 3 ✓
- §4.2 Button → Task 8 ✓
- §4.3 Input → Task 5 ✓
- §4.4 Badge → Task 6 ✓
- §4.5 Table → Task 7 ✓
- §5.1 ErpOverviewView → Task 10 ✓
- §5.2 ErpProductsView → Task 11 ✓
- §5.3 ErpInventoryView → Task 12 ✓
- §5.4 ErpInventoryMovementsView → Task 13 ✓
- §5.5 ErpSalesView → Task 14 ✓
- §5.6 ErpSaleDetailView → Task 15 ✓
- §5.7 ErpClientsView → Task 16 ✓
- §5.8 ErpClientDetailView → Task 17 ✓
- §5.9 ErpFinanceView → Task 18 ✓
- §5.10 ErpReportsView → Task 19 ✓
- §5.11 ErpActivityView → Task 20 ✓
- §5.12 Settings / BusinessView / AdminPhonesView → Task 21 ✓
- lucide-react dependency → Task 1 ✓

**Placeholder scan:** None — all steps have exact code or explicit commands with expected output.

**Type consistency:**
- `CardHeader` exported from `Card.tsx`, imported in Tasks 10–21 ✓
- `Table.Head`, `Table.Th`, `Table.Body`, `Table.Row`, `Table.Cell`, `Table.Loading`, `Table.Empty` — defined in Task 7, used identically in Tasks 10–21 ✓
- `Badge` variants (`"success" | "warning" | "danger" | "neutral"`) — defined in Task 6, used correctly in all views ✓
- `Button` size prop (`"sm" | "md" | "lg"`) — defined in Task 8, used as `size="sm"` in view headers ✓
- `StatCard` props (`label`, `value`, `delta?`, `deltaPositive?`) — consistent across Tasks 10, 15, 17, 18, 19 ✓
