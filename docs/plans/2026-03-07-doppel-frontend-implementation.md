# Doppel Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete Apple-inspired dark-mode frontend for Doppel SaaS — a WhatsApp Business automation platform with landing page, Embedded Signup flow, and legal pages.

**Architecture:** Next.js 15 App Router with server-first components. Client components only where interactivity or animation is needed (Navbar, Hero, Features, EmbeddedSignup). Meta SDK lazy-loaded exclusively on /connect. Satoshi font self-hosted via next/font/local.

**Tech Stack:** Next.js 15, Tailwind CSS 4, Motion (framer-motion successor), TypeScript, Vercel

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/styles/globals.css`
- Create: `src/lib/fonts.ts`
- Create: `public/fonts/Satoshi-Regular.woff2`, `public/fonts/Satoshi-Medium.woff2`, `public/fonts/Satoshi-Bold.woff2`

**Step 1: Create Next.js 15 project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

**Step 2: Install dependencies**

```bash
npm install motion
```

**Step 3: Download Satoshi font files**

Download from https://api.fontshare.com/v2/fonts/download/satoshi and place woff2 files in `public/fonts/`.

**Step 4: Create font configuration**

Create `src/lib/fonts.ts`:
```typescript
import localFont from "next/font/local";

export const satoshi = localFont({
  src: [
    { path: "../../public/fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});
```

**Step 5: Configure globals.css with design tokens**

Replace `src/styles/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-bg-primary: #000000;
  --color-bg-secondary: #0A0A0A;
  --color-bg-glass: rgba(255, 255, 255, 0.05);
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-accent: #25D366;
  --color-accent-glow: rgba(37, 211, 102, 0.15);
  --color-border: rgba(255, 255, 255, 0.08);
  --font-sans: var(--font-satoshi), system-ui, sans-serif;
}
```

**Step 6: Create root layout**

Create `src/app/layout.tsx` with Satoshi font, dark background, metadata for SEO:
```tsx
import type { Metadata } from "next";
import { satoshi } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Doppel — Automatiza tu WhatsApp Business con IA",
  description: "Conecta tu WhatsApp Business en 2 minutos. Sin codigo. Sin complicaciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable}>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 7: Create placeholder home page**

Create `src/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="min-h-screen flex items-center justify-center"><h1 className="text-5xl font-bold">Doppel</h1></main>;
}
```

**Step 8: Create .env.local.example**

```
NEXT_PUBLIC_META_APP_ID=
NEXT_PUBLIC_META_CONFIG_ID=
NEXT_PUBLIC_API_URL=
```

**Step 9: Run dev server and verify**

```bash
npm run dev
```
Expected: Page loads with "Doppel" in Satoshi Bold on black background.

**Step 10: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js 15 project with Satoshi font and design tokens"
```

---

### Task 2: UI Primitives (Button, Card, AnimatedSection)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/AnimatedSection.tsx`

**Step 1: Create Button component**

`src/components/ui/Button.tsx` — Three variants: primary (green with shimmer), secondary (outline), ghost. Primary has CSS shimmer animation on hover.

```tsx
"use client";
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
}

export function Button({ variant = "primary", className = "", children, href, ...props }: ButtonProps) {
  const base = "relative inline-flex items-center justify-center font-medium rounded-2xl px-8 py-4 text-base transition-all duration-300 cursor-pointer overflow-hidden";

  const variants: Record<Variant, string> = {
    primary: "bg-accent text-black hover:brightness-110 shadow-[0_0_30px_rgba(37,211,102,0.3)] hover:shadow-[0_0_50px_rgba(37,211,102,0.5)]",
    secondary: "border border-white/20 text-text-primary hover:bg-white/5",
    ghost: "text-text-secondary hover:text-text-primary",
  };

  const shimmer = variant === "primary"
    ? "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:translate-x-[-200%] hover:after:translate-x-[200%] after:transition-transform after:duration-700"
    : "";

  if (href) {
    return <a href={href} className={`${base} ${variants[variant]} ${shimmer} ${className}`}>{children}</a>;
  }

  return <button className={`${base} ${variants[variant]} ${shimmer} ${className}`} {...props}>{children}</button>;
}
```

**Step 2: Create Card component**

`src/components/ui/Card.tsx` — Glassmorphism card:

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 ${className}`}>
      {children}
    </div>
  );
}
```

**Step 3: Create AnimatedSection component**

`src/components/ui/AnimatedSection.tsx` — Reusable fade-in on scroll wrapper using Motion:

```tsx
"use client";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({ children, className = "", delay = 0 }: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.25, 0.4, 0, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Step 4: Verify components render**

Import and use all three in page.tsx temporarily. Run dev server, verify rendering.

**Step 5: Commit**

```bash
git add src/components/ui/ && git commit -m "feat: add Button, Card, and AnimatedSection UI primitives"
```

---

### Task 3: Navbar

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Modify: `src/app/layout.tsx` — add Navbar to body

**Step 1: Create Navbar**

`src/components/layout/Navbar.tsx` — Client component. Fixed top, transparent → glass on scroll. Logo "Doppel" with green dot. Desktop links + mobile hamburger with fullscreen animated panel.

Key behaviors:
- `useMotionValueEvent` or scroll listener for scroll > 20px detection
- Smooth scroll to section anchors (#como-funciona, #features)
- Mobile menu: fullscreen overlay with stagger animation
- CTA button: "Conectar WhatsApp" → /connect

**Step 2: Add Navbar to root layout**

```tsx
<body>
  <Navbar />
  {children}
</body>
```

**Step 3: Verify both desktop and mobile**

Run dev, check scroll behavior, mobile toggle.

**Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx src/app/layout.tsx && git commit -m "feat: add sticky glass Navbar with mobile menu"
```

---

### Task 4: Footer

**Files:**
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx` — add Footer to body

**Step 1: Create Footer**

`src/components/layout/Footer.tsx` — Server component. Links: Inicio, Privacidad, Terminos, Contacto. Copyright line. Subtle top border.

**Step 2: Add Footer to layout**

**Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx src/app/layout.tsx && git commit -m "feat: add Footer component"
```

---

### Task 5: Landing — Hero Section

**Files:**
- Create: `src/components/landing/Hero.tsx`
- Modify: `src/app/page.tsx` — replace placeholder with Hero

**Step 1: Create Hero component**

`src/components/landing/Hero.tsx` — Client component with:

- **Headline** "Automatiza tu WhatsApp Business con IA" — animated word-by-word with motion stagger (0.08s per word)
- **Subheadline** "Conecta tu numero en 2 minutos. Sin codigo. Sin complicaciones." — fade in after headline
- **CTA primary** "Conectar mi WhatsApp" → /connect (Button primary)
- **CTA secondary** "Ver como funciona" → #como-funciona (Button secondary, smooth scroll)
- **Phone mockup** — CSS-only phone frame with simulated WhatsApp chat bubbles inside. Infinite float animation (translateY 0 → -12px → 0, 6s ease-in-out)
- **Background** — Radial gradient from center: subtle green glow (#25D366 at 5% opacity) fading to black

**Step 2: Wire Hero into page.tsx**

**Step 3: Verify animations work**

**Step 4: Commit**

```bash
git add src/components/landing/Hero.tsx src/app/page.tsx && git commit -m "feat: add Hero section with animated headline and phone mockup"
```

---

### Task 6: Landing — How It Works

**Files:**
- Create: `src/components/landing/HowItWorks.tsx`
- Modify: `src/app/page.tsx` — add section

**Step 1: Create HowItWorks**

`src/components/landing/HowItWorks.tsx` — Client component with `id="como-funciona"`.

3 steps in a horizontal layout (desktop) / vertical stack (mobile):
1. "Conecta tu WhatsApp Business en un clic" — link icon
2. "Configura tu asistente IA con la info de tu negocio" — settings icon
3. "Tu asistente responde 24/7 automaticamente" — bot icon

Each step: number badge (green), title, description. Connected by a subtle dashed line. Stagger reveal using AnimatedSection with incremental delays.

Icons: inline SVG, simple line-style.

**Step 2: Add to page.tsx**

**Step 3: Commit**

```bash
git add src/components/landing/HowItWorks.tsx src/app/page.tsx && git commit -m "feat: add HowItWorks section with 3-step flow"
```

---

### Task 7: Landing — Features Grid

**Files:**
- Create: `src/components/landing/Features.tsx`
- Modify: `src/app/page.tsx` — add section

**Step 1: Create Features**

`src/components/landing/Features.tsx` — Client component with `id="features"`.

Grid 2x3 (desktop) / stack (mobile). 6 glass Cards with stagger reveal:
1. Respuestas automaticas 24/7
2. Gestion de leads inteligente
3. Soporte en espanol e italiano
4. Integracion con tu CRM
5. Transferencia a agente humano
6. Analisis de conversaciones

Each card: green icon (inline SVG), title (font-bold), short description (text-secondary). Use Card component.

**Step 2: Add to page.tsx**

**Step 3: Commit**

```bash
git add src/components/landing/Features.tsx src/app/page.tsx && git commit -m "feat: add Features grid with glass cards"
```

---

### Task 8: Landing — Trust + Final CTA

**Files:**
- Create: `src/components/landing/Trust.tsx`
- Create: `src/components/landing/FinalCTA.tsx`
- Modify: `src/app/page.tsx` — add both sections

**Step 1: Create Trust section**

Server component. "Respaldado por Meta Cloud API" with Meta logo (inline SVG). Three badges: "Verificado por Meta", "Datos seguros", "Sin instalacion" — pill-shaped with subtle border.

**Step 2: Create FinalCTA section**

Client component. "Empieza hoy — gratis" headline. Button primary "Conectar mi WhatsApp" → /connect. Subtle green glow background similar to Hero.

**Step 3: Wire into page.tsx**

Complete the landing page with all sections in order: Hero, HowItWorks, Features, Trust, FinalCTA.

**Step 4: Commit**

```bash
git add src/components/landing/ src/app/page.tsx && git commit -m "feat: add Trust badges and FinalCTA sections"
```

---

### Task 9: Connect Page — Embedded Signup

**Files:**
- Create: `src/app/connect/page.tsx`
- Create: `src/components/connect/EmbeddedSignup.tsx`

**Step 1: Create connect page layout**

`src/app/connect/page.tsx` — Clean centered layout. Only logo at top (no full navbar). Headline: "Conecta tu WhatsApp Business". Visual stepper: 3 steps (Autoriza → Selecciona numero → Listo).

**Step 2: Create EmbeddedSignup component**

`src/components/connect/EmbeddedSignup.tsx` — Client component.

Key implementation:
- Load Meta SDK via `next/script` with `strategy="lazyOnload"`
- `fbAsyncInit` callback to `FB.init()` with `process.env.NEXT_PUBLIC_META_APP_ID`
- `launchEmbeddedSignup()` function calling `FB.login()` with config_id
- On success: POST code to `/api/oauth/callback` (via NEXT_PUBLIC_API_URL), redirect to /connect/success
- States: idle, loading, error — managed with useState
- Error state shows friendly message + retry button

**Step 3: Verify page renders correctly**

**Step 4: Commit**

```bash
git add src/app/connect/ src/components/connect/ && git commit -m "feat: add Embedded Signup page with Meta SDK integration"
```

---

### Task 10: Success Page

**Files:**
- Create: `src/app/connect/success/page.tsx`

**Step 1: Create success page**

`src/app/connect/success/page.tsx` — Client component.

- Animated green check: CSS keyframes (circle draws, then checkmark strokes in)
- Confetti: CSS-only particles (small colored dots with randomized animation)
- Headline: "Tu WhatsApp esta conectado!"
- Phone number display (from searchParams query param)
- Message: "En las proximas horas recibiras un mensaje de bienvenida en tu WhatsApp"
- Button: "Volver al inicio" → /

**Step 2: Commit**

```bash
git add src/app/connect/success/ && git commit -m "feat: add success page with animated check and confetti"
```

---

### Task 11: Privacy Policy Page

**Files:**
- Create: `src/app/privacy/page.tsx`

**Step 1: Create privacy page**

Server component. Full privacy policy text as specified in the brief. Clean typography with proper heading hierarchy. max-w-3xl centered. Replace `[tudominio]` with `doppel.lat` and `[FECHA]` with current date.

**Step 2: Commit**

```bash
git add src/app/privacy/ && git commit -m "feat: add Privacy Policy page (required by Meta)"
```

---

### Task 12: Terms of Service Page

**Files:**
- Create: `src/app/terms/page.tsx`

**Step 1: Create terms page**

Server component. Basic terms covering: service description, user responsibilities, limitation of liability, governing law, contact. Same styling as privacy page.

**Step 2: Commit**

```bash
git add src/app/terms/ && git commit -m "feat: add Terms of Service page"
```

---

### Task 13: Polish & Responsive Pass

**Files:**
- Modify: All components for responsive refinements

**Step 1: Test every page at mobile (375px), tablet (768px), desktop (1440px)**

Verify:
- Navbar hamburger works on mobile
- Hero headline scales down properly
- Features grid collapses to single column
- Phone mockup repositions below text on mobile
- HowItWorks steps stack vertically on mobile
- Connect page stepper works on mobile
- Legal pages are readable on mobile

**Step 2: Fix any responsive issues found**

**Step 3: Run build to ensure no errors**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "fix: responsive polish pass across all pages"
```

---

### Task 14: Final Build Verification

**Step 1: Run production build**

```bash
npm run build
```

**Step 2: Run production server locally**

```bash
npm run start
```

**Step 3: Verify all 5 pages load correctly**

- `/` — all sections visible, animations work
- `/connect` — stepper and button render
- `/connect/success` — check animation plays
- `/privacy` — full text renders
- `/terms` — full text renders

**Step 4: Final commit if any fixes**

```bash
git add -A && git commit -m "chore: final build verification and fixes"
```
