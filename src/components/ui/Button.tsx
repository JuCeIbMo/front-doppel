"use client";
import Link from "next/link";
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: React.ReactNode;
  className?: string;
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

  const cls = `${base} ${variants[variant]} ${shimmer} ${className}`;

  if (href) {
    if (href.startsWith("/")) {
      return <Link href={href} className={cls}>{children}</Link>;
    }
    return <a href={href} className={cls}>{children}</a>;
  }

  return <button className={cls} {...props}>{children}</button>;
}
