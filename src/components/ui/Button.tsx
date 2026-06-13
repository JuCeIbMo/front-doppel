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
