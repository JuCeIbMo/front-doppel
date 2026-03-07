"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Features", href: "#features" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Scroll detection ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // check initial position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* ── Smooth scroll for anchor links ── */
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  const renderLink = (link: { label: string; href: string }, className: string) => {
    const isAnchor = link.href.startsWith("#");
    return (
      <a
        key={link.label}
        href={link.href}
        onClick={isAnchor ? (e) => handleAnchorClick(e, link.href.slice(1)) : () => setMobileOpen(false)}
        className={className}
      >
        {link.label}
      </a>
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-black/60 border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          {/* ── Logo ── */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-text-primary">Doppel</span>
            <span className="inline-block w-2 h-2 rounded-full bg-accent" />
          </a>

          {/* ── Desktop links (hidden below md) ── */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              renderLink(
                link,
                "text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
              )
            )}
          </div>

          {/* ── Desktop CTA (hidden below md) ── */}
          <div className="hidden md:block">
            <Button variant="primary" href="/connect" className="!px-6 !py-2.5 !text-sm !rounded-xl">
              Conectar WhatsApp
            </Button>
          </div>

          {/* ── Mobile hamburger (visible below md) ── */}
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative flex md:hidden flex-col items-center justify-center w-10 h-10 gap-[5px] cursor-pointer"
          >
            <span
              className={`block h-[2px] w-6 rounded-full bg-text-primary transition-all duration-300 ${
                mobileOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-6 rounded-full bg-text-primary transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-6 rounded-full bg-text-primary transition-all duration-300 ${
                mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile fullscreen overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-bg-primary flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
              >
                {renderLink(
                  link,
                  "text-2xl font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: navLinks.length * 0.05, duration: 0.3, ease: "easeOut" }}
            >
              <Button variant="primary" href="/connect" className="!px-8 !py-3 !text-base">
                Conectar WhatsApp
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
