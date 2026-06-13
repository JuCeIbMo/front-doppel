# Dashboard ERP Redesign — Design Spec

**Date:** 2026-06-13  
**Scope:** Dashboard ERP visual redesign (Linear-style, refined corporate aesthetic)  
**Out of scope:** Landing page, AuthFlow/connect, CashierShell, business logic, API layer

---

## 1. Goals

- Elevate the dashboard from functional-but-plain to production-grade SaaS quality
- Establish a consistent, scalable component system usable across all ERP views
- Maintain the existing dark theme and WhatsApp-green accent identity
- Improve information density and visual hierarchy without adding clutter

---

## 2. Design Tokens

Update `src/styles/globals.css` `@theme` block:

```css
--color-bg-primary:    #0A0A0A   /* base canvas */
--color-bg-secondary:  #111111   /* cards, sidebar */
--color-bg-elevated:   #161616   /* hover states, inputs, dropdowns */
--color-border:        rgba(255,255,255,0.06)   /* was 0.08 */
--color-text-primary:  #F4F4F5
--color-text-secondary:#71717A
--color-text-muted:    #3F3F46   /* new: column headers, metadata */
--color-accent:        #25D366   /* unchanged */
--color-accent-dim:    rgba(37,211,102,0.12)   /* active sidebar, hover accents */
--color-danger:        #EF4444
--color-warning:       #F59E0B
```

Font scale stays on Satoshi. No new font families. Explicit usage conventions:
- `text-xs text-muted uppercase tracking-wide` → table column headers, section labels
- `text-sm text-secondary` → body / descriptions
- `text-sm text-primary` → row content, labels
- `text-2xl font-semibold` → KPI values
- `text-lg font-medium` → card titles

---

## 3. OwnerShell — Sidebar

**File:** `src/components/dashboard/OwnerShell.tsx`

### Layout changes
- Sidebar background: `bg-bg-secondary border-r border-border`
- Width stays `lg:w-72` on desktop; mobile becomes a top bar with a hamburger toggling a full-height drawer (replaces current horizontal scroll)

### Logo area
- Remove the tagline ("Operación y automatización desde un solo panel.")
- Logo: `text-base font-semibold text-primary` + small green dot accent (already exists in Navbar, reuse the pattern)

### Navigation items
- Add Lucide icons (package: `lucide-react`, already install-capable via npm) to each nav link
- Icon map:
  - Resumen → `LayoutDashboard`
  - Productos → `Package`
  - Inventario → `Boxes`
  - Ventas → `ShoppingCart`
  - Clientes → `Users`
  - Finanzas → `Wallet`
  - Reportes → `BarChart2`
  - Bitácora → `Activity`
  - Automatización → `Bot`
  - Settings → `Settings`
  - Modo caja → `Scan`

### Navigation group separators
- Group 1 (ERP core): Resumen, Productos, Inventario, Ventas, Clientes, Finanzas
- Group 2 (Tools): Reportes, Bitácora, Automatización, Settings
- Separator: `<div className="h-px bg-border mx-4 my-2" />`

### Active state
- Remove `rounded-2xl` full-background approach
- New: `border-l-2 border-accent bg-accent-dim text-primary pl-[calc(1rem-2px)]` on the active link
- Inactive: `text-secondary hover:bg-elevated hover:text-primary pl-4`
- All links: `flex items-center gap-3 py-2.5 pr-4 text-sm rounded-r-lg transition-colors`

### Sidebar footer
- Pinned to bottom: user initials avatar (circle, `bg-elevated border border-border`, initials from stored session) + email truncated + logout button
- Use `mt-auto` flex layout to push footer down

### Mobile
- On mobile (`lg:hidden`): fixed bottom bar showing icon-only nav for the 5 most-used links (Resumen, Productos, Ventas, Clientes, Finanzas) + hamburger for full drawer

---

## 4. Shared UI Components

### 4.1 Card (`src/components/ui/Card.tsx`)

Replace glass morphism with solid elevated surface:

```
bg-bg-secondary border border-border rounded-xl p-6
```

- `rounded-3xl` → `rounded-xl`
- `p-8` → `p-6`
- `bg-white/5 backdrop-blur-sm` → `bg-bg-secondary`

Add variants:
- **`Card` (default):** as above
- **`CardHeader` sub-component:** `flex items-center justify-between gap-4 mb-5` — title left, action button right. Use as `<Card><CardHeader title="..." action={<Button>} /></Card>`
- **`StatCard` component** (new, separate file `src/components/ui/StatCard.tsx`): optimized for KPI display — label top `text-xs text-muted uppercase`, value `text-2xl font-semibold`, optional delta badge below

### 4.2 Button (`src/components/ui/Button.tsx`)

- `rounded-2xl` → `rounded-lg` across all variants
- Primary: keep accent + glow, reduce `px-8 py-4` → `px-5 py-2.5` default (was too large for dashboard context); keep large size via `size="lg"` prop
- Secondary: `bg-bg-elevated border border-border text-primary hover:border-white/12`
- Ghost: unchanged
- Add `size` prop: `"sm"` | `"md"` (default) | `"lg"`

### 4.3 Input (new — `src/components/ui/Input.tsx`)

Currently all inputs are styled inline per-view. Extract to shared component:

```
bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-primary
placeholder:text-muted
focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40
transition-colors
```

### 4.4 Badge (new — `src/components/ui/Badge.tsx`)

Small pill for status labels:

```
inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
```

Variants:
- `success` → `bg-accent/10 text-accent`
- `warning` → `bg-warning/10 text-warning`
- `danger` → `bg-danger/10 text-danger`
- `neutral` → `bg-elevated text-secondary`

### 4.5 Table (new — `src/components/ui/Table.tsx`)

Shared table wrapper with consistent styling:

- Header: `text-xs text-muted uppercase tracking-wide` cells, `bg-bg-secondary` sticky
- Rows: `border-b border-border hover:bg-elevated transition-colors text-sm`
- No vertical borders between columns
- Built-in empty state slot: `<Table.Empty>` renders centered message
- Built-in loading state: skeleton rows via `<Table.Loading rows={5} />`

---

## 5. ERP Views

All views share the same page header pattern:
```jsx
<div className="mb-6">
  <h1 className="text-xl font-semibold">{title}</h1>
  <p className="text-sm text-secondary mt-0.5">{subtitle}</p>
</div>
```

### 5.1 ErpOverviewView

- 4 KPI cards → use `StatCard` grid (`grid-cols-2 xl:grid-cols-4`)
- Low-stock section → replace inline divs with `Table` component (columns: Producto, Categoría, Stock, Umbral, Acción)
- "Estado de despliegue" card → replace with a proper `OnboardingChecklist` card using check/circle icons
- Remove dev-facing copy ("Primer corte del ERP sobre backend real")

### 5.2 ErpProductsView

- Convert product list to `Table` (columns: Nombre, Categoría, Precio, Stock, Acciones)
- Add search input at the top using new `Input` component
- Row actions: "Editar" link styled as `Button ghost size="sm"`, "Ver" as text link
- Pagination via existing `Pagination` component, no changes needed

### 5.3 ErpInventoryView

- Convert inventory list to `Table` (columns: Producto, Variante, Cantidad, Umbral, Estado)
- Estado column uses `Badge` (success if quantity > threshold, warning if ≤ threshold, danger if 0)
- "Ajustar inventario" modal: replace inline styles with `Input` component + proper label pattern
- Move the modal trigger button to a `CardHeader` action

### 5.4 ErpInventoryMovementsView

- Table (columns: Fecha, Producto, Tipo, Cantidad, Nota)
- Tipo column uses `Badge` (entrada/salida/ajuste with semantic colors)

### 5.5 ErpSalesView

- Table (columns: Fecha, Cliente, Total, Estado, Acciones)
- Estado `Badge`: pagado=success, pendiente=warning, cancelado=danger

### 5.6 ErpSaleDetailView

- Two-column layout: left=line items table, right=summary card with totals
- Use `StatCard` pattern for total amount

### 5.7 ErpClientsView

- Table (columns: Nombre, Email/Tel, Ventas, Última compra, Acciones)
- Search input at top

### 5.8 ErpClientDetailView

- Header card: name, contact info, total spent (`StatCard` style)
- Below: purchase history table

### 5.9 ErpFinanceView

- Balance cards at top using `StatCard`
- Transactions table below
- Cash account selector as tabs or segmented control

### 5.10 ErpReportsView

- Period selector (buttons for: Hoy, 7d, 30d, Custom)
- KPI row using `StatCard`
- Charts if data available (keep existing chart library if any, otherwise placeholder)

### 5.11 ErpActivityView (Bitácora)

- Timeline list: icon + timestamp + description, no table needed
- Grouped by day with date separators

### 5.12 Settings / BusinessView / AdminPhonesView / AutomationViews

- Use `Card` + `Input` + `Button` components consistently
- Form sections with `<fieldset>` + legend pattern
- No structural changes to logic

---

## 6. Implementation Order

1. Install `lucide-react` dependency
2. Update design tokens in `globals.css`
3. Update `Card` component
4. Create `StatCard`, `Input`, `Badge`, `Table` components
5. Update `Button` component
6. Redesign `OwnerShell` (sidebar + mobile nav)
7. Update ERP views in order: Overview → Products → Inventory → Sales → Clients → Finance → Reports → Activity → remaining views
8. QA pass: check all views for inline styles that should use new components

---

## 7. Dependencies

- `lucide-react` — add via npm (MIT license, tree-shakable, used by Linear/Vercel/etc.)
- No other new dependencies. All animation stays on `motion/react`. No new UI library.

---

## 8. What Does NOT Change

- All API calls, data fetching, error handling, business logic
- Route structure, auth flow, session management
- Feature flags system
- Test files (unit + e2e)
- Landing page, Navbar, Footer, connect flow, CashierShell
