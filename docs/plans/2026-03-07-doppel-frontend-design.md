# Doppel Frontend Design

## Stack
- Next.js 15 (App Router, Turbopack)
- Tailwind CSS 4
- Motion (ex Framer Motion)
- Satoshi font (self-hosted via next/font/local)
- Deploy: Vercel

## Pages
1. `/` — Landing (Hero, HowItWorks, Features, Trust, FinalCTA)
2. `/connect` — Embedded Signup (Meta SDK lazy loaded)
3. `/connect/success` — Confirmation with animated check
4. `/privacy` — Privacy policy (required by Meta)
5. `/terms` — Terms of service

## Design System
- Dark mode base (#000000)
- Accent: #25D366 (WhatsApp green)
- Typography: Satoshi (Bold headlines, Regular body)
- Glassmorphism cards, generous border-radius (24px)
- Apple-inspired spacing (120-160px sections)

## Architecture
- Server Components by default
- Client Components only for: Navbar (scroll), Hero (animations), HowItWorks, Features (stagger), FinalCTA (shimmer), EmbeddedSignup (SDK)
- Meta SDK loaded via next/script strategy="lazyOnload" only on /connect
- Font self-hosted for zero external requests

## Key Animations
- Navbar: transparent → glass on scroll
- Hero headline: word-by-word stagger reveal
- Phone mockup: infinite float (translateY)
- Feature cards: stagger reveal on scroll
- CTA button: shimmer/shine on hover
- Success: CSS check animation + confetti
