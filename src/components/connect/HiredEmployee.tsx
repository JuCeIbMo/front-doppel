"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { BusinessSwitch } from "@/lib/business";
import { LN } from "@/components/landing/figures";

/**
 * How far the hiring has gone, and so how dressed the employee is:
 * 0 just met (plain clothes) · 1 has the cap · 2 knows the job (apron and its tool) ·
 * 3 has the WhatsApp (headset and phone) · 4 at work, waving.
 */
export type HireStage = 0 | 1 | 2 | 3 | 4;

/** The landing's employee, putting on the uniform one piece per onboarding step. */
export function HiredEmployee({ stage, kind }: { stage: HireStage; kind?: BusinessSwitch | null }) {
  return (
    <svg viewBox="-80 -200 160 206" className="h-full w-auto" aria-hidden="true">
      <defs>
        <pattern id="hire-aguayo" width="12" height="24" patternUnits="userSpaceOnUse">
          <rect width="12" height="5" fill="#C8102E" />
          <rect width="12" height="3" y="5" fill="#F2A900" />
          <rect width="12" height="5" y="8" fill="#0E7C4A" />
          <rect width="12" height="3" y="13" fill="#E5437A" />
          <rect width="12" height="5" y="16" fill="#2B2D84" />
          <rect width="12" height="3" y="21" fill="#FBF7F2" />
        </pattern>
      </defs>
      <ellipse cx="0" cy="0" rx="60" ry="7" fill="#D99600" />

      {stage >= 4 && (
        <Pop>
          <path d="M-60 -170 L-58 -162 L-50 -160 L-58 -158 L-60 -150 L-62 -158 L-70 -160 L-62 -162Z" fill="#FBF7F2" {...LN} strokeWidth="1.5" />
          <path d="M58 -120 L60 -112 L68 -110 L60 -108 L58 -100 L56 -108 L48 -110 L56 -112Z" fill="#FBF7F2" {...LN} strokeWidth="1.5" />
        </Pop>
      )}

      <path d="M-24 -64 H24 L21 -2 H4 L0 -40 L-4 -2 H-21Z" fill="#231A16" {...LN} />
      <path d="M-32 -60 Q-33 -118 0 -121 Q33 -118 32 -60Z" fill={stage >= 1 ? "#0E7C4A" : "#FBF7F2"} {...LN} />

      {stage >= 2 && (
        <Pop>
          <path d="M-18 -108 H18 L21 -58 H-21Z" fill="url(#hire-aguayo)" {...LN} strokeWidth="2.5" />
        </Pop>
      )}

      <circle cx="0" cy="-143" r="23" fill="#8D5A3B" {...LN} />
      {stage >= 1 ? (
        <Pop>
          <path d="M-24 -148 Q-24 -176 0 -176 Q24 -176 24 -148Z" fill="#F2A900" {...LN} />
          <path d="M6 -150 H36 Q36 -143 28 -143 H6Z" fill="#F2A900" {...LN} strokeWidth="2.5" />
        </Pop>
      ) : (
        <path d="M-22 -150 Q-18 -172 4 -170 Q22 -168 22 -150 Q10 -160 -22 -150Z" fill="#231A16" {...LN} />
      )}
      <ellipse className="blink" cx="-8" cy="-139" rx="2.8" ry="3.6" fill="#231A16" />
      <ellipse className="blink" cx="8" cy="-139" rx="2.8" ry="3.6" fill="#231A16" />
      <path d="M-8 -129 q8 8 16 0" {...LN} fill="none" strokeWidth="2.5" />

      {stage >= 2 && kind === "selling" && (
        <Pop>
          <path d="M34 -86 q0 -12 10 -12 q10 0 10 12" {...LN} fill="none" strokeWidth="2.5" />
          <rect x="28" y="-88" width="32" height="30" rx="4" fill="#C8102E" {...LN} strokeWidth="2.5" />
        </Pop>
      )}
      {stage >= 2 && kind === "booking" && (
        <Pop>
          <rect x="28" y="-100" width="34" height="38" rx="4" fill="#FBF7F2" {...LN} strokeWidth="2.5" />
          <rect x="28" y="-100" width="34" height="10" fill="#2B2D84" {...LN} strokeWidth="2.5" />
          <path d="M35 -80 h6 M47 -80 h6 M35 -71 h6" {...LN} strokeWidth="3" />
        </Pop>
      )}

      {stage >= 3 && (
        <Pop>
          <path d="M-23 -142 q-4 16 12 20" {...LN} fill="none" strokeWidth="2.5" />
          <circle cx="-10" cy="-122" r="3.5" fill="#E5437A" {...LN} strokeWidth="2" />
          <g className={stage === 3 ? "tap" : undefined}>
            <rect x="-58" y="-106" width="22" height="34" rx="4" fill="#2B2D84" {...LN} strokeWidth="2.5" />
          </g>
        </Pop>
      )}
    </svg>
  );
}

function Pop({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.g
      initial={reduce ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      {children}
    </motion.g>
  );
}
